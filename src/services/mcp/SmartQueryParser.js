const databaseMatcher = require('./DatabaseMatcher');
const cacheService = require('../cache/CacheService');
const openAIService = require('../ai/OpenAIService');
const ArabicNormalizer = require('../../utils/arabicNormalizer');
const logger = require('../../utils/logger');
const crypto = require('crypto');

/**
 * SmartQueryParser - Tiered query parsing system
 * Tier 0: Exact cache (Redis)
 * Tier 1: Database matching (free)
 * Tier 2: Semantic cache (near-free)
 * Tier 3: Minimal AI (cheap)
 * Tier 4: Full AI (rare)
 */
class SmartQueryParser {
  constructor() {
    this.dbMatcher = databaseMatcher;
    this.stats = {
      tier0: 0,
      tier1: 0,
      tier2: 0,
      tier3: 0,
      tier4: 0,
      total: 0
    };
    this.confidenceThreshold = 0.80;
  }

  /**
   * Initialize - call on server start
   */
  async initialize() {
    await this.dbMatcher.initializeHotCache();
    logger.info('SmartQueryParser initialized');
  }

  /**
   * Main parse method - routes through tiers
   */
  async parse(query, language = 'ar') {
    const startTime = Date.now();
    this.stats.total++;

    const normalized = ArabicNormalizer.normalize(query);
    const queryHash = this.hashQuery(normalized);

    // TIER 0: Exact cache check
    const cacheKey = `parsed:${queryHash}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      this.stats.tier0++;
      logger.debug('Tier 0: Cache hit', { query: query.substring(0, 30) });
      return { ...cached, tier: 0, fromCache: true, processingTime: Date.now() - startTime };
    }

    // TIER 1: Database pattern matching
    const tier1Result = await this.tier1DatabaseMatch(normalized, language);
    if (tier1Result.confidence >= this.confidenceThreshold) {
      this.stats.tier1++;
      const result = this.buildResult(tier1Result, query, normalized, language, 1, startTime);
      await this.cacheResult(cacheKey, result);
      return result;
    }

    // TIER 2: Semantic cache lookup
    const tier2Result = await this.tier2SemanticCache(normalized, language);
    if (tier2Result) {
      this.stats.tier2++;
      const result = { ...tier2Result, tier: 2, processingTime: Date.now() - startTime };
      await this.cacheResult(cacheKey, result);
      return result;
    }

    // TIER 3: Minimal AI
    const tier3Result = await this.tier3MinimalAI(normalized, language, tier1Result);
    if (tier3Result.confidence >= 0.7) {
      this.stats.tier3++;
      const result = this.buildResult(tier3Result, query, normalized, language, 3, startTime);
      await this.cacheResult(cacheKey, result);
      await this.storeInSemanticCache(normalized, result);
      return result;
    }

    // TIER 4: Full AI (rare)
    this.stats.tier4++;
    const tier4Result = await this.tier4FullAI(normalized, language, tier1Result);
    const result = this.buildResult(tier4Result, query, normalized, language, 4, startTime);
    await this.cacheResult(cacheKey, result);
    await this.storeInSemanticCache(normalized, result);
    return result;
  }

  /**
   * TIER 1: Pure database matching - NO AI COST
   */
  async tier1DatabaseMatch(normalized, language) {
    const tokens = this.tokenize(normalized, language);

    // Parallel database lookups
    const [category, location] = await Promise.all([
      this.dbMatcher.matchCategory(tokens, language),
      this.dbMatcher.matchLocation(tokens, language)
    ]);

    const transactionType = this.dbMatcher.matchTransactionType(normalized, language);
    const attributes = this.dbMatcher.extractNumericAttributes(normalized);

    // If category is not leaf, try to find better match
    let finalCategory = category;
    if (category && category.level < 2) {
      const leafCategory = await this.dbMatcher.findLeafCategory(
        category.id,
        tokens,
        language
      );
      if (leafCategory) {
        finalCategory = { ...leafCategory, confidence: category.confidence * 0.95 };
      }
    }

    // Calculate overall confidence
    const confidence = this.calculateTier1Confidence({
      category: finalCategory,
      location,
      transactionType,
      attributes
    });

    return {
      category: finalCategory,
      location,
      transactionType,
      attributes,
      keywords: tokens,
      confidence,
      method: 'database_match'
    };
  }

  /**
   * TIER 2: Semantic cache lookup
   */
  async tier2SemanticCache(normalized, language) {
    try {
      // Check if we have pgvector available
      const embedding = await openAIService.createEmbedding(normalized);
      const embeddingStr = `[${embedding.join(',')}]`;

      const result = await this.dbMatcher.db.query(`
        SELECT
          query_text,
          parsed_result,
          1 - (query_embedding <=> $1::vector) as similarity
        FROM query_semantic_cache
        WHERE 1 - (query_embedding <=> $1::vector) > 0.92
        ORDER BY query_embedding <=> $1::vector
        LIMIT 1
      `, [embeddingStr]);

      if (result.rows.length > 0) {
        logger.info('Tier 2: Semantic cache hit', {
          similarity: result.rows[0].similarity,
          cachedQuery: result.rows[0].query_text.substring(0, 30)
        });
        return JSON.parse(result.rows[0].parsed_result);
      }

      return null;
    } catch (error) {
      logger.debug('Semantic cache lookup failed:', error.message);
      return null;
    }
  }

  /**
   * TIER 3: Minimal AI - ULTRA SHORT PROMPT
   */
  async tier3MinimalAI(normalized, language, tier1Result) {
    try {
      // MINIMAL PROMPT - Only ~40 tokens!
      const systemPrompt = `Extract from Syrian marketplace query:
{"category":"item type","location":"city","transaction":"sale/rent/wanted"}
Dialect: بدي=want, وين=where, شو=what`;

      const response = await openAIService.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: normalized }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 100
      });

      const aiHints = JSON.parse(response.choices[0].message.content);

      logger.info('Tier 3: AI called', {
        tokens: response.usage?.total_tokens,
        hints: aiHints
      });

      // Use AI hints to search database
      const [category, location] = await Promise.all([
        aiHints.category ?
          this.dbMatcher.matchCategory([aiHints.category], language) :
          tier1Result.category,
        aiHints.location ?
          this.dbMatcher.matchLocation([aiHints.location], language) :
          tier1Result.location
      ]);

      return {
        category: category || tier1Result.category,
        location: location || tier1Result.location,
        transactionType: tier1Result.transactionType,
        attributes: tier1Result.attributes,
        keywords: tier1Result.keywords,
        confidence: 0.85,
        method: 'minimal_ai',
        aiModel: 'gpt-4o-mini',
        aiTokens: response.usage?.total_tokens
      };
    } catch (error) {
      logger.error('Tier 3 AI error:', error);
      return { ...tier1Result, confidence: tier1Result.confidence * 0.8 };
    }
  }

  /**
   * TIER 4: Full AI - Still minimal prompt
   */
  async tier4FullAI(normalized, language, tier1Result) {
    try {
      const systemPrompt = `Syrian marketplace (Qasioun) query parser.
Extract JSON: {"category":"specific item","location":"city name","transaction":"sale/rent/wanted","attributes":{"year":2020,"rooms":3}}
بدي=want, وين=where, رخيص=cheap, جديد=new, مستعمل=used`;

      const response = await openAIService.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse: "${normalized}"` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 200
      });

      const aiResult = JSON.parse(response.choices[0].message.content);

      logger.info('Tier 4: AI called', {
        tokens: response.usage?.total_tokens,
        result: aiResult
      });

      // Database lookup for all hints
      const [category, location] = await Promise.all([
        aiResult.category ?
          this.dbMatcher.matchCategory([aiResult.category], language) :
          null,
        aiResult.location ?
          this.dbMatcher.matchLocation([aiResult.location], language) :
          null
      ]);

      return {
        category: category || tier1Result.category,
        location: location || tier1Result.location,
        transactionType: tier1Result.transactionType,
        attributes: { ...tier1Result.attributes, ...(aiResult.attributes || {}) },
        keywords: tier1Result.keywords,
        confidence: 0.9,
        method: 'full_ai',
        aiModel: 'gpt-4o',
        aiTokens: response.usage?.total_tokens
      };
    } catch (error) {
      logger.error('Tier 4 AI error:', error);
      return { ...tier1Result, method: 'fallback', confidence: 0.6 };
    }
  }

  /**
   * Calculate confidence for Tier 1 results
   */
  calculateTier1Confidence(result) {
    let score = 0;
    let weights = 0;

    if (result.category) {
      score += (result.category.confidence || 0.8) * 0.4;
      weights += 0.4;
    }

    if (result.location) {
      score += (result.location.confidence || 0.8) * 0.3;
      weights += 0.3;
    }

    if (result.transactionType && result.transactionType.confidence > 0.7) {
      score += 0.15;
      weights += 0.15;
    }

    if (Object.keys(result.attributes).length > 0) {
      score += 0.15;
      weights += 0.15;
    }

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Tokenize query
   */
  tokenize(text, language) {
    const stopwords = language === 'ar'
      ? ['في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'و', 'أو', 'ال', 'لل', 'بال']
      : ['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'with', 'and', 'or'];

    return text
      .split(/\s+/)
      .map(t => t.trim().replace(/^ال/, '')) // Remove Arabic "ال"
      .filter(t => t.length > 1 && !stopwords.includes(t));
  }

  /**
   * Build final result object
   */
  buildResult(tierResult, originalQuery, normalized, language, tier, startTime) {
    return {
      original: originalQuery,
      normalized,
      language,
      tier,
      category: tierResult.category ? {
        id: tierResult.category.id,
        slug: tierResult.category.slug,
        name: language === 'ar' ? tierResult.category.name_ar : tierResult.category.name_en,
        level: tierResult.category.level,
        confidence: tierResult.category.confidence
      } : null,
      location: tierResult.location ? {
        id: tierResult.location.id,
        type: tierResult.location.type,
        name: language === 'ar' ? tierResult.location.name_ar : tierResult.location.name_en,
        confidence: tierResult.location.confidence
      } : null,
      transactionType: tierResult.transactionType?.slug || 'sale',
      attributes: tierResult.attributes || {},
      keywords: tierResult.keywords || [],
      confidence: tierResult.confidence,
      method: tierResult.method,
      aiModel: tierResult.aiModel,
      aiTokens: tierResult.aiTokens,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Cache result
   */
  async cacheResult(key, result) {
    await cacheService.set(key, result, 3600);
  }

  /**
   * Store in semantic cache for future similar queries
   */
  async storeInSemanticCache(query, result) {
    try {
      const embedding = await openAIService.createEmbedding(query);
      const embeddingStr = `[${embedding.join(',')}]`;

      await this.dbMatcher.db.query(`
        INSERT INTO query_semantic_cache (query_text, query_embedding, parsed_result)
        VALUES ($1, $2::vector, $3)
        ON CONFLICT (query_text) DO UPDATE SET
          parsed_result = $3,
          hit_count = query_semantic_cache.hit_count + 1,
          updated_at = NOW()
      `, [query, embeddingStr, JSON.stringify(result)]);
    } catch (error) {
      logger.debug('Failed to store in semantic cache:', error.message);
    }
  }

  /**
   * Hash query for cache key
   */
  hashQuery(query) {
    return crypto.createHash('md5').update(query).digest('hex');
  }

  /**
   * Validate parsed query
   */
  validate(parsed) {
    // At minimum, we need either a category or keywords
    return !!(parsed.category || (parsed.keywords && parsed.keywords.length > 0));
  }

  /**
   * Format parsed query for search service
   */
  toSearchParams(parsed) {
    const params = {
      query: parsed.original,
      language: parsed.language
    };

    if (parsed.category?.id) {
      params.categoryId = parsed.category.id;
    }

    if (parsed.location) {
      if (parsed.location.type === 'city') {
        params.cityId = parsed.location.id;
      } else if (parsed.location.type === 'neighborhood') {
        params.cityId = parsed.location.cityId;
        params.neighborhoodId = parsed.location.id;
      }
    }

    if (parsed.transactionType) {
      params.transactionTypeSlug = parsed.transactionType;
    }

    if (parsed.attributes) {
      params.attributes = parsed.attributes;
    }

    if (parsed.keywords) {
      params.keywords = parsed.keywords;
    }

    return params;
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.stats.total || 1;
    return {
      ...this.stats,
      percentages: {
        tier0: `${((this.stats.tier0 / total) * 100).toFixed(1)}%`,
        tier1: `${((this.stats.tier1 / total) * 100).toFixed(1)}%`,
        tier2: `${((this.stats.tier2 / total) * 100).toFixed(1)}%`,
        tier3: `${((this.stats.tier3 / total) * 100).toFixed(1)}%`,
        tier4: `${((this.stats.tier4 / total) * 100).toFixed(1)}%`
      },
      costSavings: this.calculateCostSavings()
    };
  }

  /**
   * Calculate cost savings
   */
  calculateCostSavings() {
    const oldCost = this.stats.total * 0.008; // Old: Always full AI
    const newCost = (this.stats.tier2 * 0.0001) + (this.stats.tier3 * 0.0005) + (this.stats.tier4 * 0.003);

    return {
      old: `$${oldCost.toFixed(4)}`,
      new: `$${newCost.toFixed(4)}`,
      saved: `$${(oldCost - newCost).toFixed(4)}`,
      percent: oldCost > 0 ? `${(((oldCost - newCost) / oldCost) * 100).toFixed(1)}%` : '0%'
    };
  }
}

// Singleton instance
module.exports = new SmartQueryParser();
