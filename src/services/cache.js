const RedisClient = require('./redis');
const logger = require('../utils/logger');

// Allow disabling all caching via environment variable
const CACHE_DISABLED = process.env.DISABLE_CACHE === 'true';

if (CACHE_DISABLED) {
  logger.warn('[CACHE] Caching is disabled via DISABLE_CACHE=true');
}

class CacheService {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<string|null>} Cached value
   */
  async get(key) {
    try {
      if (CACHE_DISABLED || !RedisClient.isConnected) {
        return null;
      }
      const client = RedisClient.getClient();
      return await client.get(key);
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {string} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 3600) {
    try {
      if (CACHE_DISABLED || !RedisClient.isConnected) {
        return false;
      }
      const client = RedisClient.getClient();
      await client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      if (CACHE_DISABLED) return false;
      const client = RedisClient.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Existence status
   */
  async exists(key) {
    try {
      if (CACHE_DISABLED) return false;
      const client = RedisClient.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();

