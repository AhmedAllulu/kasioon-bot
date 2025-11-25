const mcpAgent = require('../mcp/MCPAgent');
const vectorSearch = require('./VectorSearch');
const textSearch = require('./TextSearch');
const cacheService = require('../cache/CacheService');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

/**
 * Search Service - Main orchestrator for all search operations
 * Coordinates MCP Agent, Vector Search, Text Search, and result formatting
 */
class SearchService {
  constructor() {
    this.mcp = mcpAgent;
    this.vectorSearch = vectorSearch;
    this.textSearch = textSearch;
    this.cache = cacheService;
    this.vectorSearchAvailable = null;
  }

  /**
   * Perform comprehensive search
   * @param {Object} params - Search parameters
   * @param {string} params.query - Natural language query
   * @param {string} params.language - Language ('ar' or 'en')
   * @param {string} params.source - Source (telegram, whatsapp, website, app)
   * @param {number} params.page - Page number
   * @param {number} params.limit - Results per page
   * @param {Object} params.filters - Additional filters
   * @returns {Promise<Object>} Search results
   */
  async search(params) {
    const startTime = Date.now();

    try {
      const {
        query,
        language = 'ar',
        source = 'api',
        page = 1,
        limit = 10,
        filters = {},
        userId = null
      } = params;

      logger.info('Search initiated', {
        query: query.substring(0, 50),
        language,
        source,
        page
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(params);
      const cached = await this.cache.getSearchResults(cacheKey);

      if (cached) {
        logger.info('Search cache hit', { query: query.substring(0, 50) });
        return {
          ...cached,
          meta: {
            ...cached.meta,
            cached: true,
            responseTime: Date.now() - startTime
          }
        };
      }

      // Parse query using MCP Agent
      const parsed = await this.mcp.processQuery(query, {
        language,
        source,
        userId
      });

      // Build search parameters
      const searchParams = {
        ...this.mcp.toSearchParams(parsed),
        ...filters,
        language,
        page,
        limit
      };

      logger.debug('Search parameters built', searchParams);

      // Determine search strategy
      const searchMethod = await this.determineSearchMethod(parsed, searchParams);

      // Execute search
      let results = [];

      if (searchMethod === 'vector') {
        results = await this.performVectorSearch(query, searchParams);
      } else if (searchMethod === 'text') {
        results = await this.performTextSearch(query, searchParams);
      } else {
        // Hybrid search
        results = await this.performHybridSearch(query, searchParams);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      const total = results.length;
      const paginatedResults = results.slice(offset, offset + limit);

      // Format results
      const formattedListings = paginatedResults.map(listing =>
        responseFormatter.formatListing(listing, language)
      );

      // Generate suggestions (if method exists)
      const suggestions = typeof this.mcp.generateSuggestions === 'function'
        ? this.mcp.generateSuggestions(parsed)
        : [];

      // Build response
      const response = responseFormatter.searchResults(
        formattedListings,
        {
          original: query,
          parsed: {
            category: parsed.category,
            location: parsed.location,
            transactionType: parsed.transactionType,
            attributes: parsed.attributes,
            keywords: parsed.keywords
          }
        },
        responseFormatter.pagination(page, limit, total),
        suggestions,
        {
          responseTime: Date.now() - startTime,
          searchMethod,
          confidence: parsed.confidence
        }
      );

      // Cache results
      await this.cache.setSearchResults(cacheKey, response);

      logger.info('Search completed successfully', {
        query: query.substring(0, 50),
        results: total,
        duration: response.meta.responseTime,
        method: searchMethod
      });

      return response;
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Determine best search method based on parsed query
   * @param {Object} parsed - Parsed query
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<string>} 'vector', 'text', or 'hybrid'
   */
  async determineSearchMethod(parsed, searchParams) {
    // Check if vector search is available (cache this check)
    if (this.vectorSearchAvailable === null) {
      this.vectorSearchAvailable = await this.vectorSearch.isAvailable();
      logger.info('Vector search availability:', this.vectorSearchAvailable);
    }

    if (!this.vectorSearchAvailable) {
      return 'text';
    }

    // Use vector search if:
    // 1. Query has high confidence category/location match
    // 2. Query is complex (multiple attributes)
    // 3. Query has semantic meaning

    const hasStrongParsing = parsed.confidence > 0.7;
    const hasComplexAttributes = Object.keys(parsed.attributes || {}).length >= 2;
    const hasSemanticIntent = parsed.keywords.length >= 2;

    if (hasStrongParsing && (hasComplexAttributes || hasSemanticIntent)) {
      return 'vector';
    }

    // Use text search if:
    // 1. Query is very specific (exact brand/model names)
    // 2. Low confidence parsing

    if (parsed.confidence < 0.5) {
      return 'text';
    }

    // Default to hybrid for balanced results
    return 'hybrid';
  }

  /**
   * Perform vector-based search
   * @param {string} query - Query string
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Results
   */
  async performVectorSearch(query, searchParams) {
    try {
      const results = await this.vectorSearch.search(
        query,
        searchParams,
        searchParams.limit * 2 // Get more for pagination
      );

      logger.debug('Vector search results', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Vector search failed, falling back to text search:', error);
      return await this.performTextSearch(query, searchParams);
    }
  }

  /**
   * Perform text-based search
   * @param {string} query - Query string
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Results
   */
  async performTextSearch(query, searchParams) {
    try {
      let results = await this.textSearch.search(
        query,
        searchParams,
        searchParams.limit * 2
      );

      // If no results, try fallback search
      if (results.length === 0) {
        logger.debug('No text search results, trying fallback');
        results = await this.textSearch.fallbackSearch(
          query,
          searchParams,
          searchParams.limit * 2
        );
      }

      logger.debug('Text search results', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Text search failed:', error);
      return [];
    }
  }

  /**
   * Perform hybrid search (vector + text combined)
   * @param {string} query - Query string
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Merged results
   */
  async performHybridSearch(query, searchParams) {
    try {
      // Run both searches in parallel
      const [vectorResults, textResults] = await Promise.all([
        this.vectorSearch.search(query, searchParams, searchParams.limit).catch(() => []),
        this.textSearch.search(query, searchParams, searchParams.limit).catch(() => [])
      ]);

      logger.debug('Hybrid search results', {
        vector: vectorResults.length,
        text: textResults.length
      });

      // Merge and deduplicate results
      const merged = this.mergeResults(vectorResults, textResults);

      return merged;
    } catch (error) {
      logger.error('Hybrid search failed:', error);
      return [];
    }
  }

  /**
   * Merge vector and text search results
   * @param {Array} vectorResults - Vector search results
   * @param {Array} textResults - Text search results
   * @returns {Array} Merged results
   */
  mergeResults(vectorResults, textResults) {
    const merged = [];
    const seenIds = new Set();

    // Add vector results first (higher relevance)
    vectorResults.forEach((result, index) => {
      if (!seenIds.has(result.id)) {
        merged.push({
          ...result,
          rank_score: result.similarity_score || (1 - index / vectorResults.length)
        });
        seenIds.add(result.id);
      }
    });

    // Add unique text results
    textResults.forEach((result, index) => {
      if (!seenIds.has(result.id)) {
        merged.push({
          ...result,
          rank_score: result.rank_score || (0.5 - index / textResults.length)
        });
        seenIds.add(result.id);
      }
    });

    // Sort by combined score
    merged.sort((a, b) => {
      // Boost score calculation
      const scoreA = (a.rank_score || 0) + (a.is_boosted ? 0.2 : 0) + (a.priority || 0) * 0.01;
      const scoreB = (b.rank_score || 0) + (b.is_boosted ? 0.2 : 0) + (b.priority || 0) * 0.01;

      return scoreB - scoreA;
    });

    return merged;
  }

  /**
   * Generate cache key for search
   * @param {Object} params - Search parameters
   * @returns {string} Cache key
   */
  generateCacheKey(params) {
    return this.cache.generateSearchKey(params);
  }

  /**
   * Search by category ID (for browsing)
   * @param {string} categoryId - Category UUID
   * @param {Object} filters - Filters
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @returns {Promise<Object>} Search results
   */
  async searchByCategory(categoryId, filters = {}, page = 1, limit = 10) {
    const searchParams = {
      categoryId,
      ...filters,
      page,
      limit
    };

    const offset = (page - 1) * limit;

    // Simple database query for category browsing
    const { whereClause, params } = require('./FilterBuilder').build(searchParams);

    const query = `
      SELECT
        l.*,
        c.slug as category_slug,
        c.name_ar as category_name_ar,
        c.name_en as category_name_en,
        ct.name_ar as city_name_ar,
        ct.name_en as city_name_en
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      JOIN cities ct ON l.city_id = ct.id
      WHERE ${whereClause}
      ORDER BY l.is_boosted DESC, l.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await require('../../config/database').query(
      query,
      [...params, limit, offset]
    );

    return result.rows;
  }
}

// Singleton instance
module.exports = new SearchService();
