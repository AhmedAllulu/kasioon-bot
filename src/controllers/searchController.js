const searchService = require('../services/search/SearchService');
const mcpAgent = require('../services/mcp/MCPAgent');
const responseFormatter = require('../utils/responseFormatter');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Search Controller
 * Handles search-related endpoints
 */

/**
 * Main search endpoint
 * POST /api/search
 */
exports.search = asyncHandler(async (req, res) => {
  const {
    query,
    language = 'ar',
    source = 'api',
    userId,
    page = 1,
    limit = 10,
    filters = {}
  } = req.body;

  logger.info('Search request received', {
    query: query?.substring(0, 50),
    language,
    source,
    ip: req.ip
  });

  // Validate query
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json(
      responseFormatter.error('Query is required', 400)
    );
  }

  if (query.length > 500) {
    return res.status(400).json(
      responseFormatter.error('Query is too long (max 500 characters)', 400)
    );
  }

  // Perform search
  const results = await searchService.search({
    query,
    language,
    source,
    userId,
    page: parseInt(page),
    limit: parseInt(limit),
    filters
  });

  res.json(results);
});

/**
 * Analyze query endpoint (without performing search)
 * POST /api/analyze
 */
exports.analyze = asyncHandler(async (req, res) => {
  const { query, language = 'ar' } = req.body;

  logger.info('Query analysis request', {
    query: query?.substring(0, 50),
    language
  });

  if (!query || typeof query !== 'string') {
    return res.status(400).json(
      responseFormatter.error('Query is required', 400)
    );
  }

  const analysis = await mcpAgent.analyzeQuery(query, language);

  res.json(responseFormatter.queryAnalysis(analysis));
});

/**
 * Search by category
 * GET /api/search/category/:categoryId
 */
exports.searchByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 10, ...filters } = req.query;

  const results = await searchService.searchByCategory(
    categoryId,
    filters,
    parseInt(page),
    parseInt(limit)
  );

  res.json(responseFormatter.success({ listings: results }));
});

module.exports = exports;
