const { createClient } = require('redis');
const logger = require('../utils/logger');

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.cacheEnabled = process.env.DISABLE_CACHE !== 'true';
  }

  async connect() {
    if (!this.cacheEnabled) {
      logger.info('Redis cache is disabled');
      return null;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 50, 500);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      await this.client.connect();

      // Test connection
      await this.client.ping();

      logger.info('Redis connection established');
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.cacheEnabled = false;
      return null;
    }
  }

  async get(key) {
    if (!this.cacheEnabled || !this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.cacheEnabled || !this.isConnected) {
      return false;
    }

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    if (!this.cacheEnabled || !this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    if (!this.cacheEnabled || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async flushPattern(pattern) {
    if (!this.cacheEnabled || !this.isConnected) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error(`Redis FLUSH PATTERN error for ${pattern}:`, error);
      return false;
    }
  }

  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      logger.info('Redis connection closed');
    }
  }

  generateKey(...parts) {
    return parts.filter(Boolean).join(':');
  }

  getTTL(type) {
    const ttls = {
      search: parseInt(process.env.SEARCH_CACHE_TTL || '300'),
      structure: parseInt(process.env.STRUCTURE_CACHE_TTL || '1800'),
      ai: parseInt(process.env.AI_RESPONSE_CACHE_TTL || '3600'),
      popular: parseInt(process.env.POPULAR_SEARCH_CACHE_TTL || '900')
    };
    return ttls[type] || 300;
  }
}

// Singleton instance
const redisCache = new RedisCache();

module.exports = redisCache;
