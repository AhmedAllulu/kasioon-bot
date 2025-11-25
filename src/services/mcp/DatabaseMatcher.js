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
      logger.info('Initializing DatabaseMatcher hot cache...');

      // Load top 500 most-used categories with their keywords
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
      this.hotCache.topCities = await this.db.query(`
        SELECT id, name_ar, name_en, province_ar, province_en
        FROM cities
      `);

      // Load transaction types (only ~5)
      this.hotCache.transactionTypes = await this.db.query(`
        SELECT id, slug, name_ar, name_en
        FROM transaction_types
      `);

      this.hotCache.lastRefresh = Date.now();
      logger.info('Hot cache initialized', {
        categories: this.hotCache.topCategories.rows.length,
        cities: this.hotCache.topCities.rows.length,
        transactionTypes: this.hotCache.transactionTypes.rows.length
      });
    } catch (error) {
      logger.error('Failed to initialize hot cache:', error);
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
    await this.refreshHotCacheIfNeeded();

    const normalizedTokens = tokens.map(t => ArabicNormalizer.normalizeAndLower(t));
    const keywordsColumn = language === 'ar' ? 'keywords_ar' : 'keywords_en';
    const nameColumn = language === 'ar' ? 'name_ar' : 'name_en';
    const metaKeywordsColumn = `meta_keywords_${language}`;

    try {
      // Strategy 1: Hot cache keyword match (fastest)
      if (this.hotCache.topCategories) {
        for (const token of normalizedTokens) {
          const cached = this.hotCache.topCategories.rows.find(cat => {
            const keywords = cat[keywordsColumn] || [];
            const metaKeywords = cat[metaKeywordsColumn]?.toLowerCase() || '';
            return keywords.some(kw =>
              kw.toLowerCase().includes(token) || token.includes(kw.toLowerCase())
            ) || metaKeywords.includes(token);
          });
          if (cached) {
            return { ...cached, confidence: 0.95, method: 'hot_cache_keyword' };
          }
        }
      }

      // Strategy 2: Database keyword array search
      const keywordResult = await this.db.query(`
        SELECT
          c.id, c.slug, c.name_ar, c.name_en, c.level, c.parent_id, c.path,
          0.95 as confidence
        FROM categories c
        LEFT JOIN category_embeddings ce ON c.id = ce.category_id
        WHERE c.is_active = true
          AND (
            ce.${keywordsColumn} && $1::text[]
            OR c.${metaKeywordsColumn} ILIKE ANY(ARRAY(SELECT '%' || unnest($1::text[]) || '%'))
          )
        ORDER BY c.level DESC, c.sort_order ASC
        LIMIT 1
      `, [normalizedTokens]);

      if (keywordResult.rows.length > 0) {
        return { ...keywordResult.rows[0], method: 'db_keyword_match' };
      }

      // Strategy 3: Full-text search on category names
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
        return { ...ftsResult.rows[0], method: 'full_text_search' };
      }

      // Strategy 4: Trigram similarity (fuzzy)
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
        return { ...fuzzyResult.rows[0], method: 'fuzzy_match' };
      }

      return null;
    } catch (error) {
      logger.error('Category matching error:', error);
      return null;
    }
  }

  /**
   * Match location (city/neighborhood) from query
   */
  async matchLocation(tokens, language = 'ar') {
    await this.refreshHotCacheIfNeeded();

    const normalizedTokens = tokens.map(t => ArabicNormalizer.normalizeAndLower(t));
    const nameColumn = language === 'ar' ? 'name_ar' : 'name_en';
    const provinceColumn = language === 'ar' ? 'province_ar' : 'province_en';

    try {
      // Check hot cache first
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
            return {
              ...cached,
              type: 'city',
              confidence: 0.95,
              method: 'hot_cache'
            };
          }
        }
      }

      // Try city match with similarity
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
        return { ...cityResult.rows[0], method: 'db_similarity' };
      }

      // Try neighborhood match
      const neighborhoodResult = await this.db.query(`
        SELECT
          n.id, n.name_ar, n.name_en, n.city_id,
          c.name_ar as city_name_ar, c.name_en as city_name_en,
          'neighborhood' as type,
          similarity(n.${nameColumn}, $1) as sim,
          0.85 as confidence
        FROM neighborhoods n
        JOIN cities c ON n.city_id = c.id
        WHERE n.is_active = true
          AND similarity(n.${nameColumn}, $1) > 0.4
        ORDER BY sim DESC
        LIMIT 1
      `, [normalizedTokens.join(' ')]);

      if (neighborhoodResult.rows.length > 0) {
        return { ...neighborhoodResult.rows[0], method: 'neighborhood_match' };
      }

      return null;
    } catch (error) {
      logger.error('Location matching error:', error);
      return null;
    }
  }

  /**
   * Match transaction type (simple - only 5 types)
   * This is the ONLY static part - and it's tiny
   */
  matchTransactionType(text, language = 'ar') {
    const normalized = ArabicNormalizer.normalizeAndLower(text);

    // Static patterns - only 5 transaction types
    const patterns = {
      sale: [/للبيع/, /بيع/, /ابيع/, /أبيع/, /for sale/i, /sell/i],
      rent: [/للإيجار/, /للايجار/, /إيجار/, /ايجار/, /for rent/i, /rent/i],
      daily_rent: [/إيجار يومي/, /ايجار يومي/, /يومي/, /daily/i],
      exchange: [/للتبادل/, /تبادل/, /مقايضة/, /exchange/i, /swap/i],
      wanted: [/مطلوب/, /بدي/, /أريد/, /اريد/, /ابحث/, /أبحث/, /wanted/i, /looking/i, /need/i]
    };

    for (const [type, typePatterns] of Object.entries(patterns)) {
      for (const pattern of typePatterns) {
        if (pattern.test(normalized)) {
          // Get full details from hot cache
          const fullType = this.hotCache.transactionTypes?.rows.find(t => t.slug === type);
          return {
            slug: type,
            id: fullType?.id,
            name_ar: fullType?.name_ar,
            name_en: fullType?.name_en,
            confidence: 1.0
          };
        }
      }
    }

    // Default to 'sale'
    const defaultType = this.hotCache.transactionTypes?.rows.find(t => t.slug === 'sale');
    return {
      slug: 'sale',
      id: defaultType?.id,
      name_ar: defaultType?.name_ar,
      name_en: defaultType?.name_en,
      confidence: 0.5
    };
  }

  /**
   * Extract numeric attributes from text using regex
   * This is generic - works for any numeric attribute
   */
  extractNumericAttributes(text) {
    const attributes = {};
    const normalized = ArabicNormalizer.normalize(text);

    // Price patterns
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
        break;
      }
    }

    // Area patterns
    const areaPatterns = [
      /(\d+)\s*(متر|م²|م2|sqm|square)/i,
      /مساحة\s*[:.]?\s*(\d+)/,
      /(\d+)\s*(دونم|هكتار)/i
    ];

    for (const pattern of areaPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        attributes.area = { value: parseInt(match[1]), type: 'number' };
        break;
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

      return result.rows;
    } catch (error) {
      logger.error('Error fetching category attributes:', error);
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
