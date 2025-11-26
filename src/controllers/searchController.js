const searchService = require('../services/search/SearchService');
const mcpAgent = require('../services/mcp/MCPAgent');
const openAIService = require('../services/ai/OpenAIService');
const intentService = require('../services/intent/IntentService');
const responseFormatter = require('../utils/responseFormatter');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');


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

  // Detect user intent
  const intent = await openAIService.detectIntent(query, language);

  logger.info('Intent detected', {
    original: query.substring(0, 50),
    intent: intent.intent
  });

  // Route based on intent
  let results;

  switch (intent.intent) {
    case 'search':
      // Perform listing search
      if (!intent.query) {
        return res.status(400).json(
          responseFormatter.error('No search query found in the request', 400)
        );
      }

      results = await searchService.search({
        query: intent.query,
        language,
        source,
        userId,
        page: parseInt(page),
        limit: parseInt(limit),
        filters
      });
      break;

    case 'most_viewed':
      results = await intentService.getMostViewedListings(
        intent.limit || parseInt(limit),
        language
      );
      break;

    case 'most_impressioned':
      results = await intentService.getMostImpressionedListings(
        intent.limit || parseInt(limit),
        language
      );
      break;

    case 'get_offices':
      results = await intentService.getOffices(
        intent.limit || parseInt(limit),
        language
      );
      break;

    case 'get_office_details':
      if (!intent.officeId) {
        return res.status(400).json(
          responseFormatter.error(
            language === 'ar'
              ? 'يرجى تحديد رقم أو اسم المكتب'
              : 'Please specify office ID or name',
            400
          )
        );
      }
      results = await intentService.getOfficeDetails(intent.officeId, language);
      if (!results.success) {
        return res.status(404).json(responseFormatter.error(results.error, 404));
      }
      break;

    case 'get_office_listings':
      if (!intent.officeId) {
        return res.status(400).json(
          responseFormatter.error(
            language === 'ar'
              ? 'يرجى تحديد رقم أو اسم المكتب'
              : 'Please specify office ID or name',
            400
          )
        );
      }
      results = await intentService.getOfficeListings(
        intent.officeId,
        intent.limit || parseInt(limit),
        language
      );
      if (!results.success) {
        return res.status(404).json(responseFormatter.error(results.error, 404));
      }
      break;

    case 'greeting':
      results = intentService.getGreetingMessage(language);
      break;

    case 'help':
      results = intentService.getHelpMessage(language);
      break;

    default:
      return res.status(400).json(
        responseFormatter.error('Unknown intent type', 400)
      );
  }

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
