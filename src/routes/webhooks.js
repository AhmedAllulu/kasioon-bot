const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// n8n webhook receiver
router.post('/n8n', async (req, res) => {
  try {
    logger.info('Received n8n webhook:', req.body);

    // Process n8n webhook data
    const data = req.body;

    // Your business logic here
    // This can trigger additional workflows or store data

    res.json({
      success: true,
      message: 'Webhook received',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error handling n8n webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generic webhook endpoint
router.post('/generic', async (req, res) => {
  try {
    logger.info('Received generic webhook:', req.body);

    res.json({
      success: true,
      message: 'Webhook received'
    });

  } catch (error) {
    logger.error('Error handling webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

