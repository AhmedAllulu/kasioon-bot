const redisCache = require('../../config/redis');
const logger = require('../../utils/logger');
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.redis = redisCache;
    this.enabled = process.env.DISABLE_CACHE !== 'true';
  }

  /**
   * Generic get from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value
   */
  async get(key) {
    if (!this.enabled) return null;

    try {
      const cached = await this.redis.get(key);
      return cached;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Generic set to cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - TTL in seconds
   */
  async set(key, value, ttl = null) {
    if (!this.enabled) return;

    try {
      const cacheTTL = ttl || this.redis.getTTL('search');
      await this.redis.set(key, value, cacheTTL);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Get search results from cache
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object|null>} Cached results
   */
  async getSearchResults(searchParams) {
    if (!this.enabled) return null;

    try {
      const cacheKey = this.generateSearchKey(searchParams);
      const cached = await this.get(cacheKey);

      if (cached) {
        logger.debug('Search cache hit', { params: searchParams });
        return cached;
      }

      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set search results in cache
   * @param {Object} searchParams - Search parameters
   * @param {Object} results - Search results
   * @param {number} ttl - TTL in seconds
   */
  async setSearchResults(searchParams, results, ttl = null) {
    if (!this.enabled) return;

    try {
      const cacheKey = this.generateSearchKey(searchParams);
      await this.set(cacheKey, results, ttl);
      logger.debug('Search results cached', { params: searchParams, ttl });
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Get structure data (categories, cities) from cache
   * @param {string} type - Type of structure ('categories', 'cities', etc.)
   * @param {string} id - Optional ID
   * @returns {Promise<Object|null>} Cached data
   */
  async getStructure(type, id = null) {
    if (!this.enabled) return null;

    try {
      const cacheKey = id
        ? this.redis.generateKey('structure', type, id)
        : this.redis.generateKey('structure', type);

      const cached = await this.redis.get(cacheKey);

      if (cached) {
        logger.debug('Structure cache hit', { type, id });
        return cached;
      }

      return null;
    } catch (error) {
      logger.error('Structure cache get error:', error);
      return null;
    }
  }

  /**
   * Set structure data in cache
   * @param {string} type - Type of structure
   * @param {Object} data - Structure data
   * @param {string} id - Optional ID
   */
  async setStructure(type, data, id = null) {
    if (!this.enabled) return;

    try {
      const cacheKey = id
        ? this.redis.generateKey('structure', type, id)
        : this.redis.generateKey('structure', type);

      const ttl = this.redis.getTTL('structure');
      await this.redis.set(cacheKey, data, ttl);

      logger.debug('Structure cached', { type, id });
    } catch (error) {
      logger.error('Structure cache set error:', error);
    }
  }

  /**
   * Invalidate search cache
   * @param {Object} params - Optional params to invalidate specific searches
   */
  async invalidateSearchCache(params = null) {
    if (!this.enabled) return;

    try {
      if (params) {
        const cacheKey = this.generateSearchKey(params);
        await this.redis.del(cacheKey);
      } else {
        await this.redis.flushPattern('search:*');
      }

      logger.info('Search cache invalidated', { params });
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  /**
   * Invalidate structure cache
   * @param {string} type - Type to invalidate
   */
  async invalidateStructure(type = null) {
    if (!this.enabled) return;

    try {
      const pattern = type
        ? `structure:${type}:*`
        : 'structure:*';

      await this.redis.flushPattern(pattern);
      logger.info('Structure cache invalidated', { type });
    } catch (error) {
      logger.error('Structure cache invalidation error:', error);
    }
  }

  /**
   * Generate cache key for search
   * @param {Object} params - Search parameters
   * @returns {string} Cache key
   */
  generateSearchKey(params) {
    // Create deterministic hash of search params
    const normalized = this.normalizeSearchParams(params);
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(normalized))
      .digest('hex');

    return this.redis.generateKey('search', hash);
  }

  /**
   * Normalize search params for consistent caching
   * @param {Object} params - Search parameters
   * @returns {Object} Normalized params
   */
  normalizeSearchParams(params) {
    const normalized = {
      query: params.query?.toLowerCase().trim() || '',
      categoryId: params.categoryId || null,
      cityId: params.cityId || null,
      neighborhoodId: params.neighborhoodId || null,
      transactionTypeId: params.transactionTypeId || null,
      page: params.page || 1,
      limit: params.limit || 10,
      language: params.language || 'ar'
    };

    // Add filters if present
    if (params.filters) {
      normalized.filters = params.filters;
    }

    // Sort object keys for consistent hashing
    return Object.keys(normalized)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalized[key];
        return acc;
      }, {});
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    if (!this.enabled || !this.redis.isConnected) {
      return { enabled: false };
    }

    try {
      const info = await this.redis.client.info('stats');
      const lines = info.split('\r\n');
      const stats = {};

      lines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return {
        enabled: true,
        connected: this.redis.isConnected,
        ...stats
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return { enabled: true, connected: false, error: error.message };
    }
  }
}

// Singleton instance
module.exports = new CacheService();
