require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const database = require('./config/database');
const redisCache = require('./config/redis');
const openAIConfig = require('./config/openai');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');

const routes = require('./routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3355;

/**
 * Middleware Setup
 */

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.KASIOON_WEBSITE_URL, /\.kasioon\.com$/]
    : '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP logging
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
app.use('/api', apiLimiter);

/**
 * Routes
 */

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Qasioun MCP Search Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      search: 'POST /api/search',
      analyze: 'POST /api/analyze',
      voiceSearch: 'POST /api/search/voice',
      telegram: 'POST /api/webhooks/telegram',
      whatsapp: 'POST /api/webhooks/whatsapp',
      health: 'GET /api/health'
    },
    documentation: 'https://github.com/qasioun/mcp-search-server'
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

/**
 * Initialize Services and Start Server
 */
async function startServer() {
  try {
    logger.info('Starting Qasioun MCP Search Server...');

    // Connect to PostgreSQL
    logger.info('Connecting to PostgreSQL...');
    await database.connect();

    // Connect to Redis
    logger.info('Connecting to Redis...');
    await redisCache.connect();

    // Initialize OpenAI client
    logger.info('Initializing OpenAI client...');
    openAIConfig.initialize();

    // Initialize MCP Agent with hot cache
    logger.info('Initializing MCP Agent...');
    const mcpAgent = require('./services/mcp/MCPAgent');
    await mcpAgent.initialize();
    logger.info('MCP Agent initialized with database hot cache');

    // Create uploads directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.info('Created uploads directory');
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await database.close();
          await redisCache.close();
          logger.info('All connections closed successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
