const express = require('express');
const router = express.Router();
const marketplaceSearch = require('../services/search/marketplaceSearch');
const aiAgent = require('../services/ai/agent');
const logger = require('../utils/logger');

// Search marketplace listings
router.post('/search', async (req, res) => {
  try {
    const params = req.body;
    logger.info('API search request:', params);

    const results = await marketplaceSearch.search(params);

    res.json({
      success: true,
      count: results.length,
      results
    });

  } catch (error) {
    logger.error('Error in API search:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analyze message
router.post('/analyze', async (req, res) => {
  try {
    const { message, language } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const params = await aiAgent.analyzeMessage(message, language || 'ar');

    res.json({
      success: true,
      params
    });

  } catch (error) {
    logger.error('Error analyzing message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get listing details
router.get('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await marketplaceSearch.getListingDetails(id);

    res.json({
      success: true,
      listing
    });

  } catch (error) {
    logger.error('Error fetching listing details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get marketplace categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await marketplaceSearch.getCategories();

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

