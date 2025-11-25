const openAIService = require('../ai/OpenAIService');
const categoryMatcher = require('./CategoryMatcher');
const locationResolver = require('./LocationResolver');
const attributeExtractor = require('./AttributeExtractor');
const arabicNormalizer = require('../../utils/arabicNormalizer');
const logger = require('../../utils/logger');

class QueryParser {
  constructor() {
    this.ai = openAIService;
    this.categoryMatcher = categoryMatcher;
    this.locationResolver = locationResolver;
    this.attributeExtractor = attributeExtractor;
  }

  /**
   * Parse natural language query into structured search parameters
   * @param {string} query - Natural language query
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Promise<Object>} Parsed query structure
   */
  async parse(query, language = 'ar') {
    const startTime = Date.now();

    try {
      logger.info('Parsing query', { query, language });

      // Step 1: Normalize Arabic text
      const normalizedQuery = arabicNormalizer.normalize(query);

      // Step 2: Detect language if not provided
      if (!language) {
        language = arabicNormalizer.detectLanguage(normalizedQuery);
      }

      // Step 3: Use OpenAI to extract structured intent
      const aiParsed = await this.ai.parseQuery(normalizedQuery, language);

      logger.debug('AI parsed result', { aiParsed });

      // Step 4: Match category using embeddings + keywords
      const categoryPromise = this.categoryMatcher.match(
        aiParsed.categoryHint,
        language
      );

      // Step 5: Resolve location
      const locationPromise = this.locationResolver.resolve(
        aiParsed.locationHint,
        language
      );

      // Run category and location matching in parallel
      const [category, location] = await Promise.all([
        categoryPromise,
        locationPromise
      ]);

      // Step 6: Extract attributes based on category
      let attributes = {};
      if (category?.id) {
        attributes = await this.attributeExtractor.extract(
          normalizedQuery,
          category.id,
          language
        );
      }

      // Step 7: Determine transaction type
      const transactionType = this.resolveTransactionType(
        aiParsed.transactionType,
        normalizedQuery,
        language
      );

      // Step 8: Extract keywords
      const keywords = this.extractKeywords(normalizedQuery, language);

      // Step 9: Calculate confidence score
      const confidence = this.calculateConfidence({
        category,
        location,
        transactionType,
        attributes,
        keywords
      });

      const parsed = {
        original: query,
        normalized: normalizedQuery,
        language,
        category: category ? {
          id: category.id,
          slug: category.slug,
          name: language === 'ar' ? category.name_ar : category.name_en,
          confidence: category.confidence
        } : null,
        location: location ? {
          id: location.id,
          type: location.type,
          name: language === 'ar' ? location.name_ar : location.name_en,
          cityId: location.type === 'neighborhood' ? location.city_id : location.id,
          confidence: location.confidence
        } : null,
        transactionType,
        attributes,
        keywords,
        confidence,
        priceIndicator: aiParsed.priceIndicator,
        conditionIndicator: aiParsed.conditionIndicator
      };

      const duration = Date.now() - startTime;
      logger.info('Query parsed successfully', {
        query: query.substring(0, 50),
        duration,
        confidence: parsed.confidence,
        hasCategory: !!parsed.category,
        hasLocation: !!parsed.location
      });

      return parsed;
    } catch (error) {
      logger.error('Query parsing error:', error);
      throw error;
    }
  }

  /**
   * Resolve transaction type from AI hint and query
   * @param {string} aiHint - Transaction type hint from AI
   * @param {string} query - Original query
   * @param {string} language - Language
   * @returns {Object|null} Transaction type
   */
  resolveTransactionType(aiHint, query, language) {
    if (aiHint) {
      return {
        slug: aiHint,
        confidence: 0.9
      };
    }

    // Pattern matching for transaction types
    if (language === 'ar') {
      if (/للإيجار|للايجار|أجار|ايجار/.test(query)) {
        return { slug: 'rent', confidence: 0.85 };
      }
      if (/للبيع|بيع/.test(query)) {
        return { slug: 'sale', confidence: 0.85 };
      }
      if (/للتبادل|تبادل|مقايضة/.test(query)) {
        return { slug: 'exchange', confidence: 0.85 };
      }
      if (/مطلوب/.test(query)) {
        return { slug: 'wanted', confidence: 0.85 };
      }
      if (/يومي/.test(query)) {
        return { slug: 'daily_rent', confidence: 0.85 };
      }
    } else {
      if (/\brent\b/i.test(query)) {
        return { slug: 'rent', confidence: 0.85 };
      }
      if (/\bsale\b|\bsell\b/i.test(query)) {
        return { slug: 'sale', confidence: 0.85 };
      }
      if (/\bexchange\b/i.test(query)) {
        return { slug: 'exchange', confidence: 0.85 };
      }
    }

    // Default to sale
    return { slug: 'sale', confidence: 0.5 };
  }

  /**
   * Extract keywords from query
   * @param {string} query - Normalized query
   * @param {string} language - Language
   * @returns {Array<string>} Keywords
   */
  extractKeywords(query, language) {
    return arabicNormalizer.extractKeywords(query, 2);
  }

  /**
   * Calculate overall confidence score
   * @param {Object} parsed - Parsed components
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(parsed) {
    let score = 0;
    let components = 0;

    if (parsed.category) {
      score += parsed.category.confidence || 0.5;
      components++;
    }

    if (parsed.location) {
      score += parsed.location.confidence || 0.5;
      components++;
    }

    if (parsed.transactionType) {
      score += parsed.transactionType.confidence || 0.5;
      components++;
    }

    if (Object.keys(parsed.attributes || {}).length > 0) {
      score += 0.7;
      components++;
    }

    if (parsed.keywords && parsed.keywords.length > 0) {
      score += 0.6;
      components++;
    }

    return components > 0 ? score / components : 0.5;
  }

  /**
   * Validate parsed query
   * @param {Object} parsed - Parsed query
   * @returns {boolean} Is valid
   */
  validate(parsed) {
    // At minimum, we need either a category or keywords
    return !!(parsed.category || (parsed.keywords && parsed.keywords.length > 0));
  }

  /**
   * Format parsed query for search service
   * @param {Object} parsed - Parsed query
   * @returns {Object} Search parameters
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

    if (parsed.transactionType?.slug) {
      params.transactionTypeSlug = parsed.transactionType.slug;
    }

    if (parsed.attributes) {
      params.attributes = parsed.attributes;
    }

    if (parsed.keywords) {
      params.keywords = parsed.keywords;
    }

    return params;
  }
}

// Singleton instance
module.exports = new QueryParser();
