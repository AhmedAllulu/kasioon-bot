const { Pool } = require('pg');
const logger = require('../../utils/logger');

/**
 * Direct PostgreSQL Database Connection Pool
 * Replaces ALL API calls with direct database queries
 *
 * Performance Target: < 200ms response time
 * Zero external API dependencies
 */

class DatabaseConnection {
  constructor() {
    // Get database URL from environment (supports both n8n and estate databases)
    const databaseUrl = process.env.MCP_DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('Database URL not configured. Set MCP_DATABASE_URL or DATABASE_URL in .env');
    }

    // Create connection pool with optimized settings
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30s
      connectionTimeoutMillis: 5000, // 5s timeout for connections
      maxUses: 7500, // Close and replace connections after 7500 queries
      // Enable native bindings for better performance (if available)
      // native: true,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error:', err);
    });

    // Connection success log
    this.pool.on('connect', () => {
      logger.info('✅ Database connection established');
    });

    console.log('🗄️  [DB] PostgreSQL connection pool initialized:', {
      databaseUrl: databaseUrl.replace(/:[^:@]+@/, ':****@'), // Hide password
      maxConnections: 20,
      idleTimeout: '30s',
      connectionTimeout: '5s'
    });
  }

  /**
   * Execute a query with performance tracking
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @param {string} queryName - Query name for logging
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = [], queryName = 'query') {
    const start = Date.now();

    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      // Log slow queries (> 100ms)
      if (duration > 100) {
        logger.warn(`⚠️  Slow query detected: ${queryName} took ${duration}ms`);
      } else {
        logger.debug(`✅ ${queryName}: ${duration}ms, ${result.rowCount} rows`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`❌ Database query error [${queryName}] after ${duration}ms:`, {
        error: error.message,
        query: text.substring(0, 200),
        params: params
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database connection health
   * @returns {Promise<boolean>} Connection status
   */
  async healthCheck() {
    try {
      const result = await this.pool.query('SELECT NOW() as current_time');
      logger.info('Database health check passed:', result.rows[0].current_time);
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get pool statistics
   * @returns {Object} Pool statistics
   */
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  async close() {
    logger.info('Closing database connection pool...');
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

// Export singleton instance
module.exports = new DatabaseConnection();
