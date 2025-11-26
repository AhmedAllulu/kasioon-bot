const { Pool } = require('pg');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      const connectionString = process.env.MCP_DATABASE_URL;

      if (!connectionString) {
        throw new Error('MCP_DATABASE_URL is not defined in environment variables');
      }

      logger.info('🔌 Connecting to PostgreSQL database...');

      this.pool = new Pool({
        connectionString,
        min: parseInt(process.env.DB_POOL_MIN || '5'),
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: false,
        application_name: 'kasioon-mcp-search'
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.success('PostgreSQL connection pool established', {
        min: process.env.DB_POOL_MIN || '5',
        max: process.env.DB_POOL_MAX || '20'
      });

      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.dbError('Unexpected error on idle PostgreSQL client', err);
      });

      return this.pool;
    } catch (error) {
      logger.failure('Failed to connect to PostgreSQL', { error: error.message });
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      logger.dbQuery('Executing query', {
        preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });

      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        logger.performance('Database query', duration, {
          query: text.substring(0, 100),
          rowCount: result.rowCount
        });
      } else if (duration > 500) {
        logger.debug(`⚠️  Moderate query time: ${duration}ms`, {
          query: text.substring(0, 100)
        });
      }

      logger.debug(`✓ Query completed: ${result.rowCount} rows in ${duration}ms`);

      return result;
    } catch (error) {
      logger.dbError('Query execution failed', error, text);
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('PostgreSQL connection pool closed');
    }
  }

  isConnected() {
    return this.pool !== null && this.pool.totalCount > 0;
  }
}

// Singleton instance
const database = new Database();

module.exports = database;
