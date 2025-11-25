const smartParser = require('./SmartQueryParser');
const logger = require('../../utils/logger');

/**
 * MCP Agent - Main orchestrator for natural language query processing
 * Uses SmartQueryParser with tiered approach (Database → Semantic Cache → AI)
 */
class MCPAgent {
  constructor() {
    this.parser = smartParser;
    this.initialized = false;
  }

  /**
   * Initialize MCP Agent
   */
  async initialize() {
    if (this.initialized) return;
    await this.parser.initialize();
    this.initialized = true;
    logger.info('MCPAgent initialized with SmartQueryParser');
  }

  /**
   * Process natural language query
   * @param {string} query - User query
   * @param {Object} options - Options
   * @param {string} options.language - Language ('ar' or 'en')
   * @param {string} options.source - Source (telegram, whatsapp, website, app)
   * @param {string} options.userId - User ID (optional)
   * @returns {Promise<Object>} Parsed query
   */
  async processQuery(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      language = 'ar',
      source = 'unknown',
      userId = null
    } = options;

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      throw new Error('Query must be at least 2 characters');
    }

    if (query.length > 500) {
      throw new Error('Query too long (max 500 characters)');
    }

    // Parse the query using tiered approach
    const result = await this.parser.parse(query, language);

    // Validate parsed result
    if (!this.parser.validate(result)) {
      logger.warn('Parsed query validation failed', { query: query.substring(0, 50) });
      throw new Error('Could not understand the query. Please be more specific.');
    }

    // Add metadata
    result.metadata = {
      source,
      userId,
      timestamp: new Date().toISOString()
    };

    logger.info('Query processed', {
      query: query.substring(0, 50),
      tier: result.tier,
      confidence: result.confidence,
      duration: result.processingTime,
      aiTokens: result.aiTokens || 0,
      category: result.category?.slug,
      location: result.location?.name
    });

    return result;
  }

  /**
   * Analyze query without performing search
   * Useful for the /api/analyze endpoint
   * @param {string} query - User query
   * @param {string} language - Language
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeQuery(query, language = 'ar') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      logger.info('Analyzing query', { query: query.substring(0, 50), language });

      const parsed = await this.parser.parse(query, language);

      return {
        intent: 'search',
        originalQuery: query,
        normalizedQuery: parsed.normalized,
        language: parsed.language,
        tier: parsed.tier,
        category: parsed.category,
        location: parsed.location,
        transactionType: parsed.transactionType,
        attributes: parsed.attributes,
        keywords: parsed.keywords,
        confidence: parsed.confidence,
        method: parsed.method,
        processingTime: parsed.processingTime
      };
    } catch (error) {
      logger.error('Query analysis error:', error);
      throw error;
    }
  }

  /**
   * Convert parsed query to search parameters
   * @param {Object} parsed - Parsed query
   * @returns {Object} Search parameters
   */
  toSearchParams(parsed) {
    return this.parser.toSearchParams(parsed);
  }

  /**
   * Get parser statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return this.parser.getStats();
  }

  /**
   * Health check for MCP Agent
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Test a simple query
      const testQuery = 'سيارة في دمشق';
      const parsed = await this.parser.parse(testQuery, 'ar');

      return {
        status: 'healthy',
        initialized: this.initialized,
        components: {
          smartParser: 'operational',
          databaseMatcher: 'operational',
          categoryMatch: parsed.category ? 'operational' : 'warning',
          locationMatch: parsed.location ? 'operational' : 'warning'
        },
        stats: this.getStats()
      };
    } catch (error) {
      logger.error('MCP Agent health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// Singleton instance
module.exports = new MCPAgent();
