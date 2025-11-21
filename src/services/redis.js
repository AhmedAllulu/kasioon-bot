const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  get isConnected() {
    return this._isConnected || false;
  }

  set isConnected(value) {
    this._isConnected = value;
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      console.log('🔌 Connecting to Redis:', redisUrl);
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.log('⚠️  Redis reconnection failed, giving up');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error', err);
        console.error('❌ Redis Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      console.error('❌ Redis connection failed:', error.message);
      // Don't throw - allow app to continue without Redis
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis Client Disconnected');
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }
}

module.exports = new RedisClient();

