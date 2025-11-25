const queryParser = require('./QueryParser');
const logger = require('../../utils/logger');

/**
 * MCP Agent - Main orchestrator for natural language query processing
 * Coordinates all MCP components to parse and understand user queries
 */
class MCPAgent {
  constructor() {
    this.parser = queryParser;
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
    const startTime = Date.now();

    try {
      const {
        language = 'ar',
        source = 'unknown',
        userId = null
      } = options;

      logger.info('MCP Agent processing query', {
        query: query.substring(0, 100),
        language,
        source,
        userId
      });

      // Validate input
      if (!query || typeof query !== 'string') {
        throw new Error('Query must be a non-empty string');
      }

      if (query.trim().length < 2) {
        throw new Error('Query is too short');
      }

      if (query.length > 500) {
        throw new Error('Query is too long (max 500 characters)');
      }

      // Parse the query
      const parsed = await this.parser.parse(query, language);

      // Validate parsed result
      if (!this.parser.validate(parsed)) {
        logger.warn('Parsed query validation failed', { query, parsed });
        throw new Error('Could not understand the query. Please be more specific.');
      }

      // Add metadata
      parsed.metadata = {
        source,
        userId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      logger.info('MCP Agent processing complete', {
        query: query.substring(0, 50),
        duration: parsed.metadata.processingTime,
        confidence: parsed.confidence,
        categoryFound: !!parsed.category,
        locationFound: !!parsed.location
      });

      return parsed;
    } catch (error) {
      logger.error('MCP Agent processing error:', {
        error: error.message,
        query: query?.substring(0, 50)
      });
      throw error;
    }
  }

  /**
   * Analyze query without performing search
   * Useful for the /api/analyze endpoint
   * @param {string} query - User query
   * @param {string} language - Language
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeQuery(query, language = 'ar') {
    try {
      logger.info('Analyzing query', { query: query.substring(0, 50), language });

      const parsed = await this.parser.parse(query, language);

      return {
        intent: 'search',
        originalQuery: query,
        normalizedQuery: parsed.normalized,
        language: parsed.language,
        category: parsed.category,
        location: parsed.location,
        transactionType: parsed.transactionType,
        attributes: parsed.attributes,
        keywords: parsed.keywords,
        confidence: parsed.confidence,
        suggestions: this.generateSuggestions(parsed)
      };
    } catch (error) {
      logger.error('Query analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate search suggestions based on parsed query
   * @param {Object} parsed - Parsed query
   * @returns {Array<string>} Suggestions
   */
  generateSuggestions(parsed) {
    const suggestions = [];

    // If no category, suggest popular categories
    if (!parsed.category) {
      suggestions.push('سيارات', 'شقق', 'هواتف');
    }

    // If no location, suggest major cities
    if (!parsed.location) {
      suggestions.push('في دمشق', 'في حلب', 'في حمص');
    }

    // If has category and location, suggest refinements
    if (parsed.category && parsed.location) {
      const category = parsed.category.name;
      const location = parsed.location.name;

      if (!parsed.transactionType || parsed.transactionType.slug === 'sale') {
        suggestions.push(`${category} للإيجار في ${location}`);
      }

      if (Object.keys(parsed.attributes || {}).length === 0) {
        // Suggest common attributes based on category
        if (parsed.category.slug.includes('car')) {
          suggestions.push(`${category} جديد في ${location}`);
          suggestions.push(`${category} موديل 2020 في ${location}`);
        } else if (parsed.category.slug.includes('apartment')) {
          suggestions.push(`${category} غرفتين في ${location}`);
          suggestions.push(`${category} 100 متر في ${location}`);
        }
      }
    }

    return suggestions.slice(0, 3);
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
   * Health check for MCP Agent
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      // Test a simple query
      const testQuery = 'سيارة في دمشق';
      const parsed = await this.parser.parse(testQuery, 'ar');

      return {
        status: 'healthy',
        components: {
          parser: 'operational',
          categoryMatcher: parsed.category ? 'operational' : 'warning',
          locationResolver: parsed.location ? 'operational' : 'warning'
        }
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
