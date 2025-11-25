const express = require('express');
const router = express.Router();
const database = require('../config/database');
const redisCache = require('../config/redis');
const openAIService = require('../services/ai/OpenAIService');
const mcpAgent = require('../services/mcp/MCPAgent');
const logger = require('../utils/logger');

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  try {
    // Check database
    try {
      await database.query('SELECT 1');
      health.services.database = {
        status: 'connected',
        connected: database.isConnected()
      };
    } catch (error) {
      health.services.database = {
        status: 'disconnected',
        error: error.message
      };
      health.status = 'unhealthy';
    }

    // Check Redis
    try {
      health.services.redis = {
        status: redisCache.isConnected ? 'connected' : 'disconnected',
        enabled: redisCache.cacheEnabled
      };
    } catch (error) {
      health.services.redis = {
        status: 'error',
        error: error.message
      };
    }

    // Check OpenAI
    try {
      const openAIAvailable = await openAIService.testConnection();
      health.services.openai = {
        status: openAIAvailable ? 'available' : 'unavailable'
      };
    } catch (error) {
      health.services.openai = {
        status: 'error',
        error: error.message
      };
    }

    // Check MCP Agent
    try {
      const mcpHealth = await mcpAgent.healthCheck();
      health.services.mcpAgent = mcpHealth;
    } catch (error) {
      health.services.mcpAgent = {
        status: 'error',
        error: error.message
      };
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe for Kubernetes/Docker
 * @access  Public
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if critical services are ready
    await database.query('SELECT 1');

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe for Kubernetes/Docker
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
