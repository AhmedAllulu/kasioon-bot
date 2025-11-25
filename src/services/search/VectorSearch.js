const database = require('../../config/database');
const openAIService = require('../ai/OpenAIService');
const FilterBuilder = require('./FilterBuilder');
const logger = require('../../utils/logger');

/**
 * Vector Search Service
 * Performs semantic search using embeddings
 */
class VectorSearch {
  constructor() {
    this.db = database;
    this.ai = openAIService;
  }

  /**
   * Search listings using vector similarity
   * @param {string} query - Search query
   * @param {Object} searchParams - Search parameters
   * @param {number} limit - Result limit
   * @returns {Promise<Array>} Search results
   */
  async search(query, searchParams = {}, limit = 20) {
    try {
      logger.debug('Vector search started', { query: query.substring(0, 50), limit });

      // Generate embedding for the query
      const embedding = await this.ai.createEmbedding(query);
      const embeddingStr = `[${embedding.join(',')}]`;

      // Build filters
      const { whereClause, params } = FilterBuilder.build(searchParams);

      // Determine embedding column based on language
      const embeddingColumn = searchParams.language === 'en' ? 'embedding_en' : 'embedding_ar';

      // Build vector search query
      const searchQuery = `
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
          (
            SELECT jsonb_object_agg(la.slug, lav.value_text)
            FROM listing_attribute_values lav
            JOIN listing_attributes la ON lav.attribute_id = la.id
            WHERE lav.listing_id = l.id AND lav.value_text IS NOT NULL
          ) as attributes,
          1 - (le.${embeddingColumn} <=> $${params.length + 1}::vector) as similarity_score
        FROM listings l
        JOIN listing_embeddings le ON l.id = le.listing_id
        JOIN categories c ON l.category_id = c.id
        JOIN cities ct ON l.city_id = ct.id
        LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
        LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
        WHERE ${whereClause}
          AND le.${embeddingColumn} IS NOT NULL
        ORDER BY
          similarity_score DESC,
          l.is_boosted DESC,
          l.priority DESC,
          l.created_at DESC
        LIMIT $${params.length + 2}
      `;

      const result = await this.db.query(searchQuery, [...params, embeddingStr, limit]);

      logger.info('Vector search completed', {
        query: query.substring(0, 50),
        results: result.rows.length,
        avgSimilarity: this.calculateAvgSimilarity(result.rows)
      });

      // Enrich results with price data
      return await this.enrichResults(result.rows);
    } catch (error) {
      logger.error('Vector search error:', error);
      throw error;
    }
  }

  /**
   * Enrich results with price and other numeric attributes
   * @param {Array} results - Search results
   * @returns {Promise<Array>} Enriched results
   */
  async enrichResults(results) {
    if (results.length === 0) {
      return results;
    }

    try {
      const listingIds = results.map(r => r.id);

      // Get price and other important numeric attributes
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
          AND (
            la.slug IN ('price', 'area', 'rooms', 'bathrooms', 'year', 'mileage', 'brand', 'model')
            OR lav.value_number IS NOT NULL
          )
      `;

      const attributesResult = await this.db.query(attributesQuery, [listingIds]);

      // Group attributes by listing
      const attributesByListing = {};
      attributesResult.rows.forEach(attr => {
        if (!attributesByListing[attr.listing_id]) {
          attributesByListing[attr.listing_id] = {};
        }

        const value = attr.value_number !== null ? attr.value_number : attr.value_text;
        attributesByListing[attr.listing_id][attr.slug] = value;

        // Store price and currency separately
        if (attr.slug === 'price') {
          attributesByListing[attr.listing_id].price = attr.value_number;
          attributesByListing[attr.listing_id].currency = attr.unit_ar || 'SYP';
        }
      });

      // Merge attributes into results
      return results.map(listing => ({
        ...listing,
        price: attributesByListing[listing.id]?.price || null,
        currency: attributesByListing[listing.id]?.currency || 'SYP',
        attributes: {
          ...(listing.attributes || {}),
          ...(attributesByListing[listing.id] || {})
        }
      }));
    } catch (error) {
      logger.error('Result enrichment error:', error);
      return results; // Return unenriched results on error
    }
  }

  /**
   * Calculate average similarity score
   * @param {Array} results - Results with similarity_score
   * @returns {number} Average similarity
   */
  calculateAvgSimilarity(results) {
    if (results.length === 0) return 0;

    const sum = results.reduce((acc, r) => acc + (r.similarity_score || 0), 0);
    return (sum / results.length).toFixed(3);
  }

  /**
   * Check if vector search is available
   * @returns {Promise<boolean>} Availability
   */
  async isAvailable() {
    try {
      const result = await this.db.query(
        `SELECT EXISTS (
          SELECT 1 FROM listing_embeddings
          WHERE embedding_ar IS NOT NULL
          LIMIT 1
        ) as available`
      );

      return result.rows[0]?.available || false;
    } catch (error) {
      logger.error('Vector search availability check failed:', error);
      return false;
    }
  }
}

// Singleton instance
module.exports = new VectorSearch();
