const express = require('express');
const router = express.Router();
const marketplaceSearch = require('../services/search/marketplaceSearch');
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

// Search marketplace listings
router.post('/search', asyncHandler(async (req, res) => {
  const params = req.body;
  logger.info('API search request:', params);
  const results = await marketplaceSearch.search(params);
  res.json({ success: true, count: results.length, results });
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

// Get listing details
router.get('/listings/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const listing = await marketplaceSearch.getListingDetails(id);
  res.json({ success: true, listing });
}, 'fetch listing details'));

// Get marketplace categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await marketplaceSearch.getCategories();
  res.json({ success: true, categories });
}, 'fetch categories'));

module.exports = router;

