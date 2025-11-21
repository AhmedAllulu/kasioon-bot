const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const logger = require('../../utils/logger');
const aiAgent = require('../ai/agent');
const marketplaceSearch = require('../search/marketplaceSearch');
const audioProcessor = require('../audio/processor');
const responseFormatter = require('../ai/responseFormatter');
const searchHistory = require('../db/searchHistory');
const intentClassifier = require('../ai/intentClassifier');
const contextManager = require('../conversation/contextManager');
const historyTracker = require('../conversation/historyTracker');

class TelegramBot {
  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
    }

    console.log('🔑 Initializing Telegram bot with token:', token.substring(0, 10) + '...');
    
    this.bot = new Telegraf(token);
    this.setupHandlers();
  }

  setupHandlers() {
    // Start command
    this.bot.start(async (ctx) => {
      console.log('📱 [TELEGRAM] Received /start command from user:', {
        id: ctx.from.id,
        username: ctx.from.username || 'N/A',
        first_name: ctx.from.first_name,
        language: ctx.from.language_code
      });

      const userId = ctx.from.id.toString();
      const userPrefs = await searchHistory.getUserPreferences(userId);
      const language = userPrefs?.preferred_language || ctx.from.language_code || 'ar';

      const welcomeMessage = responseFormatter.formatWelcome(ctx.from.first_name, language);

      await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Help command
    this.bot.help(async (ctx) => {
      console.log('📱 [TELEGRAM] Received /help command from user:', {
        id: ctx.from.id,
        username: ctx.from.username || 'N/A',
        first_name: ctx.from.first_name
      });

      const language = ctx.from.language_code || 'ar';
      const isArabic = language === 'ar';

      const helpMessage = isArabic
        ? `📖 *دليل الاستخدام*

*البحث النصي:*
اكتب ما تبحث عنه بشكل طبيعي
مثال: "سيارة مرسيدس موديل 2020 في دمشق"

*البحث الصوتي:*
أرسل رسالة صوتية وسأفهم طلبك

*فلاتر البحث:*
• الفئة: سيارات، عقارات، إلكترونيات...
• المدينة: دمشق، حلب، حمص...
• السعر: "بسعر أقل من 1000000"
• المواصفات: "3 غرف"، "موديل 2022"

*أوامر مفيدة:*
/start - البدء من جديد
/help - عرض المساعدة
/recent - آخر عمليات البحث
/trending - الأكثر بحثاً

🌐 kasioon.com`
        : `📖 *User Guide*

*Text Search:*
Type what you're looking for naturally
Example: "Mercedes car 2020 model in Damascus"

*Voice Search:*
Send a voice message and I'll understand

*Search Filters:*
• Category: cars, real estate, electronics...
• City: Damascus, Aleppo, Homs...
• Price: "under 1000000"
• Specs: "3 rooms", "2022 model"

*Useful Commands:*
/start - Start over
/help - Show help
/recent - Recent searches
/trending - Trending searches

🌐 kasioon.com`;

      await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    });

    // Recent searches command
    this.bot.command('recent', async (ctx) => {
      const userId = ctx.from.id.toString();
      const language = ctx.from.language_code || 'ar';
      const isArabic = language === 'ar';

      try {
        const recentSearches = await searchHistory.getRecentSearches(userId, 5);

        if (recentSearches.length === 0) {
          await ctx.reply(isArabic
            ? '📭 لا توجد عمليات بحث سابقة'
            : '📭 No previous searches');
          return;
        }

        let message = isArabic ? '🕐 *آخر عمليات البحث:*\n\n' : '🕐 *Recent searches:*\n\n';
        recentSearches.forEach((search, index) => {
          const date = new Date(search.created_at).toLocaleDateString(isArabic ? 'ar-SY' : 'en-US');
          message += `${index + 1}. ${search.query_text}\n`;
          message += `   📊 ${search.results_count} ${isArabic ? 'نتيجة' : 'results'}`;
          if (search.category) message += ` • ${search.category}`;
          if (search.city) message += ` • ${search.city}`;
          message += `\n   📅 ${date}\n\n`;
        });

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Error fetching recent searches:', error);
        await ctx.reply(responseFormatter.formatError('api_error', language));
      }
    });

    // Trending searches command
    this.bot.command('trending', async (ctx) => {
      const language = ctx.from.language_code || 'ar';
      const isArabic = language === 'ar';

      try {
        const trending = await searchHistory.getTrendingSearches(10);

        if (trending.length === 0) {
          await ctx.reply(isArabic
            ? '📊 لا توجد عمليات بحث رائجة حالياً'
            : '📊 No trending searches currently');
          return;
        }

        let message = isArabic ? '🔥 *الأكثر بحثاً اليوم:*\n\n' : '🔥 *Trending today:*\n\n';
        trending.forEach((search, index) => {
          message += `${index + 1}. ${search.query_text}`;
          if (search.category) message += ` (${search.category})`;
          message += ` • ${search.search_count} ${isArabic ? 'مرات' : 'times'}\n`;
        });

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Error fetching trending searches:', error);
        await ctx.reply(responseFormatter.formatError('api_error', language));
      }
    });

    // Text messages
    this.bot.on(message('text'), async (ctx) => {
      console.log('📱 [TELEGRAM] Received text message:', {
        user_id: ctx.from.id,
        username: ctx.from.username || 'N/A',
        first_name: ctx.from.first_name,
        message: ctx.message.text,
        chat_id: ctx.chat.id,
        timestamp: new Date().toISOString()
      });
      await this.handleTextMessage(ctx);
    });

    // Voice messages
    this.bot.on(message('voice'), async (ctx) => {
      console.log('📱 [TELEGRAM] Received voice message:', {
        user_id: ctx.from.id,
        username: ctx.from.username || 'N/A',
        first_name: ctx.from.first_name,
        voice_duration: ctx.message.voice.duration,
        file_id: ctx.message.voice.file_id,
        chat_id: ctx.chat.id,
        timestamp: new Date().toISOString()
      });
      await this.handleVoiceMessage(ctx);
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      logger.error('Telegram bot error:', err);
      ctx.reply('عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.\nSorry, an error occurred. Please try again.');
    });
  }

  async handleTextMessage(ctx) {
    const startTime = Date.now();
    const userId = ctx.from.id.toString();
    const userMessage = ctx.message.text;

    try {
      // Send typing indicator
      await ctx.sendChatAction('typing');

      // Get user context (contains conversation history and preferences)
      const userContext = contextManager.getContext(userId);

      // Detect language (prefer context language if available)
      const language = userContext.preferredLanguage || this.detectLanguage(userMessage);

      logger.info(`[TELEGRAM] Processing message from user ${userId}:`, userMessage);

      // Check for repeated messages
      if (historyTracker.isRepeatedMessage(userId, userMessage)) {
        logger.warn(`[TELEGRAM] User ${userId} sent repeated message`);
        const repeatedMsg = language === 'ar'
          ? '🔄 لقد أرسلت نفس الرسالة للتو. هل تريد تجربة بحث مختلف؟'
          : '🔄 You just sent the same message. Want to try a different search?';
        await ctx.reply(repeatedMsg);
        return;
      }

      // Classify user intent using the new Intent Classifier with context
      const intentResult = intentClassifier.classify(userMessage, {
        lastIntent: userContext.lastIntent,
        lastSearchParams: userContext.lastSearchParams
      });

      logger.info(`[INTENT] Classified as: ${intentResult.intent} (confidence: ${intentResult.confidence})`);

      // Update context with current message
      contextManager.updateContext(userId, {
        lastMessage: userMessage,
        lastIntent: intentResult.intent,
        lastIntentConfidence: intentResult.confidence,
        preferredLanguage: language
      });

      // Handle different intents
      switch (intentResult.intent) {
        case intentClassifier.intentTypes.GREETING:
          const greeting = responseFormatter.formatGreeting(ctx.from.first_name, language);
          await ctx.reply(greeting, { parse_mode: 'Markdown' });
          return;

        case intentClassifier.intentTypes.HELP:
          const helpMessage = language === 'ar'
            ? `🤖 *كيف يمكنني مساعدتك؟*\n\nأنا بوت ذكي للبحث في السوق السوري. يمكنني مساعدتك في:\n\n• 🔍 البحث عن منتجات (سيارات، عقارات، إلكترونيات، إلخ)\n• 📍 تحديد الموقع والمدينة\n• 💰 تحديد نطاق السعر\n• 🎯 تطبيق فلاتر البحث المتقدمة\n\n*أمثلة على طلبات البحث:*\n• "سيارة للبيع في دمشق"\n• "شقة للإيجار في حلب بسعر أقل من 500 ألف"\n• "موبايل سامسونج مستعمل"\n\nجرب الآن! 👇`
            : `🤖 *How can I help you?*\n\nI'm an intelligent bot for searching the Syrian marketplace. I can help you with:\n\n• 🔍 Searching for products (cars, real estate, electronics, etc.)\n• 📍 Specifying location and city\n• 💰 Setting price ranges\n• 🎯 Applying advanced search filters\n\n*Example search queries:*\n• "car for sale in Damascus"\n• "apartment for rent in Aleppo under 500k"\n• "used Samsung phone"\n\nTry it now! 👇`;
          await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
          return;

        case intentClassifier.intentTypes.GOODBYE:
          const goodbyeMessage = language === 'ar'
            ? 'مع السلامة! سعدت بمساعدتك 👋\nإذا احتجت شي ثاني، أنا هنا! 😊'
            : 'Goodbye! Happy to help you 👋\nIf you need anything else, I\'m here! 😊';
          await ctx.reply(goodbyeMessage);
          return;

        case intentClassifier.intentTypes.FEEDBACK:
          const sentiment = intentResult.sentiment || 'neutral';
          const feedbackResponse = sentiment === 'positive'
            ? (language === 'ar' ? '😊 شكراً على ملاحظاتك الإيجابية! سعيد أنني ساعدتك' : '😊 Thanks for the positive feedback! Happy I could help')
            : sentiment === 'negative'
            ? (language === 'ar' ? '😔 عذراً إذا لم تكن النتائج كما توقعت. جرب تعديل معايير البحث' : '😔 Sorry the results weren\'t what you expected. Try adjusting your search criteria')
            : (language === 'ar' ? 'شكراً على ملاحظاتك!' : 'Thanks for your feedback!');
          await ctx.reply(feedbackResponse);
          return;

        case intentClassifier.intentTypes.UNCLEAR:
          // Send clarification question
          const clarificationMsg = intentResult.clarificationQuestion ||
            responseFormatter.getNoResultsMessage(language);
          await ctx.reply(clarificationMsg, { parse_mode: 'Markdown' });
          return;

        case intentClassifier.intentTypes.SEARCH:
          // Continue with search flow (existing code)
          break;

        default:
          // Unknown intent, try to search anyway
          logger.warn(`[INTENT] Unknown intent type: ${intentResult.intent}`);
          break;
      }

      // SEARCH FLOW (only reached if intent is SEARCH or unknown)

      // Check DB cache for popular searches first
      const cachedResults = await searchHistory.getCachedResults(userMessage);
      if (cachedResults) {
        logger.info('[TELEGRAM] Using cached results');
        const formatted = responseFormatter.formatSearchResults(cachedResults, language);
        await this.sendFormattedMessage(ctx, formatted);

        // Still log the search
        await searchHistory.logSearch({
          userId,
          queryText: userMessage,
          resultsCount: cachedResults.length,
          responseTimeMs: Date.now() - startTime,
          language,
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence
        });
        return;
      }

      // Send "searching" message
      const searchingMsg = await ctx.reply(
        language === 'ar' ? '🔍 جاري البحث...' : '🔍 Searching...'
      );

      // Analyze message with AI
      const extractedParams = await aiAgent.analyzeMessage(userMessage, language);
      logger.info('[AI] Extracted params:', extractedParams);

      // Search marketplace with smart fallback strategies, filter enrichment, and match scoring
      const searchResponse = await aiAgent.searchMarketplace(extractedParams, userMessage, language);
      const { results: filteredResults, filterDescription, matchedFilters } = searchResponse;

      // Format response
      let formattedMessage;
      if (filteredResults.length > 0) {
        formattedMessage = responseFormatter.formatSearchResults(filteredResults, language);

        // Add filter description if filters were matched
        if (filterDescription) {
          const filterHeader = language === 'ar'
            ? `\n🔍 *فلاتر البحث المطبقة:*\n${filterDescription}\n`
            : `\n🔍 *Applied search filters:*\n${filterDescription}\n`;
          formattedMessage = filterHeader + formattedMessage;
        }

        // Cache results if enough results
        if (filteredResults.length >= 3) {
          await searchHistory.cacheResults(userMessage, filteredResults);
        }
      } else {
        formattedMessage = responseFormatter.getNoResultsMessage(language);
      }

      // Delete "searching" message and send results
      await ctx.deleteMessage(searchingMsg.message_id).catch(() => {});
      await this.sendFormattedMessage(ctx, formattedMessage);

      // Save search results to context manager
      contextManager.saveSearchResults(userId, extractedParams, filteredResults);

      // Log search to database
      const responseTime = Date.now() - startTime;
      await searchHistory.logSearch({
        userId,
        platform: 'telegram',
        queryText: userMessage,
        extractedParams,
        resultsCount: filteredResults.length,
        responseTimeMs: responseTime,
        category: extractedParams.category,
        city: extractedParams.city,
        language,
        intent: intentResult.intent,
        intentConfidence: intentResult.confidence
      });

      logger.info(`[TELEGRAM] Response sent in ${responseTime}ms`);


    } catch (error) {
      logger.error('[TELEGRAM] Error handling text message:', error);
      const language = this.detectLanguage(userMessage);
      await ctx.reply(responseFormatter.formatError('search_error', language));
    }
  }

  async handleVoiceMessage(ctx) {
    try {
      const userId = ctx.from.id;

      console.log('🎤 [TELEGRAM] Processing voice message:', {
        user_id: userId
      });

      logger.info(`Received voice message from user ${userId}`);

      // Send typing action
      await ctx.sendChatAction('typing');

      // Get file link
      const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
      
      // Download and process audio
      const audioBuffer = await audioProcessor.downloadAudio(fileLink.href);
      
      // Transcribe audio
      await ctx.sendChatAction('typing');
      const transcribedText = await aiAgent.transcribeAudio(audioBuffer);

      console.log('🎤 [TELEGRAM] Voice transcribed:', {
        user_id: userId,
        transcribed_text: transcribedText
      });

      logger.info('Transcribed text:', transcribedText);

      // Detect language from transcribed text
      const detectLanguage = (text) => {
        if (!text || typeof text !== 'string') return 'ar';
        const arabicPattern = /[\u0600-\u06FF]/;
        const hasArabic = arabicPattern.test(text);
        const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
        const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
        if (hasArabic && arabicChars > text.length * 0.1) return 'ar';
        if (englishChars > text.length * 0.5) return 'en';
        return 'ar';
      };
      
      const detectedLanguage = detectLanguage(transcribedText);

      // Send transcription confirmation in detected language
      const confirmMessage = detectedLanguage === 'ar'
        ? `فهمت: "${transcribedText}"\n\nأبحث عن النتائج...`
        : `I understood: "${transcribedText}"\n\nSearching for results...`;
      
      await ctx.reply(confirmMessage);

      // Continue with regular text processing (which will detect language again)
      ctx.message.text = transcribedText;
      await this.handleTextMessage(ctx);

    } catch (error) {
      logger.error('Error handling voice message:', error);
      ctx.reply('عذراً، لم أتمكن من معالجة الرسالة الصوتية. يرجى المحاولة مرة أخرى.\nSorry, I couldn\'t process the voice message. Please try again.');
    }
  }

  /**
   * Send formatted message, splitting if too long
   * @param {Object} ctx - Telegraf context
   * @param {string} message - Message to send
   */
  async sendFormattedMessage(ctx, message) {
    // Split long messages
    if (message.length > 4000) {
      const chunks = this.splitMessage(message, 4000);
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'Markdown', disable_web_page_preview: true });
      }
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', disable_web_page_preview: true });
    }
  }

  /**
   * Split message into chunks
   * @param {string} message - Message to split
   * @param {number} maxLength - Maximum chunk length
   * @returns {Array<string>} Message chunks
   */
  splitMessage(message, maxLength) {
    const chunks = [];
    let currentChunk = '';
    const lines = message.split('\n');

    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  /**
   * Detect language from text
   * @param {string} text - Text to analyze
   * @returns {string} Language code ('ar' or 'en')
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string') return 'ar';
    const arabicPattern = /[\u0600-\u06FF]/;
    const hasArabic = arabicPattern.test(text);
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;

    if (hasArabic && arabicChars > totalChars * 0.3) return 'ar';
    return 'en';
  }

  /**
   * Check if message is a greeting
   * @param {string} text - Message text
   * @returns {boolean} True if greeting
   */
  isGreeting(text) {
    const greetings = [
      'مرحبا', 'اهلا', 'السلام', 'هاي', 'صباح', 'مساء', 'هلا',
      'hello', 'hi', 'hey', 'good morning', 'good evening'
    ];
    const lowerText = text.toLowerCase();
    return greetings.some(g => lowerText.includes(g)) && text.length < 30;
  }

  async launch() {
    try {
      console.log('🚀 Launching Telegram bot...');
      await this.bot.launch();
      logger.info('Telegram bot started successfully');
      console.log('✅ Telegram bot is now polling for messages');
      
      // Enable graceful stop
      process.once('SIGINT', () => this.stop('SIGINT'));
      process.once('SIGTERM', () => this.stop('SIGTERM'));
    } catch (error) {
      logger.error('Failed to start Telegram bot:', error);
      console.error('❌ Failed to start Telegram bot:', error.message);
      console.error('Error details:', error);
      throw error;
    }
  }

  stop(signal) {
    logger.info(`Stopping Telegram bot: ${signal}`);
    this.bot.stop(signal);
  }
}

module.exports = TelegramBot;

