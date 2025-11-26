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

      logger.info('🔎 Search parameters built', {
        query: query.substring(0, 50),
        categoryId: searchParams.categoryId || 'none',
        cityId: searchParams.cityId || 'none',
        transactionTypeSlug: searchParams.transactionTypeSlug || 'none',
        parsed: {
          category: parsed.category?.name_ar || 'none',
          location: parsed.location?.name_ar || 'none',
          transactionType: parsed.transactionType || 'none'
        }
      });

      // CONFIDENCE THRESHOLD: Validate or skip weak category matches
      if (searchParams.categoryId && parsed.confidence < 0.85) {
        // For medium confidence (0.70-0.85), use AI validation
        if (parsed.confidence >= 0.70 && parsed.confidence < 0.85) {
          logger.info('🤖 Medium confidence category match - validating with AI', {
            category: parsed.category?.name_ar,
            confidence: parsed.confidence
          });

          const isValid = await this.validateCategoryWithAI(query, parsed.category, language);

          if (!isValid) {
            logger.info('❌ AI validation rejected category match', {
              category: parsed.category?.name_ar
            });
            // Remove category filter
            delete searchParams.categoryId;
            parsed.category = null;
          } else {
            logger.info('✅ AI validation approved category match', {
              category: parsed.category?.name_ar
            });
          }
        } else {
          // Very low confidence (<0.70), skip directly to title search
          logger.info('⚠️  Very low confidence category match - skipping to direct title search', {
            category: parsed.category?.name_ar,
            confidence: parsed.confidence,
            threshold: 0.70
          });

          // Skip category filter and search directly in titles
          const directResults = await this.textSearch.titleOnlySearch(
            query,
            { ...searchParams, categoryId: undefined },
            limit * 2
          );

          if (directResults.length > 0) {
            logger.info('✓ Found results via direct title search', {
              count: directResults.length
            });

            // Continue with normal response formatting
            const offset = (page - 1) * limit;
            const total = directResults.length;
            const paginatedResults = directResults.slice(offset, offset + limit);

            const formattedListings = paginatedResults.map(listing =>
              responseFormatter.formatListing(listing, language)
            );

            const suggestions = typeof this.mcp.generateSuggestions === 'function'
              ? this.mcp.generateSuggestions(parsed)
              : [];

            const response = responseFormatter.searchResults(
              formattedListings,
              {
                original: query,
                parsed: {
                  category: null, // Don't show weak category match
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
                searchMethod: 'direct_title',
                confidence: parsed.confidence
              }
            );

            if (total > 0) {
              await this.cache.setSearchResults(cacheKey, response);
            }

            return response;
          }
        }
      }

      // Determine search strategy
      const searchMethod = await this.determineSearchMethod(parsed, searchParams);

      // Execute search with smart fallback
      let results = [];

      if (searchMethod === 'vector') {
        results = await this.performVectorSearch(query, searchParams);
      } else if (searchMethod === 'text') {
        results = await this.performTextSearch(query, searchParams);
      } else {
        // Hybrid search
        results = await this.performHybridSearch(query, searchParams);
      }

      // Smart fallback if no results and category was matched
      if (results.length === 0 && searchParams.categoryId) {
        logger.info('Zero results with category filter, applying smart fallback', {
          categoryId: searchParams.categoryId,
          categoryName: parsed.category?.name_ar
        });
        results = await this.smartFallbackSearch(query, searchParams, parsed);
      }

      // Apply location-based sorting if location was specified
      if (parsed.location && results.length > 0) {
        results = await this.sortByLocationProximity(results, parsed.location);
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

      // Cache results ONLY if there are actual results
      if (total > 0) {
        await this.cache.setSearchResults(cacheKey, response);
        logger.debug(`✓ Cached search results with ${total} listings`);
      } else {
        logger.debug('⚠️  Skipping cache for empty results');
      }

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
   * Smart fallback search when category-filtered search returns 0 results
   * Tries: parent category → global title search
   * @param {string} query - Query string
   * @param {Object} searchParams - Original search parameters
   * @param {Object} parsed - Parsed query data
   * @returns {Promise<Array>} Results
   */
  async smartFallbackSearch(query, searchParams, parsed) {
    const db = require('../../config/database');

    try {
      // Step 1: Recursively climb category tree until we find results or reach root
      let currentCategoryId = searchParams.categoryId;
      let depth = 0;
      const maxDepth = 5; // Prevent infinite loops

      while (currentCategoryId && depth < maxDepth) {
        const categoryResult = await db.query(
          'SELECT id, name_ar, name_en, parent_id, level FROM categories WHERE id = $1',
          [currentCategoryId]
        );

        if (categoryResult.rows.length === 0) break;

        const category = categoryResult.rows[0];

        // If we have a parent, try searching in it
        if (category.parent_id) {
          logger.info(`Fallback Step ${depth + 1}: Trying parent category`, {
            currentCategory: category.name_ar,
            parentId: category.parent_id,
            level: category.level
          });

          const parentSearchParams = {
            ...searchParams,
            categoryId: category.parent_id
          };

          const parentResults = await this.performTextSearch(query, parentSearchParams);

          if (parentResults.length > 0) {
            logger.info('✓ Found results in parent category', {
              parentId: category.parent_id,
              count: parentResults.length
            });
            return parentResults;
          }

          // Move up to parent for next iteration
          currentCategoryId = category.parent_id;
          depth++;
        } else {
          // Reached root category with no results
          logger.info('Reached root category, no results found', {
            rootCategory: category.name_ar,
            level: category.level
          });
          break;
        }
      }

      // Step 2: Search in ALL listings but ONLY in title (more precise)
      logger.info('Fallback: Searching all listings by title only', {
        query: query.substring(0, 50)
      });

      const titleOnlyResults = await this.textSearch.titleOnlySearch(
        query,
        { ...searchParams, categoryId: undefined },
        searchParams.limit * 2
      );

      if (titleOnlyResults.length > 0) {
        logger.info('✓ Found results in global title search', {
          count: titleOnlyResults.length
        });
        return titleOnlyResults;
      }

      // Step 3: Last resort - search title + description globally
      logger.info('Fallback: Searching all listings by title + description', {
        query: query.substring(0, 50)
      });

      const globalResults = await this.textSearch.fallbackSearch(
        query,
        { ...searchParams, categoryId: undefined },
        searchParams.limit * 2
      );

      if (globalResults.length > 0) {
        logger.info('✓ Found results in global search', {
          count: globalResults.length
        });
        return globalResults;
      }

      logger.info('No results found even after fallback attempts');
      return [];
    } catch (error) {
      logger.error('Smart fallback search error:', error);
      return [];
    }
  }

  /**
   * Validate category match using AI
   * @param {string} query - User query
   * @param {Object} category - Matched category
   * @param {string} language - Language
   * @returns {Promise<boolean>} True if valid match
   */
  async validateCategoryWithAI(query, category, language = 'ar') {
    const openai = require('../ai/OpenAIService');

    try {
      const prompt = language === 'ar'
        ? `استعلام المستخدم: "${query}"
الفئة المطابقة: "${category.name_ar}"

هل هذه الفئة مناسبة لاستعلام المستخدم؟
أجب بـ "نعم" إذا كانت مناسبة، أو "لا" إذا كانت غير مناسبة.
الجواب فقط (نعم/لا):`
        : `User Query: "${query}"
Matched Category: "${category.name_en}"

Does this category match the user's search intent?
Answer "yes" if it matches, or "no" if it doesn't.
Answer only (yes/no):`;

      const response = await openai.quickPrompt(prompt);
      const answer = response.toLowerCase().trim();

      // Check for positive response in both languages
      const isValid = answer.includes('yes') || answer.includes('نعم') || answer.includes('صحيح');

      logger.debug('AI category validation result', {
        query: query.substring(0, 50),
        category: category.name_ar,
        aiResponse: answer,
        isValid
      });

      return isValid;
    } catch (error) {
      logger.error('AI validation error, defaulting to reject:', error);
      // On error, reject the match to be safe
      return false;
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
   * Sort results by location proximity
   * Prioritizes listings from same city, then same province
   * @param {Array} results - Search results
   * @param {Object} searchLocation - Search location object with province info
   * @returns {Promise<Array>} Sorted results
   */
  async sortByLocationProximity(results, searchLocation) {
    const db = require('../../config/database');

    try {
      // Get the province of the search location
      let searchProvince = null;
      let searchCityName = null;

      if (typeof searchLocation === 'object' && searchLocation.name_ar) {
        searchCityName = searchLocation.name_ar;

        // Get province from database
        const provinceQuery = await db.query(
          'SELECT province_ar, province_en FROM cities WHERE name_ar = $1 OR name_en = $2 LIMIT 1',
          [searchLocation.name_ar, searchLocation.name_en || searchLocation.name_ar]
        );

        if (provinceQuery.rows.length > 0) {
          searchProvince = provinceQuery.rows[0].province_ar;
          logger.debug('Search province identified', {
            city: searchCityName,
            province: searchProvince
          });
        }
      }

      // If no province found, return results as-is
      if (!searchProvince) {
        return results;
      }

      // Sort results by location proximity
      const sortedResults = results.sort((a, b) => {
        // Priority 1: Same city (exact match)
        const aCityMatch = a.city_name_ar === searchCityName ? 3 : 0;
        const bCityMatch = b.city_name_ar === searchCityName ? 3 : 0;

        if (aCityMatch !== bCityMatch) {
          return bCityMatch - aCityMatch;
        }

        // Priority 2: Same province
        const aProvinceMatch = a.province_ar === searchProvince ? 2 : 0;
        const bProvinceMatch = b.province_ar === searchProvince ? 2 : 0;

        if (aProvinceMatch !== bProvinceMatch) {
          return bProvinceMatch - aProvinceMatch;
        }

        // Priority 3: Original relevance score
        const scoreA = (a.rank_score || 0) + (a.similarity_score || 0) + (a.is_boosted ? 0.2 : 0);
        const scoreB = (b.rank_score || 0) + (b.similarity_score || 0) + (b.is_boosted ? 0.2 : 0);

        return scoreB - scoreA;
      });

      logger.info('Results sorted by location proximity', {
        totalResults: results.length,
        searchCity: searchCityName,
        searchProvince
      });

      return sortedResults;
    } catch (error) {
      logger.error('Location proximity sorting error:', error);
      // Return original results if sorting fails
      return results;
    }
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
