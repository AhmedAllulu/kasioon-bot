const database = require('../../config/database');
const FilterBuilder = require('./FilterBuilder');
const arabicNormalizer = require('../../utils/arabicNormalizer');
const logger = require('../../utils/logger');

/**
 * Text Search Service
 * Performs full-text search using PostgreSQL tsvector
 */
class TextSearch {
  constructor() {
    this.db = database;
  }

  /**
   * Search listings using full-text search
   * @param {string} query - Search query
   * @param {Object} searchParams - Search parameters
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Search results
   */
  async search(query, searchParams = {}, limit = 20) {
    try {
      logger.debug('Text search started', { query: query.substring(0, 50), limit });

      // Normalize query for search
      const normalizedQuery = arabicNormalizer.normalize(query);
      const keywords = arabicNormalizer.extractKeywords(normalizedQuery);

      // Build search query with tsvector
      const searchQuery = this.buildSearchQuery(keywords, searchParams, limit);

      const result = await this.db.query(searchQuery.sql, searchQuery.params);

      logger.info('Text search completed', {
        query: query.substring(0, 50),
        results: result.rows.length,
        keywords: keywords.join(', ')
      });

      // Enrich results with attributes
      return await this.enrichResults(result.rows);
    } catch (error) {
      logger.error('Text search error:', error);
      throw error;
    }
  }

  /**
   * Build full-text search query
   * @param {Array} keywords - Search keywords
   * @param {Object} searchParams - Search parameters
   * @param {number} limit - Result limit
   * @returns {Object} {sql, params}
   */
  buildSearchQuery(keywords, searchParams, limit) {
    // Build filters
    const { whereClause, params } = FilterBuilder.build(searchParams);

    // Create tsquery from keywords
    const tsquery = keywords.map(k => `${k}:*`).join(' | ');

    const sql = `
      SELECT
        l.id,
        l.title,
        l.description,
        l.category_id,
        l.city_id,
        l.neighborhood_id,
        l.transaction_type_id,
        l.views,
        l.is_boosted,
        l.priority,
        l.created_at,
        c.slug as category_slug,
        c.name_ar as category_name_ar,
        c.name_en as category_name_en,
        ct.name_ar as city_name_ar,
        ct.name_en as city_name_en,
        ct.province_ar,
        ct.province_en,
        n.name_ar as neighborhood_name_ar,
        n.name_en as neighborhood_name_en,
        tt.slug as transaction_type_slug,
        tt.name_ar as transaction_type_name_ar,
        tt.name_en as transaction_type_name_en,
        (
          SELECT url FROM listing_images
          WHERE listing_id = l.id AND is_main = true
          LIMIT 1
        ) as main_image_url,
        ts_rank(l.search_vector, to_tsquery('arabic', $${params.length + 1})) as rank_score
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      JOIN cities ct ON l.city_id = ct.id
      LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
      LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
      WHERE ${whereClause}
        AND l.search_vector @@ to_tsquery('arabic', $${params.length + 1})
      ORDER BY
        rank_score DESC,
        l.is_boosted DESC,
        l.priority DESC,
        l.created_at DESC
      LIMIT $${params.length + 2}
    `;

    return {
      sql,
      params: [...params, tsquery, limit]
    };
  }

  /**
   * Title-only search (more precise than searching descriptions)
   * @param {string} query - Search query
   * @param {Object} searchParams - Search parameters
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Search results
   */
  async titleOnlySearch(query, searchParams = {}, limit = 20) {
    try {
      logger.debug('Title-only LIKE search started', { query: query.substring(0, 50) });

      const { whereClause, params } = FilterBuilder.build(searchParams);

      // Extract meaningful keywords from query (remove stopwords)
      const normalized = arabicNormalizer.normalize(query);
      const keywords = arabicNormalizer.extractKeywords(normalized);

      // Use keywords OR full query for broader matching
      let searchTerms = keywords.length > 0 ? keywords : [query];

      // Add both normalized and original versions for Arabic normalization issues (ة vs ه)
      const expandedTerms = [];
      for (const term of searchTerms) {
        expandedTerms.push(term); // normalized version
        // Add original version with ة instead of ه if term contains ه
        if (term.includes('ه')) {
          expandedTerms.push(term.replace(/ه/g, 'ة'));
        }
        // Add original version with ة if term ends with ه
        if (term.endsWith('ه')) {
          expandedTerms.push(term.slice(0, -1) + 'ة');
        }
      }

      searchTerms = expandedTerms;
      const searchPattern = searchTerms.map(k => `%${k}%`);

      // Build ILIKE conditions for TITLE ONLY (not description)
      const likeConditions = searchTerms.map((_, idx) => {
        const patternIdx = params.length + 1 + idx;
        return `l.title ILIKE $${patternIdx}`;
      }).join(' OR ');

      const sql = `
        SELECT
          l.id,
          l.title,
          l.description,
          l.category_id,
          l.city_id,
          l.neighborhood_id,
          l.transaction_type_id,
          l.views,
          l.is_boosted,
          l.priority,
          l.created_at,
          c.slug as category_slug,
          c.name_ar as category_name_ar,
          c.name_en as category_name_en,
          ct.name_ar as city_name_ar,
          ct.name_en as city_name_en,
          ct.province_ar,
          ct.province_en,
          n.name_ar as neighborhood_name_ar,
          n.name_en as neighborhood_name_en,
          tt.slug as transaction_type_slug,
          tt.name_ar as transaction_type_name_ar,
          tt.name_en as transaction_type_name_en,
          (
            SELECT url FROM listing_images
            WHERE listing_id = l.id AND is_main = true
            LIMIT 1
          ) as main_image_url,
          0.7 as rank_score
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        JOIN cities ct ON l.city_id = ct.id
        LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
        LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
        WHERE ${whereClause}
          AND (${likeConditions})
        ORDER BY
          l.is_boosted DESC,
          l.priority DESC,
          l.created_at DESC
        LIMIT $${params.length + searchPattern.length + 1}
      `;

      const result = await this.db.query(sql, [...params, ...searchPattern, limit]);

      logger.info('Title-only search completed', {
        query: query.substring(0, 50),
        results: result.rows.length
      });

      return await this.enrichResults(result.rows);
    } catch (error) {
      logger.error('Title-only search error:', error);
      return [];
    }
  }

  /**
   * Fallback search using LIKE for when no tsvector matches
   * @param {string} query - Search query
   * @param {Object} searchParams - Search parameters
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Search results
   */
  async fallbackSearch(query, searchParams = {}, limit = 20) {
    try {
      logger.debug('Fallback LIKE search started', { query: query.substring(0, 50) });

      const { whereClause, params } = FilterBuilder.build(searchParams);

      // Extract meaningful keywords from query (remove stopwords)
      const normalized = arabicNormalizer.normalize(query);
      const keywords = arabicNormalizer.extractKeywords(normalized);

      // Use keywords OR full query for broader matching
      let searchTerms = keywords.length > 0 ? keywords : [query];

      // Add both normalized and original versions for Arabic normalization issues (ة vs ه)
      const expandedTerms = [];
      for (const term of searchTerms) {
        expandedTerms.push(term); // normalized version
        // Add original version with ة instead of ه if term contains ه
        if (term.includes('ه')) {
          expandedTerms.push(term.replace(/ه/g, 'ة'));
        }
        // Add original version with ة if term ends with ه
        if (term.endsWith('ه')) {
          expandedTerms.push(term.slice(0, -1) + 'ة');
        }
      }

      searchTerms = expandedTerms;
      const searchPattern = searchTerms.map(k => `%${k}%`);

      // Build ILIKE conditions for each search term
      const likeConditions = searchTerms.map((_, idx) => {
        const patternIdx = params.length + 1 + idx;
        return `(l.title ILIKE $${patternIdx} OR l.description ILIKE $${patternIdx})`;
      }).join(' OR ');

      const sql = `
        SELECT
          l.id,
          l.title,
          l.description,
          l.category_id,
          l.city_id,
          l.neighborhood_id,
          l.transaction_type_id,
          l.views,
          l.is_boosted,
          l.priority,
          l.created_at,
          c.slug as category_slug,
          c.name_ar as category_name_ar,
          c.name_en as category_name_en,
          ct.name_ar as city_name_ar,
          ct.name_en as city_name_en,
          ct.province_ar,
          ct.province_en,
          n.name_ar as neighborhood_name_ar,
          n.name_en as neighborhood_name_en,
          tt.slug as transaction_type_slug,
          tt.name_ar as transaction_type_name_ar,
          tt.name_en as transaction_type_name_en,
          (
            SELECT url FROM listing_images
            WHERE listing_id = l.id AND is_main = true
            LIMIT 1
          ) as main_image_url,
          0.5 as rank_score
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        JOIN cities ct ON l.city_id = ct.id
        LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
        LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
        WHERE ${whereClause}
          AND (${likeConditions})
        ORDER BY
          l.is_boosted DESC,
          l.priority DESC,
          l.created_at DESC
        LIMIT $${params.length + searchPattern.length + 1}
      `;

      const result = await this.db.query(sql, [...params, ...searchPattern, limit]);

      logger.info('Fallback search completed', {
        query: query.substring(0, 50),
        results: result.rows.length
      });

      return await this.enrichResults(result.rows);
    } catch (error) {
      logger.error('Fallback search error:', error);
      return [];
    }
  }

  /**
   * Enrich results with attributes
   * @param {Array} results - Search results
   * @returns {Promise<Array>} Enriched results
   */
  async enrichResults(results) {
    if (results.length === 0) {
      return results;
    }

    try {
      const listingIds = results.map(r => r.id);

      const attributesQuery = `
        SELECT
          lav.listing_id,
          la.slug,
          lav.value_number,
          lav.value_text,
          lav.unit_ar
        FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = ANY($1)
          AND la.slug IN ('price', 'area', 'rooms', 'bathrooms', 'year', 'mileage', 'brand', 'model')
      `;

      const attributesResult = await this.db.query(attributesQuery, [listingIds]);

      const attributesByListing = {};
      attributesResult.rows.forEach(attr => {
        if (!attributesByListing[attr.listing_id]) {
          attributesByListing[attr.listing_id] = {};
        }

        const value = attr.value_number !== null ? attr.value_number : attr.value_text;
        attributesByListing[attr.listing_id][attr.slug] = value;

        if (attr.slug === 'price') {
          attributesByListing[attr.listing_id].price = attr.value_number;
          attributesByListing[attr.listing_id].currency = attr.unit_ar || 'SYP';
        }
      });

      return results.map(listing => ({
        ...listing,
        price: attributesByListing[listing.id]?.price || null,
        currency: attributesByListing[listing.id]?.currency || 'SYP',
        attributes: attributesByListing[listing.id] || {}
      }));
    } catch (error) {
      logger.error('Result enrichment error:', error);
      return results;
    }
  }
}

// Singleton instance
module.exports = new TextSearch();
