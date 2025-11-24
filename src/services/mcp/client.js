/**
 * MCP Client Wrapper for Qasioun Marketplace
 *
 * Provides a high-level interface for interacting with the PostgreSQL database
 * using the query builder patterns.
 */

const { Pool } = require('pg');
const queryBuilder = require('./queryBuilder');
const logger = require('../../utils/logger');

class MCPClient {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.initialize();
  }

  /**
   * Initialize database connection pool
   */
  initialize() {
    const connectionString = process.env.MCP_DATABASE_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      console.warn('⚠️ [MCP-CLIENT] No database connection string configured');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        // SSL configuration for production
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false
      });

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('❌ [MCP-CLIENT] Unexpected pool error:', err.message);
        logger.error('Database pool error:', err);
      });

      // Test connection
      this.testConnection();

    } catch (error) {
      console.error('❌ [MCP-CLIENT] Failed to initialize pool:', error.message);
      logger.error('Database initialization error:', error);
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW() as current_time');
      this.isConnected = true;
      console.log('✅ [MCP-CLIENT] Database connected:', result.rows[0].current_time);
    } catch (error) {
      this.isConnected = false;
      console.error('❌ [MCP-CLIENT] Connection test failed:', error.message);
    }
  }

  /**
   * Execute a raw query
   */
  async query(sql, params = []) {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
      const startTime = Date.now();
      const result = await this.pool.query(sql, params);
      const duration = Date.now() - startTime;

      console.log(`🔍 [MCP-CLIENT] Query executed in ${duration}ms, rows: ${result.rowCount}`);

      return result;
    } catch (error) {
      console.error('❌ [MCP-CLIENT] Query error:', error.message);
      throw error;
    }
  }

  /**
   * Search listings with filters
   */
  async searchListings(filters = {}) {
    const { query, params } = queryBuilder.buildSearchQuery(filters);

    try {
      const result = await this.query(query, params);
      const listings = queryBuilder.formatListingsWithUrls(result.rows);

      return {
        success: true,
        listings,
        count: listings.length,
        filters
      };
    } catch (error) {
      console.error('❌ [MCP-CLIENT] Search listings error:', error.message);
      return {
        success: false,
        error: error.message,
        listings: [],
        count: 0
      };
    }
  }

  /**
   * Get leaf categories (user must select these)
   */
  async getLeafCategories(parentSlug = null) {
    const { query, params } = queryBuilder.buildLeafCategoriesQuery(parentSlug);

    try {
      const result = await this.query(query, params);
      return {
        success: true,
        categories: result.rows,
        count: result.rows.length
      };
    } catch (error) {
      console.error('❌ [MCP-CLIENT] Get leaf categories error:', error.message);
      return {
        success: false,
        error: error.message,
        categories: [],
        count: 0
      };
    }
  }

  /**
   * Find category by keywords
   */
  async findCategory(keywords) {
    const { query, params } = queryBuilder.buildCategorySearchQuery(keywords);

    try {
      const result = await this.query(query, params);

      // Find the best leaf category match
      const leafCategories = result.rows.filter(c => c.is_leaf);
      const bestMatch = leafCategories.length > 0 ? leafCategories[0] : result.rows[0];

      return {
        success: true,
        categories: result.rows,
        bestMatch,
        suggestion: bestMatch ?
          `Use category: "${bestMatch.slug}" (${bestMatch.name_ar})` :
          'No matching category found'
      };
    } catch (error) {
      console.error('❌ [MCP-CLIENT] Find category error:', error.message);
      return {
        success: false,
        error: error.message,
        categories: [],
        bestMatch: null
      };
    }
  }

  /**
   * Get category path (hierarchy)
   */
  async getCategoryPath(categoryId) {
    const { query, params } = queryBuilder.buildCategoryPathQuery(categoryId);

    try {
      const result = await this.query(query, params);
      return {
        success: true,
        path: result.rows
      };
    } catch (error) {
      console.error('❌ [MCP-CLIENT] Get category path error:', error.message);
      return {
        success: false,
        error: error.message,
        path: []
      };
    }
  }

  /**
   * Get listing details with attributes
   */
  async getListingDetails(listingIdOrSlug) {
    // First, get the listing
    const listingQuery = `
      SELECT
        l.*,
        c.name_ar as category_name,
        c.slug as category_slug,
        ct.name_ar as city_name,
        ct.province_ar as province,
        tt.name_ar as transaction_type
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN cities ct ON l.city_id = ct.id
      LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
      WHERE l.status = 'active'
        AND (l.id::text = $1 OR l.slug = $1)
    `;

    try {
      const listingResult = await this.query(listingQuery, [listingIdOrSlug]);

      if (listingResult.rows.length === 0) {
        return {
          success: false,
          error: 'Listing not found',
          listing: null
        };
      }

      const listing = listingResult.rows[0];

      // Get attributes
      const { query: attrQuery, params: attrParams } = queryBuilder.buildListingAttributesQuery(listing.id);
      const attrResult = await this.query(attrQuery, attrParams);

      listing.attributes = attrResult.rows;
      listing.listing_url = `${queryBuilder.websiteUrl}/listing/${listing.slug || listing.id}`;

      return {
        success: true,
        listing
      };
    } catch (error) {
      console.error('❌ [MCP-CLIENT] Get listing details error:', error.message);
      return {
        success: false,
        error: error.message,
        listing: null
      };
    }
  }

  /**
   * Search cities
   */
  async searchCities(searchTerm = null) {
    const { query, params } = queryBuilder.buildCitySearchQuery(searchTerm);

    try {
      const result = await this.query(query, params);
      return {
        success: true,
        cities: result.rows,
        count: result.rows.length
      };
    } catch (error) {
      console.error('❌ [MCP-CLIENT] Search cities error:', error.message);
      return {
        success: false,
        error: error.message,
        cities: [],
        count: 0
      };
    }
  }

  /**
   * Get category listing counts
   */
  async getCategoryCounts() {
    const { query, params } = queryBuilder.buildCategoryCountsQuery();

    try {
      const result = await this.query(query, params);
      return {
        success: true,
        counts: result.rows
      };
    } catch (error) {
      console.error('❌ [MCP-CLIENT] Get category counts error:', error.message);
      return {
        success: false,
        error: error.message,
        counts: []
      };
    }
  }

  /**
   * Close database connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('🔌 [MCP-CLIENT] Database connection pool closed');
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as healthy');
      return {
        healthy: true,
        connected: this.isConnected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
module.exports = new MCPClient();
