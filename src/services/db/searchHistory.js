const { Pool } = require('pg');
const logger = require('../../utils/logger');
const crypto = require('crypto');

/**
 * Search History Service
 * Manages user search history, preferences, and popular searches in PostgreSQL
 */
class SearchHistoryService {
  constructor() {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error:', err);
    });

    // Initialize database tables
    this.initializeTable();
  }

  /**
   * Initialize database tables for search history
   */
  async initializeTable() {
    const createTablesQuery = `
      -- Search history table
      CREATE TABLE IF NOT EXISTS search_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        platform VARCHAR(20) NOT NULL DEFAULT 'telegram',
        query_text TEXT NOT NULL,
        extracted_params JSONB,
        results_count INTEGER DEFAULT 0,
        response_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- For analytics
        category VARCHAR(100),
        city VARCHAR(100),
        language VARCHAR(5) DEFAULT 'ar'
      );

      -- Index for user queries
      CREATE INDEX IF NOT EXISTS idx_search_history_user
        ON search_history(user_id, created_at DESC);

      -- Index for category analytics
      CREATE INDEX IF NOT EXISTS idx_search_history_category
        ON search_history(category);

      -- Index for city analytics
      CREATE INDEX IF NOT EXISTS idx_search_history_city
        ON search_history(city);

      -- User preferences table
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id VARCHAR(50) PRIMARY KEY,
        platform VARCHAR(20) NOT NULL DEFAULT 'telegram',
        preferred_language VARCHAR(5) DEFAULT 'ar',
        preferred_city VARCHAR(100),
        preferred_categories JSONB DEFAULT '[]',
        search_count INTEGER DEFAULT 0,
        last_search_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Popular searches table with caching
      CREATE TABLE IF NOT EXISTS popular_searches (
        id SERIAL PRIMARY KEY,
        query_hash VARCHAR(64) NOT NULL UNIQUE,
        query_text TEXT NOT NULL,
        category VARCHAR(100),
        city VARCHAR(100),
        search_count INTEGER DEFAULT 1,
        last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cached_results JSONB,
        cache_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Index for popular searches
      CREATE INDEX IF NOT EXISTS idx_popular_searches_count
        ON popular_searches(search_count DESC);

      -- Index for trending searches (recent + popular)
      CREATE INDEX IF NOT EXISTS idx_popular_searches_trending
        ON popular_searches(last_searched_at DESC, search_count DESC);
    `;

    try {
      await this.pool.query(createTablesQuery);
      logger.info('✅ Search history database tables initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize search history tables:', error);
      // Don't throw - allow bot to continue without database
    }
  }

  /**
   * Log a search to history
   * @param {Object} data - Search data
   * @param {string} data.userId - User ID
   * @param {string} data.platform - Platform (telegram/whatsapp)
   * @param {string} data.queryText - User's query text
   * @param {Object} data.extractedParams - AI-extracted parameters
   * @param {number} data.resultsCount - Number of results found
   * @param {number} data.responseTimeMs - Response time in milliseconds
   * @param {string} data.category - Category slug
   * @param {string} data.city - City name
   * @param {string} data.language - Language code (ar/en)
   */
  async logSearch(data) {
    const {
      userId,
      platform = 'telegram',
      queryText,
      extractedParams,
      resultsCount,
      responseTimeMs,
      category,
      city,
      language = 'ar'
    } = data;

    try {
      // Insert search record
      await this.pool.query(`
        INSERT INTO search_history
        (user_id, platform, query_text, extracted_params, results_count,
         response_time_ms, category, city, language)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        userId,
        platform,
        queryText,
        JSON.stringify(extractedParams),
        resultsCount,
        responseTimeMs,
        category,
        city,
        language
      ]);

      // Update user preferences asynchronously
      this.updateUserPreferences(userId, platform, { category, city, language }).catch(err => {
        logger.error('Error updating user preferences:', err);
      });

      // Update popular searches asynchronously
      this.updatePopularSearch(queryText, category, city).catch(err => {
        logger.error('Error updating popular search:', err);
      });

      logger.debug('Search logged to database:', { userId, queryText, resultsCount });

    } catch (error) {
      logger.error('Failed to log search:', error);
      // Don't throw - allow search to continue even if logging fails
    }
  }

  /**
   * Update user preferences based on search behavior
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @param {Object} searchData - Search data (category, city, language)
   */
  async updateUserPreferences(userId, platform, searchData) {
    try {
      await this.pool.query(`
        INSERT INTO user_preferences (user_id, platform, preferred_language,
                                      preferred_city, search_count, last_search_at)
        VALUES ($1, $2, $3, $4, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          preferred_language = COALESCE($3, user_preferences.preferred_language),
          preferred_city = COALESCE($4, user_preferences.preferred_city),
          search_count = user_preferences.search_count + 1,
          last_search_at = NOW(),
          updated_at = NOW()
      `, [userId, platform, searchData.language, searchData.city]);
    } catch (error) {
      logger.error('Failed to update user preferences:', error);
    }
  }

  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User preferences or null
   */
  async getUserPreferences(userId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      return null;
    }
  }

  /**
   * Update popular searches table
   * @param {string} queryText - Query text
   * @param {string} category - Category slug
   * @param {string} city - City name
   */
  async updatePopularSearch(queryText, category, city) {
    const queryHash = this.hashQuery(queryText);

    try {
      await this.pool.query(`
        INSERT INTO popular_searches (query_hash, query_text, category, city)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (query_hash) DO UPDATE SET
          search_count = popular_searches.search_count + 1,
          last_searched_at = NOW()
      `, [queryHash, queryText, category, city]);
    } catch (error) {
      logger.error('Failed to update popular search:', error);
    }
  }

  /**
   * Get cached results for a popular search
   * @param {string} queryText - Query text
   * @returns {Promise<Array|null>} Cached results or null
   */
  async getCachedResults(queryText) {
    const queryHash = this.hashQuery(queryText);

    try {
      const result = await this.pool.query(`
        SELECT cached_results, cache_expires_at
        FROM popular_searches
        WHERE query_hash = $1
          AND cached_results IS NOT NULL
          AND cache_expires_at > NOW()
      `, [queryHash]);

      if (result.rows[0]) {
        logger.info('✅ Found cached results for query');
        return result.rows[0].cached_results;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get cached results:', error);
      return null;
    }
  }

  /**
   * Cache results for a popular search
   * @param {string} queryText - Query text
   * @param {Array} results - Search results to cache
   * @param {number} ttlMinutes - Cache TTL in minutes (default 15)
   */
  async cacheResults(queryText, results, ttlMinutes = 15) {
    const queryHash = this.hashQuery(queryText);

    try {
      await this.pool.query(`
        UPDATE popular_searches
        SET cached_results = $2,
            cache_expires_at = NOW() + INTERVAL '${ttlMinutes} minutes'
        WHERE query_hash = $1
      `, [queryHash, JSON.stringify(results)]);

      logger.debug('Results cached for query:', { queryText, ttlMinutes });
    } catch (error) {
      logger.error('Failed to cache results:', error);
    }
  }

  /**
   * Get user's recent searches
   * @param {string} userId - User ID
   * @param {number} limit - Number of searches to return (default 5)
   * @returns {Promise<Array>} Recent searches
   */
  async getRecentSearches(userId, limit = 5) {
    try {
      const result = await this.pool.query(`
        SELECT query_text, category, city, results_count, created_at
        FROM search_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get recent searches:', error);
      return [];
    }
  }

  /**
   * Get trending searches (popular in last 24 hours)
   * @param {number} limit - Number of searches to return (default 10)
   * @returns {Promise<Array>} Trending searches
   */
  async getTrendingSearches(limit = 10) {
    try {
      const result = await this.pool.query(`
        SELECT query_text, category, city, search_count
        FROM popular_searches
        WHERE last_searched_at > NOW() - INTERVAL '24 hours'
        ORDER BY search_count DESC, last_searched_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get trending searches:', error);
      return [];
    }
  }

  /**
   * Get top searches by category
   * @param {string} category - Category slug
   * @param {number} limit - Number of searches to return
   * @returns {Promise<Array>} Top searches
   */
  async getTopSearchesByCategory(category, limit = 5) {
    try {
      const result = await this.pool.query(`
        SELECT query_text, search_count
        FROM popular_searches
        WHERE category = $1
        ORDER BY search_count DESC
        LIMIT $2
      `, [category, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get top searches by category:', error);
      return [];
    }
  }

  /**
   * Get search analytics for admin dashboard
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics() {
    try {
      const [
        totalSearches,
        uniqueUsers,
        topCategories,
        topCities,
        avgResponseTime
      ] = await Promise.all([
        // Total searches today
        this.pool.query(`
          SELECT COUNT(*) as count
          FROM search_history
          WHERE created_at > CURRENT_DATE
        `),

        // Unique users today
        this.pool.query(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM search_history
          WHERE created_at > CURRENT_DATE
        `),

        // Top categories
        this.pool.query(`
          SELECT category, COUNT(*) as count
          FROM search_history
          WHERE created_at > CURRENT_DATE AND category IS NOT NULL
          GROUP BY category
          ORDER BY count DESC
          LIMIT 5
        `),

        // Top cities
        this.pool.query(`
          SELECT city, COUNT(*) as count
          FROM search_history
          WHERE created_at > CURRENT_DATE AND city IS NOT NULL
          GROUP BY city
          ORDER BY count DESC
          LIMIT 5
        `),

        // Average response time
        this.pool.query(`
          SELECT AVG(response_time_ms) as avg_time
          FROM search_history
          WHERE created_at > CURRENT_DATE AND response_time_ms IS NOT NULL
        `)
      ]);

      return {
        totalSearchesToday: parseInt(totalSearches.rows[0].count),
        uniqueUsersToday: parseInt(uniqueUsers.rows[0].count),
        topCategories: topCategories.rows,
        topCities: topCities.rows,
        avgResponseTimeMs: Math.round(avgResponseTime.rows[0].avg_time || 0)
      };
    } catch (error) {
      logger.error('Failed to get analytics:', error);
      return null;
    }
  }

  /**
   * Create SHA256 hash of query for deduplication
   * @param {string} query - Query text
   * @returns {string} Hash string
   */
  hashQuery(query) {
    return crypto
      .createHash('sha256')
      .update(query.toLowerCase().trim())
      .digest('hex');
  }

  /**
   * Clean up old search history (retention policy)
   * @param {number} daysToKeep - Number of days to keep (default 90)
   */
  async cleanupOldHistory(daysToKeep = 90) {
    try {
      const result = await this.pool.query(`
        DELETE FROM search_history
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `);

      logger.info(`Cleaned up ${result.rowCount} old search history records`);
    } catch (error) {
      logger.error('Failed to cleanup old history:', error);
    }
  }

  /**
   * Close database connection pool
   */
  async close() {
    await this.pool.end();
    logger.info('Database pool closed');
  }
}

module.exports = new SearchHistoryService();
