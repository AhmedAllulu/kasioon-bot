const database = require('../../config/database');
const ArabicNormalizer = require('../../utils/arabicNormalizer');
const logger = require('../../utils/logger');

/**
 * DatabaseMatcher - All matching through database queries
 * NO static files, NO hardcoded lists
 * Uses: Full-text search, pg_trgm, array contains
 */
class DatabaseMatcher {
  constructor() {
    this.db = database;
    // In-memory cache for hot data (refreshed every 5 minutes)
    this.hotCache = {
      topCategories: null,
      topCities: null,
      transactionTypes: null,
      lastRefresh: null
    };
    this.HOT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize hot cache on server start
   * Load frequently accessed data into memory
   */
  async initializeHotCache() {
    try {
      logger.info('🔥 Initializing DatabaseMatcher hot cache...');

      // Load top 500 most-used categories with their keywords
      logger.debug('📦 Loading categories into cache...');
      this.hotCache.topCategories = await this.db.query(`
        SELECT
          c.id, c.slug, c.name_ar, c.name_en, c.level, c.parent_id, c.path,
          ce.keywords_ar, ce.keywords_en,
          c.meta_keywords_ar, c.meta_keywords_en
        FROM categories c
        LEFT JOIN category_embeddings ce ON c.id = ce.category_id
        ORDER BY c.level DESC, c.sort_order ASC
        LIMIT 500
      `);

      // Load all cities (usually < 1000)
      logger.debug('🌍 Loading cities into cache...');
      this.hotCache.topCities = await this.db.query(`
        SELECT id, name_ar, name_en, province_ar, province_en
        FROM cities
      `);

      // Load transaction types (only ~5)
      logger.debug('💼 Loading transaction types into cache...');
      this.hotCache.transactionTypes = await this.db.query(`
        SELECT id, slug, name_ar, name_en
        FROM transaction_types
      `);

      this.hotCache.lastRefresh = Date.now();
      logger.success('Hot cache initialized successfully', {
        categories: this.hotCache.topCategories.rows.length,
        cities: this.hotCache.topCities.rows.length,
        transactionTypes: this.hotCache.transactionTypes.rows.length
      });
    } catch (error) {
      logger.failure('Failed to initialize hot cache', { error: error.message });
      throw error;
    }
  }

  /**
   * Refresh hot cache if TTL expired
   */
  async refreshHotCacheIfNeeded() {
    if (!this.hotCache.lastRefresh || Date.now() - this.hotCache.lastRefresh > this.HOT_CACHE_TTL) {
      logger.info('Hot cache TTL expired, refreshing...');
      await this.initializeHotCache();
    }
  }

  /**
   * Match category from query tokens using database
   * Strategy: keywords array match → full-text → fuzzy → vector
   */
  async matchCategory(tokens, language = 'ar') {
    logger.debug(`🔍 Matching category with tokens: ${tokens.join(', ')}`);
    await this.refreshHotCacheIfNeeded();

    const normalizedTokens = tokens.map(t => ArabicNormalizer.normalizeAndLower(t));
    const keywordsColumn = language === 'ar' ? 'keywords_ar' : 'keywords_en';
    const nameColumn = language === 'ar' ? 'name_ar' : 'name_en';
    const metaKeywordsColumn = `meta_keywords_${language}`;

    try {
      // Strategy 1: Hot cache keyword match (fastest)
      logger.debug('⚡ Trying hot cache keyword match...');
      if (this.hotCache.topCategories) {
        // Filter stopwords
        const stopwords = ['للبيع', 'للايجار', 'للإيجار', 'في', 'من', 'على', 'الى', 'إلى', 'عن', 'مع'];
        const meaningfulTokens = normalizedTokens.filter(t => !stopwords.includes(t) && t.length >= 3);

        for (const token of meaningfulTokens) {
          const cached = this.hotCache.topCategories.rows.find(cat => {
            const keywords = cat[keywordsColumn] || [];
            // Match with ta marbuta normalization (ة → ه)
            // Require exact match or substantial overlap (not just 3 chars)
            return keywords.some(kw => {
              const kwLower = kw.toLowerCase();
              const kwNormalized = kwLower.replace(/ة/g, 'ه');

              // Exact match or normalized match (highest confidence)
              if (kwLower === token || kwNormalized === token) {
                return true;
              }

              // For substring matches, require substantial overlap
              // Minimum 4 chars AND at least 80% of the shorter word
              const minLen = Math.min(kwLower.length, token.length);
              const minMatchLen = Math.max(4, Math.ceil(minLen * 0.8));

              // Check if substring match meets requirements
              if ((kwLower.includes(token) || token.includes(kwLower)) && token.length >= minMatchLen) {
                return true;
              }
              if ((kwNormalized.includes(token) || token.includes(kwNormalized)) && token.length >= minMatchLen) {
                return true;
              }

              return false;
            });
          });
          if (cached) {
            logger.matchFound('Category', `Found in cache: ${cached[nameColumn]}`, {
              id: cached.id,
              slug: cached.slug,
              confidence: 0.95,
              token: token
            });
            return { ...cached, confidence: 0.95, method: 'hot_cache_keyword' };
          }
        }
      }
      logger.debug('⚠️  No cache match, trying database...');

      // Strategy 2: Database keyword array search (with ta marbuta normalization)
      logger.debug('🔎 Trying database keyword array search...');

      // Filter stopwords that cause false positives
      const stopwords = ['للبيع', 'للايجار', 'للإيجار', 'في', 'من', 'على', 'الى', 'إلى', 'عن', 'مع'];
      const meaningfulTokens = normalizedTokens.filter(t => !stopwords.includes(t) && t.length >= 3);

      if (meaningfulTokens.length > 0) {
        // Try keywords_ar first (higher priority than meta_keywords)
        // MULTI-TOKEN MATCHING: Count how many keywords match
        const keywordResult = await this.db.query(`
          SELECT
            c.id, c.slug, c.name_ar, c.name_en, c.level, c.parent_id, c.path,
            (
              SELECT COUNT(DISTINCT token)
              FROM unnest(ce.${keywordsColumn}) AS kw
              CROSS JOIN unnest($1::text[]) AS token
              WHERE lower(kw) = token
                OR lower(replace(kw, 'ة', 'ه')) = token
                OR lower(kw) LIKE '%' || token || '%'
                OR token LIKE '%' || lower(kw) || '%'
            ) as matched_keywords_count,
            CASE
              WHEN (
                SELECT COUNT(DISTINCT token)
                FROM unnest(ce.${keywordsColumn}) AS kw
                CROSS JOIN unnest($1::text[]) AS token
                WHERE lower(kw) = token
                  OR lower(replace(kw, 'ة', 'ه')) = token
                  OR lower(kw) LIKE '%' || token || '%'
                  OR token LIKE '%' || lower(kw) || '%'
              ) >= 2 THEN 0.95
              ELSE 0.70
            END as confidence
          FROM categories c
          LEFT JOIN category_embeddings ce ON c.id = ce.category_id
          WHERE c.is_active = true
            AND EXISTS (
              SELECT 1 FROM unnest(ce.${keywordsColumn}) AS kw
              CROSS JOIN unnest($1::text[]) AS token
              WHERE lower(kw) = token
                OR lower(replace(kw, 'ة', 'ه')) = token
                OR lower(kw) LIKE '%' || token || '%'
                OR token LIKE '%' || lower(kw) || '%'
            )
          ORDER BY matched_keywords_count DESC, c.level DESC, c.sort_order ASC
          LIMIT 1
        `, [meaningfulTokens]);

        if (keywordResult.rows.length > 0) {
          const matchedCount = keywordResult.rows[0].matched_keywords_count;
          logger.matchFound('Category', `DB keyword match: ${keywordResult.rows[0][nameColumn]}`, {
            slug: keywordResult.rows[0].slug,
            confidence: keywordResult.rows[0].confidence,
            matchedKeywords: matchedCount,
            totalTokens: meaningfulTokens.length
          });
          return { ...keywordResult.rows[0], method: 'db_keyword_match' };
        }

        // Try meta_keywords (lower confidence)
        logger.debug('⚠️  No keywords_ar match, trying meta_keywords...');
        const metaResult = await this.db.query(`
          SELECT
            c.id, c.slug, c.name_ar, c.name_en, c.level, c.parent_id, c.path,
            0.85 as confidence
          FROM categories c
          WHERE c.is_active = true
            AND c.${metaKeywordsColumn} ILIKE ANY(ARRAY(SELECT '%' || unnest($1::text[]) || '%'))
          ORDER BY c.level DESC, c.sort_order ASC
          LIMIT 1
        `, [meaningfulTokens]);

        if (metaResult.rows.length > 0) {
          logger.matchFound('Category', `Meta keyword match: ${metaResult.rows[0][nameColumn]}`, {
            slug: metaResult.rows[0].slug,
            confidence: 0.85
          });
          return { ...metaResult.rows[0], method: 'db_meta_keyword_match' };
        }
      }

      logger.debug('⚠️  No keyword match, trying full-text search...');

      // Strategy 3: Full-text search on category names
      logger.debug('📝 Trying full-text search...');
      const ftsResult = await this.db.query(`
        SELECT
          c.id, c.slug, c.name_ar, c.name_en, c.level, c.parent_id, c.path,
          ts_rank(
            to_tsvector('arabic', c.name_ar || ' ' || COALESCE(c.description_ar, '')),
            plainto_tsquery('arabic', $1)
          ) as rank,
          0.85 as confidence
        FROM categories c
        WHERE c.is_active = true
          AND to_tsvector('arabic', c.name_ar || ' ' || COALESCE(c.description_ar, ''))
              @@ plainto_tsquery('arabic', $1)
        ORDER BY rank DESC, c.level DESC
        LIMIT 1
      `, [normalizedTokens.join(' ')]);

      if (ftsResult.rows.length > 0) {
        logger.matchFound('Category', `Full-text match: ${ftsResult.rows[0][nameColumn]}`, {
          slug: ftsResult.rows[0].slug,
          rank: ftsResult.rows[0].rank,
          confidence: 0.85
        });
        return { ...ftsResult.rows[0], method: 'full_text_search' };
      }
      logger.debug('⚠️  No full-text match, trying fuzzy search...');

      // Strategy 4: Trigram similarity (fuzzy)
      logger.debug('🔤 Trying trigram fuzzy match...');
      const fuzzyResult = await this.db.query(`
        SELECT
          c.id, c.slug, c.name_ar, c.name_en, c.level, c.parent_id, c.path,
          GREATEST(
            similarity(c.${nameColumn}, $1),
            similarity(c.slug, $2)
          ) as sim,
          0.75 as confidence
        FROM categories c
        WHERE c.is_active = true
          AND (
            similarity(c.${nameColumn}, $1) > 0.3
            OR similarity(c.slug, $2) > 0.3
          )
        ORDER BY sim DESC, c.level DESC
        LIMIT 1
      `, [normalizedTokens[0], normalizedTokens[0]]);

      if (fuzzyResult.rows.length > 0) {
        logger.matchFound('Category', `Fuzzy match: ${fuzzyResult.rows[0][nameColumn]}`, {
          slug: fuzzyResult.rows[0].slug,
          similarity: fuzzyResult.rows[0].sim,
          confidence: 0.75
        });
        return { ...fuzzyResult.rows[0], method: 'fuzzy_match' };
      }

      logger.matchNotFound('Category', 'No match found with any strategy');
      return null;
    } catch (error) {
      logger.dbError('Category matching error', error);
      return null;
    }
  }

  /**
   * Match location (city/neighborhood) from query
   */
  async matchLocation(tokens, language = 'ar') {
    logger.debug(`🗺️  Matching location with tokens: ${tokens.join(', ')}`);
    await this.refreshHotCacheIfNeeded();

    // Arabic stop words to exclude from location matching
    const arabicStopWords = new Set([
      'على', 'في', 'من', 'الى', 'إلى', 'عن', 'مع', 'بدون', 'عند',
      'لـ', 'ل', 'و', 'أو', 'او', 'لكن', 'ولكن', 'ثم', 'أن', 'ان',
      'هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي', 'اللذان', 'اللتان'
    ]);

    // Filter out stop words
    const normalizedTokens = tokens
      .map(t => ArabicNormalizer.normalizeAndLower(t))
      .filter(t => !arabicStopWords.has(t) && t.length > 2); // Also exclude very short tokens

    if (normalizedTokens.length === 0) {
      logger.debug('⚠️  No valid location tokens after filtering stop words');
      return null;
    }

    logger.debug(`🗺️  Filtered tokens: ${normalizedTokens.join(', ')}`);
    const nameColumn = language === 'ar' ? 'name_ar' : 'name_en';
    const provinceColumn = language === 'ar' ? 'province_ar' : 'province_en';

    try {
      // Check hot cache first
      logger.debug('⚡ Checking cities hot cache...');
      if (this.hotCache.topCities) {
        for (const token of normalizedTokens) {
          const cached = this.hotCache.topCities.rows.find(city => {
            const cityName = city[nameColumn]?.toLowerCase() || '';
            const provinceName = city[provinceColumn]?.toLowerCase() || '';
            return cityName.includes(token) ||
                   token.includes(cityName) ||
                   provinceName.includes(token);
          });
          if (cached) {
            logger.matchFound('Location', `City found in cache: ${cached[nameColumn]}`, {
              province: cached[provinceColumn],
              confidence: 0.95
            });
            return {
              ...cached,
              type: 'city',
              confidence: 0.95,
              method: 'hot_cache'
            };
          }
        }
      }
      logger.debug('⚠️  No cache match, searching database...');

      // Try city match with similarity
      logger.debug('🏙️  Trying city match with similarity...');
      const cityResult = await this.db.query(`
        SELECT
          id, name_ar, name_en, province_ar, province_en,
          'city' as type,
          GREATEST(
            similarity(${nameColumn}, $1),
            similarity(${provinceColumn}, $1)
          ) as sim,
          0.9 as confidence
        FROM cities
        WHERE (
          similarity(${nameColumn}, $1) > 0.4
          OR similarity(${provinceColumn}, $1) > 0.4
          OR ${nameColumn} ILIKE '%' || $1 || '%'
        )
        ORDER BY sim DESC
        LIMIT 1
      `, [normalizedTokens.join(' ')]);

      if (cityResult.rows.length > 0) {
        logger.matchFound('Location', `City found: ${cityResult.rows[0][nameColumn]}`, {
          province: cityResult.rows[0][provinceColumn],
          similarity: cityResult.rows[0].sim,
          confidence: 0.9
        });
        return { ...cityResult.rows[0], method: 'db_similarity' };
      }
      logger.debug('⚠️  No city match, trying neighborhoods...');

      // Try neighborhood match
      logger.debug('🏘️  Trying neighborhood match...');
      const neighborhoodResult = await this.db.query(`
        SELECT
          n.id, n.name_ar, n.name_en, n.city_id,
          c.name_ar as city_name_ar, c.name_en as city_name_en,
          'neighborhood' as type,
          similarity(n.${nameColumn}, $1) as sim,
          0.85 as confidence
        FROM neighborhoods n
        JOIN cities c ON n.city_id = c.id
        WHERE similarity(n.${nameColumn}, $1) > 0.4
        ORDER BY sim DESC
        LIMIT 1
      `, [normalizedTokens.join(' ')]);

      if (neighborhoodResult.rows.length > 0) {
        logger.matchFound('Location', `Neighborhood found: ${neighborhoodResult.rows[0][nameColumn]}`, {
          city: neighborhoodResult.rows[0].city_name_ar,
          similarity: neighborhoodResult.rows[0].sim,
          confidence: 0.85
        });
        return { ...neighborhoodResult.rows[0], method: 'neighborhood_match' };
      }

      logger.matchNotFound('Location', 'No city or neighborhood match found');
      return null;
    } catch (error) {
      logger.dbError('Location matching error', error);
      return null;
    }
  }

  /**
   * Match transaction type (simple - only 5 types)
   * This is the ONLY static part - and it's tiny
   */
  matchTransactionType(text, language = 'ar') {
    const normalized = ArabicNormalizer.normalizeAndLower(text);

    // Static patterns mapped to actual database slugs
    // NOTE: بدي/أريد/ابحث removed from service-requested as they're general search intent, not "wanted" ads
    const patterns = {
      'for-sale': [/للبيع/, /بيع/, /ابيع/, /أبيع/, /for sale/i, /sell/i],
      'for-rent-monthly': [/للإيجار/, /للايجار/, /إيجار شهري/, /ايجار شهري/, /شهري/, /for rent/i, /monthly/i],
      'for-rent-daily': [/إيجار يومي/, /ايجار يومي/, /يومي/, /daily/i],
      'for-rent-yearly': [/إيجار سنوي/, /ايجار سنوي/, /سنوي/, /yearly/i, /annual/i],
      'for-exchange': [/للتبادل/, /للمداكشة/, /تبادل/, /مقايضة/, /exchange/i, /swap/i],
      'service-requested': [/مطلوب/, /wanted/i, /خدمة مطلوبة/], // Only explicit "wanted" patterns
      'service-offered': [/خدمة متاحة/, /اقدم/, /أقدم/, /متوفر/, /available/i, /offering/i],
      'job-posting': [/وظيفة/, /إعلان وظيفة/, /job/i, /position/i],
      'job-seeking': [/ابحث عن وظيفة/, /بحث عن عمل/, /job seeking/i, /looking for job/i]
    };

    for (const [type, typePatterns] of Object.entries(patterns)) {
      for (const pattern of typePatterns) {
        if (pattern.test(normalized)) {
          // Get full details from hot cache
          const fullType = this.hotCache.transactionTypes?.rows.find(t => t.slug === type);
          if (fullType) {
            logger.debug(`✅ Transaction type matched: ${fullType.name_ar} (${type})`);
            return {
              slug: type,
              id: fullType.id,
              name_ar: fullType.name_ar,
              name_en: fullType.name_en,
              confidence: 1.0
            };
          }
        }
      }
    }

    // No default - return null if not explicitly mentioned
    // This allows searching across ALL transaction types (for-sale, for-rent, wanted, etc.)
    logger.debug('⚠️  No transaction type matched - will search across all types');
    return null;
  }

  /**
   * Extract numeric attributes from text using regex
   * This is generic - works for any numeric attribute
   */
  extractNumericAttributes(text) {
    const attributes = {};
    const normalized = ArabicNormalizer.normalize(text);

    // Price range patterns (must check BEFORE single value patterns)
    // Check million ranges FIRST
    const priceRangePatterns = [
      // Million ranges (highest priority)
      { pattern: /من\s*(\d[\d,\.]*)\s*(?:إلى|الى|إلي|الي|-)\s*(\d[\d,\.]*)\s*(?:مليون|million)/i, multiplier: 1000000 },
      { pattern: /بين\s*(\d[\d,\.]*)\s*(?:و|و)\s*(\d[\d,\.]*)\s*(?:مليون|million)/i, multiplier: 1000000 },
      { pattern: /(\d[\d,\.]*)\s*-\s*(\d[\d,\.]*)\s*(?:مليون|million)/i, multiplier: 1000000 },
      // Currency ranges
      { pattern: /من\s*(\d[\d,\.]*)\s*(?:إلى|الى|إلي|الي|-)\s*(\d[\d,\.]*)\s*(ليرة|ل\.س|syp|دولار|\$|usd)/i, multiplier: 1 },
      { pattern: /بين\s*(\d[\d,\.]*)\s*(?:و|و)\s*(\d[\d,\.]*)\s*(ليرة|ل\.س|syp|دولار|\$|usd)/i, multiplier: 1 },
      { pattern: /(\d[\d,\.]*)\s*-\s*(\d[\d,\.]*)\s*(ليرة|ل\.س|syp|دولار|\$|usd)/i, multiplier: 1 },
      // Generic ranges
      { pattern: /بسعر\s*من\s*(\d[\d,\.]*)\s*(?:إلى|الى|إلي|الي|-)\s*(\d[\d,\.]*)/i, multiplier: 1 },
      { pattern: /السعر\s*من\s*(\d[\d,\.]*)\s*(?:إلى|الى|الي|الي|-)\s*(\d[\d,\.]*)/i, multiplier: 1 }
    ];

    for (const { pattern, multiplier } of priceRangePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        let min = parseFloat(match[1].replace(/,/g, ''));
        let max = parseFloat(match[2].replace(/,/g, ''));

        // Apply multiplier
        if (multiplier > 1) {
          min *= multiplier;
          max *= multiplier;
        }

        attributes.price = { min, max, type: 'range' };
        logger.debug(`💰 Price range extracted: ${min} - ${max}`);
        break;
      }
    }

    // Single price patterns (only if range not found)
    if (!attributes.price) {
      const pricePatterns = [
        { pattern: /(\d[\d,\.]*)\s*(ليرة|ل\.س|syp|دولار|\$|usd)/i, multiplier: 1 },
        { pattern: /بسعر\s*(\d[\d,\.]*)/, multiplier: 1 },
        { pattern: /السعر\s*[:.]?\s*(\d[\d,\.]*)/, multiplier: 1 },
        { pattern: /(\d[\d,\.]*)\s*(مليون)/i, multiplier: 1000000 }
      ];

      for (const { pattern, multiplier } of pricePatterns) {
        const match = normalized.match(pattern);
        if (match) {
          let value = parseFloat(match[1].replace(/,/g, ''));
          if (multiplier > 1 || normalized.includes('مليون') || normalized.includes('million')) {
            value *= multiplier > 1 ? multiplier : 1000000;
          }
          attributes.price = { value, type: 'number' };
          logger.debug(`💰 Single price extracted: ${value}`);
          break;
        }
      }
    }

    // Area range patterns
    const areaRangePatterns = [
      /من\s*(\d+)\s*(?:إلى|الى|الي|الي|-)\s*(\d+)\s*(متر|م²|م2|sqm)/i,
      /بين\s*(\d+)\s*(?:و|و)\s*(\d+)\s*(متر|م²|م2|sqm)/i,
      /(\d+)\s*-\s*(\d+)\s*(متر|م²|م2|sqm)/i,
      /مساحة\s*من\s*(\d+)\s*(?:إلى|الى|الي|-)\s*(\d+)/i
    ];

    for (const pattern of areaRangePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        attributes.area = {
          min: parseInt(match[1]),
          max: parseInt(match[2]),
          type: 'range'
        };
        logger.debug(`📐 Area range extracted: ${match[1]} - ${match[2]}`);
        break;
      }
    }

    // Single area patterns (only if range not found)
    if (!attributes.area) {
      const areaPatterns = [
        /(\d+)\s*(متر|م²|م2|sqm|square)/i,
        /مساحة\s*[:.]?\s*(\d+)/,
        /(\d+)\s*(دونم|هكتار)/i
      ];

      for (const pattern of areaPatterns) {
        const match = normalized.match(pattern);
        if (match) {
          attributes.area = { value: parseInt(match[1]), type: 'number' };
          logger.debug(`📐 Single area extracted: ${match[1]}`);
          break;
        }
      }
    }

    // Rooms patterns
    const roomsPatterns = [
      /(\d+)\s*(غرف|غرفة|rooms?)/i,
      /(غرفة|غرفتين|غرفتان|ثلاث غرف|أربع غرف|خمس غرف)/
    ];
    const roomsTextMap = {
      'غرفة': 1,
      'غرفتين': 2,
      'غرفتان': 2,
      'ثلاث غرف': 3,
      'أربع غرف': 4,
      'خمس غرف': 5
    };

    for (const pattern of roomsPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const value = roomsTextMap[match[1]] || parseInt(match[1]);
        if (value) {
          attributes.rooms = { value, type: 'number' };
          break;
        }
      }
    }

    // Year patterns
    const yearPatterns = [
      /موديل\s*(20\d{2}|19\d{2})/,
      /(20\d{2}|19\d{2})\s*(model)?/i,
      /سنة\s*(20\d{2}|19\d{2})/
    ];

    for (const pattern of yearPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        attributes.year = { value: parseInt(match[1]), type: 'number' };
        break;
      }
    }

    // Mileage patterns
    const mileagePatterns = [
      /(\d[\d,]*)\s*(كم|كيلو|km|kilometer)/i,
      /مسافة\s*[:.]?\s*(\d[\d,]*)/
    ];

    for (const pattern of mileagePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        attributes.mileage = { value: parseInt(match[1].replace(/,/g, '')), type: 'number' };
        break;
      }
    }

    // Condition patterns
    const conditionPatterns = {
      new: [/جديد/, /جديدة/, /زيرو/, /new/i, /brand new/i],
      used: [/مستعمل/, /مستعملة/, /used/i, /second hand/i]
    };

    for (const [condition, patterns] of Object.entries(conditionPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalized)) {
          attributes.condition = { value: condition, type: 'select' };
          break;
        }
      }
      if (attributes.condition) break;
    }

    // Price indicator
    if (/رخيص|رخيصة|سعر منخفض|سعر مناسب|cheap|affordable/i.test(normalized)) {
      attributes.priceIndicator = 'cheap';
    } else if (/غالي|غالية|فخم|فاخر|expensive|luxury|premium/i.test(normalized)) {
      attributes.priceIndicator = 'expensive';
    }

    return attributes;
  }

  /**
   * Get category-specific attributes from database
   */
  async getCategoryAttributes(categoryId, language = 'ar') {
    try {
      logger.debug(`📋 Fetching attributes for category: ${categoryId}`);
      const result = await this.db.query(`
        SELECT
          la.id, la.slug, la.type, la.options,
          la.name_ar, la.name_en,
          la.unit_ar, la.unit_en,
          la.min_value, la.max_value,
          ca.is_required, ca.is_filterable
        FROM category_attributes ca
        JOIN listing_attributes la ON ca.attribute_id = la.id
        WHERE ca.category_id = $1
          AND la.is_active = true
        ORDER BY ca.sort_order ASC
      `, [categoryId]);

      logger.debug(`✓ Found ${result.rows.length} attributes for category`);
      return result.rows;
    } catch (error) {
      logger.dbError('Error fetching category attributes', error);
      return [];
    }
  }

  /**
   * Find leaf categories (most specific) under a parent
   */
  async findLeafCategory(parentId, hints, language = 'ar') {
    try {
      const nameColumn = language === 'ar' ? 'name_ar' : 'name_en';
      const keywordsColumn = language === 'ar' ? 'keywords_ar' : 'keywords_en';

      // Get all descendants and find best match
      const result = await this.db.query(`
        WITH RECURSIVE descendants AS (
          SELECT id, slug, name_ar, name_en, level, parent_id
          FROM categories
          WHERE parent_id = $1 AND is_active = true

          UNION ALL

          SELECT c.id, c.slug, c.name_ar, c.name_en, c.level, c.parent_id
          FROM categories c
          JOIN descendants d ON c.parent_id = d.id
          WHERE c.is_active = true
        )
        SELECT
          d.id, d.slug, d.name_ar, d.name_en, d.level,
          ce.${keywordsColumn} as keywords,
          GREATEST(
            similarity(d.${nameColumn}, $2),
            COALESCE((SELECT MAX(similarity(kw, $2)) FROM unnest(ce.${keywordsColumn}) kw), 0)
          ) as relevance
        FROM descendants d
        LEFT JOIN category_embeddings ce ON d.id = ce.category_id
        WHERE NOT EXISTS (
          SELECT 1 FROM categories child
          WHERE child.parent_id = d.id AND child.is_active = true
        )
        ORDER BY relevance DESC, d.level DESC
        LIMIT 1
      `, [parentId, hints.join(' ')]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding leaf category:', error);
      return null;
    }
  }
}

// Singleton instance
module.exports = new DatabaseMatcher();
