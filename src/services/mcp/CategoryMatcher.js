const database = require('../../config/database');
const openAIService = require('../ai/OpenAIService');
const cacheService = require('../cache/CacheService');
const arabicNormalizer = require('../../utils/arabicNormalizer');
const logger = require('../../utils/logger');

class CategoryMatcher {
  constructor() {
    this.db = database;
    this.ai = openAIService;
    this.cache = cacheService;
  }

  /**
   * Match category from hint text
   * @param {string} hint - Category hint from AI
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Promise<Object|null>} Matched category
   */
  async match(hint, language = 'ar') {
    if (!hint) {
      logger.debug('No category hint provided');
      return null;
    }

    try {
      logger.debug('Matching category', { hint, language });

      // Strategy 1: Direct keyword match (fastest)
      const directMatch = await this.directKeywordMatch(hint, language);
      if (directMatch && directMatch.confidence > 0.9) {
        logger.info('Category matched via direct keyword', {
          hint,
          category: directMatch.slug,
          confidence: directMatch.confidence
        });
        return directMatch;
      }

      // Strategy 2: Vector similarity search
      const vectorMatch = await this.vectorSearch(hint, language);
      if (vectorMatch && vectorMatch.confidence > 0.85) {
        logger.info('Category matched via vector search', {
          hint,
          category: vectorMatch.slug,
          confidence: vectorMatch.confidence
        });
        return vectorMatch;
      }

      // Strategy 3: Fuzzy text match
      const fuzzyMatch = await this.fuzzyMatch(hint, language);
      if (fuzzyMatch && fuzzyMatch.confidence > 0.7) {
        logger.info('Category matched via fuzzy search', {
          hint,
          category: fuzzyMatch.slug,
          confidence: fuzzyMatch.confidence
        });
        return fuzzyMatch;
      }

      // Return best match
      const bestMatch = this.selectBestMatch([directMatch, vectorMatch, fuzzyMatch]);

      if (bestMatch) {
        logger.info('Category matched', {
          hint,
          category: bestMatch.slug,
          confidence: bestMatch.confidence
        });
      } else {
        logger.warn('No category match found', { hint });
      }

      return bestMatch;
    } catch (error) {
      logger.error('Category matching error:', error);
      return null;
    }
  }

  /**
   * Direct keyword match in category names and keywords
   * @param {string} hint - Search hint
   * @param {string} language - Language
   * @returns {Promise<Object|null>} Matched category
   */
  async directKeywordMatch(hint, language) {
    try {
      const normalized = arabicNormalizer.normalizeAndLower(hint);
      const column = language === 'ar' ? 'name_ar' : 'name_en';
      const keywordsColumn = language === 'ar' ? 'keywords_ar' : 'keywords_en';

      const result = await this.db.query(
        `
        SELECT
          c.id,
          c.slug,
          c.name_ar,
          c.name_en,
          c.level,
          c.path,
          c.parent_id,
          1.0 as confidence
        FROM categories c
        LEFT JOIN category_embeddings ce ON c.id = ce.category_id
        WHERE c.is_active = true
          AND (
            LOWER(c.${column}) = $1
            OR $1 = ANY(ce.${keywordsColumn})
          )
        ORDER BY c.level DESC, c.sort_order ASC
        LIMIT 1
        `,
        [normalized]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Direct keyword match error:', error);
      return null;
    }
  }

  /**
   * Vector similarity search using embeddings
   * @param {string} hint - Search hint
   * @param {string} language - Language
   * @returns {Promise<Object|null>} Matched category
   */
  async vectorSearch(hint, language) {
    try {
      // Generate embedding for the hint
      const embedding = await this.ai.createEmbedding(hint);
      const embeddingColumn = language === 'ar' ? 'embedding_ar' : 'embedding_en';

      // Convert embedding array to PostgreSQL vector format
      const embeddingStr = `[${embedding.join(',')}]`;

      const result = await this.db.query(
        `
        SELECT
          c.id,
          c.slug,
          c.name_ar,
          c.name_en,
          c.level,
          c.path,
          c.parent_id,
          1 - (ce.${embeddingColumn} <=> $1::vector) as confidence
        FROM categories c
        JOIN category_embeddings ce ON c.id = ce.category_id
        WHERE c.is_active = true
          AND ce.${embeddingColumn} IS NOT NULL
        ORDER BY ce.${embeddingColumn} <=> $1::vector
        LIMIT 5
        `,
        [embeddingStr]
      );

      // Prefer leaf categories (higher level = more specific)
      const matches = result.rows;
      const leafMatches = matches.filter(m => m.level >= 2);

      return leafMatches[0] || matches[0] || null;
    } catch (error) {
      logger.error('Vector search error:', error);
      return null;
    }
  }

  /**
   * Fuzzy text matching using trigram similarity
   * @param {string} hint - Search hint
   * @param {string} language - Language
   * @returns {Promise<Object|null>} Matched category
   */
  async fuzzyMatch(hint, language) {
    try {
      const column = language === 'ar' ? 'name_ar' : 'name_en';

      const result = await this.db.query(
        `
        SELECT
          c.id,
          c.slug,
          c.name_ar,
          c.name_en,
          c.level,
          c.path,
          c.parent_id,
          SIMILARITY(c.${column}, $1) as confidence
        FROM categories c
        WHERE c.is_active = true
          AND SIMILARITY(c.${column}, $1) > 0.3
        ORDER BY SIMILARITY(c.${column}, $1) DESC, c.level DESC
        LIMIT 3
        `,
        [hint]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Fuzzy match error:', error);
      return null;
    }
  }

  /**
   * Select best match from multiple strategies
   * @param {Array<Object>} matches - Array of match objects
   * @returns {Object|null} Best match
   */
  selectBestMatch(matches) {
    const validMatches = matches.filter(m => m && m.confidence);

    if (validMatches.length === 0) {
      return null;
    }

    // Sort by confidence and level (prefer leaf categories)
    validMatches.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) {
        return confidenceDiff;
      }
      // If confidence is similar, prefer deeper category
      return b.level - a.level;
    });

    return validMatches[0];
  }

  /**
   * Get category by ID
   * @param {string} categoryId - Category UUID
   * @returns {Promise<Object|null>} Category
   */
  async getCategoryById(categoryId) {
    try {
      // Check cache first
      const cached = await this.cache.getStructure('categories', categoryId);
      if (cached) {
        return cached;
      }

      const result = await this.db.query(
        `
        SELECT
          id,
          slug,
          name_ar,
          name_en,
          level,
          path,
          parent_id
        FROM categories
        WHERE id = $1 AND is_active = true
        `,
        [categoryId]
      );

      const category = result.rows[0] || null;

      if (category) {
        await this.cache.setStructure('categories', category, categoryId);
      }

      return category;
    } catch (error) {
      logger.error('Get category by ID error:', error);
      return null;
    }
  }

  /**
   * Get category hierarchy (breadcrumb)
   * @param {string} categoryId - Category UUID
   * @returns {Promise<Array>} Category path
   */
  async getCategoryPath(categoryId) {
    try {
      const result = await this.db.query(
        `
        WITH RECURSIVE category_path AS (
          SELECT id, parent_id, name_ar, name_en, slug, 0 as depth
          FROM categories
          WHERE id = $1

          UNION ALL

          SELECT c.id, c.parent_id, c.name_ar, c.name_en, c.slug, cp.depth + 1
          FROM categories c
          INNER JOIN category_path cp ON c.id = cp.parent_id
        )
        SELECT id, name_ar, name_en, slug
        FROM category_path
        ORDER BY depth DESC
        `,
        [categoryId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Get category path error:', error);
      return [];
    }
  }

  /**
   * Get all active categories (for debugging/admin)
   * @returns {Promise<Array>} Categories
   */
  async getAllCategories() {
    try {
      const cached = await this.cache.getStructure('categories', 'all');
      if (cached) {
        return cached;
      }

      const result = await this.db.query(
        `
        SELECT id, slug, name_ar, name_en, level, parent_id
        FROM categories
        WHERE is_active = true
        ORDER BY level ASC, sort_order ASC
        `
      );

      const categories = result.rows;
      await this.cache.setStructure('categories', categories, 'all');

      return categories;
    } catch (error) {
      logger.error('Get all categories error:', error);
      return [];
    }
  }
}

// Singleton instance
module.exports = new CategoryMatcher();
