const { Telegraf, Markup } = require('telegraf');
const searchService = require('../search/SearchService');
const TelegramFormatter = require('./TelegramFormatter');
const whisperService = require('../ai/WhisperService');
const logger = require('../../utils/logger');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * Telegram Bot Service
 * Handles all Telegram bot interactions
 */
class TelegramBot {
  constructor() {
    this.bot = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the Telegram bot
   */
  initialize() {
    if (this.isInitialized) {
      logger.warn('Telegram bot already initialized');
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      logger.error('TELEGRAM_BOT_TOKEN not found in environment variables');
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new Telegraf(token);

    // Setup handlers
    this.setupHandlers();

    this.isInitialized = true;
    logger.info('Telegram bot initialized successfully');
  }

  /**
   * Setup bot handlers
   */
  setupHandlers() {
    // Start command
    this.bot.start((ctx) => this.handleStart(ctx));

    // Help command
    this.bot.help((ctx) => this.handleHelp(ctx));

    // Text message handler (search queries)
    this.bot.on('text', (ctx) => this.handleTextMessage(ctx));

    // Voice message handler
    this.bot.on('voice', (ctx) => this.handleVoiceMessage(ctx));

    // Callback query handler (button clicks)
    this.bot.on('callback_query', (ctx) => this.handleCallbackQuery(ctx));

    // Error handler
    this.bot.catch((err, ctx) => {
      logger.error('Telegram bot error:', err);
      ctx.reply('عذراً، صار في خطأ 😔\nجرب مرة تانية أو اكتب /help للمساعدة');
    });
  }

  /**
   * Handle /start command
   */
  async handleStart(ctx) {
    const message = `أهلاً وسهلاً! 👋

أنا مساعدك الذكي للبحث في قاسيون 🌟

بتقدر تبحث معي عن أي شي:
🚗 سيارات وشاحنات
🏠 عقارات ومنازل
📱 موبايلات وإلكترونيات
🪑 أثاث ومفروشات
👕 ألبسة وإكسسوارات
وكتير غيرها...

فقط اكتبلي شو بدك:
💬 "بدي سيارة هيونداي موديل حديث"
💬 "شقة للإيجار بدمشق"
💬 "ايفون مستعمل بسعر معقول"

يلا نبلش! 🚀`;

    await ctx.reply(message);
  }

  /**
   * Handle /help command
   */
  async handleHelp(ctx) {
    const message = `📚 كيف بتستخدم البوت؟

1️⃣ احكيلي شو بدك
   مثلاً: "بدي سيارة كيا بدمشق" أو "شقة صغيرة للإيجار"

2️⃣ استنى شوي 🔍
   رح دور على آلاف الإعلانات وجيبلك أحسن النتائج

3️⃣ اضغط على "عرض التفاصيل"
   لتشوف كل التفاصيل والصور على الموقع

💡 نصايح مفيدة:
• كلما كنت أدق بالبحث، كلما كانت النتائج أحسن
• فيك تحكيلي الموقع، السعر، المواصفات...
• استخدم /start إذا بدك تبدأ من جديد

محتاج مساعدة؟ تفضل:
🌐 https://www.kasioon.com`;

    await ctx.reply(message);
  }

  /**
   * Handle text messages (search queries)
   */
  async handleTextMessage(ctx) {
    const query = ctx.message.text;
    const userId = ctx.from.id;
    const language = 'ar'; // Default to Arabic

    logger.info('Telegram search request', {
      userId,
      query: query.substring(0, 50),
      username: ctx.from.username
    });

    // Send typing indicator
    await ctx.sendChatAction('typing');

    try {
      // Perform search
      const results = await searchService.search({
        query,
        language,
        source: 'telegram',
        userId: userId.toString(),
        page: 1,
        limit: 10
      });

      // Format results for Telegram
      const formatted = TelegramFormatter.formatSearchResults(results, language);

      // Send response
      await this.sendFormattedMessage(ctx, formatted);
    } catch (error) {
      logger.error('Telegram search error:', error);
      const errorMessage = TelegramFormatter.formatError(
        'عذراً، صار في مشكلة بالبحث 😔\nجرب مرة تانية أو غير كلمات البحث',
        language
      );
      await this.sendFormattedMessage(ctx, errorMessage);
    }
  }

  /**
   * Handle voice messages
   */
  async handleVoiceMessage(ctx) {
    const userId = ctx.from.id;
    const voiceFileId = ctx.message.voice.file_id;
    const language = 'ar'; // Default to Arabic

    logger.info('Telegram voice message received', {
      userId,
      fileId: voiceFileId,
      duration: ctx.message.voice.duration,
      username: ctx.from.username
    });

    // Send typing indicator
    await ctx.sendChatAction('typing');

    try {
      // Download voice file from Telegram
      const fileLink = await this.bot.telegram.getFileLink(voiceFileId);
      const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(response.data);

      // Determine file extension (Telegram voice messages are usually OGG)
      const filename = `voice_${Date.now()}.ogg`;

      logger.info('Voice file downloaded', {
        size: audioBuffer.length,
        filename
      });

      // Transcribe using Whisper
      await ctx.reply('🎤 عم اسمع الرسالة الصوتية...');

      const transcribedText = await whisperService.transcribeBuffer(audioBuffer, filename, language);

      logger.info('Voice transcribed', {
        userId,
        text: transcribedText.substring(0, 100)
      });

      // Send transcription to user
      await ctx.reply(`📝 سمعتك: "${transcribedText}"\n\n🔍 عم دور...`);

      // Process as search query
      const results = await searchService.search({
        query: transcribedText,
        language,
        source: 'telegram-voice',
        userId: userId.toString(),
        page: 1,
        limit: 10
      });

      // Format results for Telegram
      const formatted = TelegramFormatter.formatSearchResults(results, language);

      // Send response
      await this.sendFormattedMessage(ctx, formatted);
    } catch (error) {
      logger.error('Voice message processing error:', error);
      await ctx.reply('عذراً، ما قدرت افهم الرسالة الصوتية 😔\nجرب ترسل رسالة نصية أو صوتية تانية');
    }
  }

  /**
   * Handle callback queries (button clicks)
   */
  async handleCallbackQuery(ctx) {
    const callbackData = ctx.callbackQuery.data;

    logger.info('Telegram callback query', {
      userId: ctx.from.id,
      data: callbackData
    });

    await ctx.answerCbQuery();

    if (callbackData === 'new_search') {
      await ctx.reply('تمام! احكيلي شو بدك دور عليه؟ 🔍');
    } else if (callbackData.startsWith('search:')) {
      const query = callbackData.replace('search:', '');

      // Simulate a text message with the suggestion
      ctx.message = {
        text: query
      };
      await this.handleTextMessage(ctx);
    }
  }

  /**
   * Send formatted message to Telegram
   */
  async sendFormattedMessage(ctx, formatted) {
    const options = {
      parse_mode: formatted.parseMode || 'HTML',
      disable_web_page_preview: formatted.disableWebPagePreview || false
    };

    // Add inline keyboard if buttons exist
    if (formatted.buttons && formatted.buttons.length > 0) {
      options.reply_markup = {
        inline_keyboard: formatted.buttons
      };
    }

    await ctx.reply(formatted.text, options);
  }

  /**
   * Get webhook callback middleware
   * @param {string} webhookPath - Webhook path (e.g., '/api/webhooks/telegram')
   * @returns {Function} Express middleware
   */
  getWebhookCallback(webhookPath) {
    if (!this.bot) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    return this.bot.webhookCallback(webhookPath);
  }

  /**
   * Set webhook URL (call this after server is running)
   * @param {string} webhookUrl - Full webhook URL
   */
  async setWebhook(webhookUrl) {
    if (!this.bot) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    logger.info('Setting Telegram webhook', { url: webhookUrl });

    try {
      await this.bot.telegram.setWebhook(webhookUrl);
      logger.info('Telegram webhook set successfully');
    } catch (error) {
      logger.error('Failed to set Telegram webhook:', error);
      throw error;
    }
  }

  /**
   * Start polling mode (for development)
   */
  async startPolling() {
    if (!this.bot) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    logger.info('Starting Telegram bot in polling mode');

    try {
      await this.bot.launch();
      logger.info('Telegram bot polling started successfully');

      // Enable graceful stop
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      logger.error('Failed to start Telegram bot polling:', error);
      throw error;
    }
  }

  /**
   * Send message to a specific chat
   * @param {number|string} chatId - Chat ID
   * @param {string} text - Message text
   * @param {Object} options - Telegram options
   */
  async sendMessage(chatId, text, options = {}) {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }

    return await this.bot.telegram.sendMessage(chatId, text, options);
  }

  /**
   * Get bot info
   */
  async getMe() {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }

    return await this.bot.telegram.getMe();
  }
}

// Singleton instance
module.exports = new TelegramBot();
