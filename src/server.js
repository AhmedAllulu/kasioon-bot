const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Import routes
const telegramRoutes = require('./routes/telegram');
const whatsappRoutes = require('./routes/whatsapp');
const apiRoutes = require('./routes/api');
const chatRoutes = require('./routes/chat');
const webhookRoutes = require('./routes/webhooks');

// Import services
const TelegramBot = require('./services/telegram/bot');
const RedisClient = require('./services/redis');

const app = express();
const PORT = process.env.PORT || 3355;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Apply rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'kasioon-bot'
  });
});

// Routes
app.use('/api/telegram', telegramRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api', apiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/webhooks', webhookRoutes);

// Error handling
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Check if Telegram bot token is set
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      logger.error('TELEGRAM_BOT_TOKEN is not set in environment variables!');
      console.error('❌ ERROR: TELEGRAM_BOT_TOKEN is not set in .env file!');
      process.exit(1);
    }

    console.log('🔧 Initializing services...');
    console.log('📋 Telegram Bot Token:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing');

    // Initialize Redis (optional - don't block if it fails)
    try {
      await RedisClient.connect();
      logger.info('Redis connected successfully');
      console.log('✅ Redis connected');
    } catch (redisError) {
      logger.warn('Redis connection failed, continuing without cache:', redisError);
      console.log('⚠️  Redis connection failed, continuing without cache');
    }

    // Initialize Telegram Bot
    console.log('🤖 Starting Telegram bot...');
    const telegramBot = new TelegramBot();
    await telegramBot.launch();
    logger.info('Telegram bot launched successfully');
    console.log('✅ Telegram bot launched successfully!');
    console.log('📱 Bot is ready to receive messages!');

    // Store bot instance for graceful shutdown
    global.telegramBot = telegramBot;

    // Graceful shutdown
    process.once('SIGINT', () => {
      console.log('🛑 Shutting down gracefully...');
      if (global.telegramBot) {
        global.telegramBot.stop('SIGINT');
      }
      RedisClient.disconnect().catch(() => {});
      process.exit(0);
    });
    process.once('SIGTERM', () => {
      console.log('🛑 Shutting down gracefully...');
      if (global.telegramBot) {
        global.telegramBot.stop('SIGTERM');
      }
      RedisClient.disconnect().catch(() => {});
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    console.error('❌ Failed to initialize services:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Start server
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  await initializeServices();
});

module.exports = app;

