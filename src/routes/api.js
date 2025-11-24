const express = require('express');
const router = express.Router();
// OPTIMIZED: Using direct database queries instead of API calls
const directSearch = require('../services/db/directSearch');
const aiAgent = require('../services/ai/agent');
const logger = require('../utils/logger');

/**
 * Async route handler wrapper to reduce try/catch boilerplate
 */
const asyncHandler = (fn, context) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(error => {
    logger.error(`Error in ${context}:`, error);
    res.status(500).json({ success: false, error: error.message });
  });
};

// Search marketplace listings - OPTIMIZED with direct database queries
router.post('/search', asyncHandler(async (req, res) => {
  const params = req.body;
  logger.info('API search request:', params);
  const startTime = Date.now();
  const results = await directSearch.search(params);
  const duration = Date.now() - startTime;
  logger.info(`Search completed in ${duration}ms, found ${results.length} results`);
  res.json({ success: true, count: results.length, results, responseTime: duration });
}, 'API search'));

// Analyze message
router.post('/analyze', asyncHandler(async (req, res) => {
  const { message, language } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  const params = await aiAgent.analyzeMessage(message, language || 'ar');
  res.json({ success: true, params });
}, 'analyze message'));

// Get listing details - OPTIMIZED with direct database query
router.get('/listings/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const startTime = Date.now();
  const listing = await directSearch.getListingDetails(id);
  const duration = Date.now() - startTime;
  logger.info(`Listing details fetched in ${duration}ms`);
  res.json({ success: true, listing, responseTime: duration });
}, 'fetch listing details'));

// Get marketplace categories - OPTIMIZED with direct database query
router.get('/categories', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const categories = await directSearch.getCategories();
  const duration = Date.now() - startTime;
  logger.info(`Categories fetched in ${duration}ms`);
  res.json({ success: true, categories, responseTime: duration });
}, 'fetch categories'));

module.exports = router;

