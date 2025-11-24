const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const logger = require('../../utils/logger');
const { detectLanguage } = require('../../utils/languageDetector');
const audioProcessor = require('../audio/processor');
const responseFormatter = require('../ai/responseFormatter');
const searchHistory = require('../db/searchHistory');
const intentClassifier = require('../ai/intentClassifier');
const contextManager = require('../conversation/contextManager');
const historyTracker = require('../conversation/historyTracker');

// MCP Agent for direct database access (new architecture)
const mcpAgent = require('../ai/mcpAgent');

// Legacy imports (kept for fallback)
const aiAgent = require('../ai/agent');
const marketplaceSearch = require('../search/marketplaceSearch');
const dynamicDataManager = require('../data/dynamicDataManager');

// Feature flag for MCP mode
const USE_MCP_AGENT = process.env.USE_MCP_AGENT === 'true';

class TelegramBot {
  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
    }

    console.log('🔑 Initializing Telegram bot with token:', token.substring(0, 10) + '...');

    this.bot = new Telegraf(token);
    this.setupHandlers();

    // Initialize dynamic data on startup
    this.initializeData();
  }

  /**
   * Initialize dynamic data from API or MCP
   * Called on bot startup and refreshed periodically
   */
  async initializeData() {
    try {
      console.log('🚀 [BOT] Initializing data...');
      console.log(`🔧 [BOT] Mode: ${USE_MCP_AGENT ? 'MCP Agent (Direct DB)' : 'Legacy API'}`);

      if (USE_MCP_AGENT) {
        // MCP mode: Database connection is initialized in mcpAgent
        console.log('✅ [BOT] MCP Agent mode - using direct database access');
        console.log('📊 [BOT] MCP Agent status:', {
          hasAnthropic: !!mcpAgent.anthropic,
          hasDatabase: !!mcpAgent.pool
        });
      } else {
        // Legacy mode: Load structure from API
        await dynamicDataManager.loadStructure('ar');
        await dynamicDataManager.getCategories('ar');

        console.log('✅ [BOT] Dynamic data initialized (Legacy mode)');
        console.log('📊 [BOT] Cache stats:', dynamicDataManager.getCacheStats());

        // Schedule periodic refresh every 30 minutes (legacy mode only)
        setInterval(async () => {
          try {
            await dynamicDataManager.refreshCache('ar');
          } catch (error) {
            console.error('❌ [BOT] Error refreshing cache:', error.message);
          }
        }, 30 * 60 * 1000);
      }

    } catch (error) {
      console.error('❌ [BOT] Error initializing data:', error);
      console.log('⚠️  [BOT] Bot will continue with limited functionality');
    }
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
      const language = userContext.preferredLanguage || detectLanguage(userMessage);

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

      // Update context with current message
      contextManager.updateContext(userId, {
        lastMessage: userMessage,
        preferredLanguage: language
      });

      // ========== MCP MODE: BYPASS INTENT CLASSIFICATION ==========
      // In MCP mode, let the AI agent handle all natural language understanding
      // This provides more intelligent and contextual responses
      if (USE_MCP_AGENT) {
        logger.info(`[MCP] Bypassing intent classification, sending directly to MCP Agent`);
        // Continue to MCP search flow below
      } else {
        // ========== LEGACY MODE: USE INTENT CLASSIFICATION ==========
        // Classify user intent using the Intent Classifier with context
        const intentResult = intentClassifier.classify(userMessage, {
          lastIntent: userContext.lastIntent,
          lastSearchParams: userContext.lastSearchParams
        });

        logger.info(`[INTENT] Classified as: ${intentResult.intent} (confidence: ${intentResult.confidence})`);

        // Update context with intent
        contextManager.updateContext(userId, {
          lastIntent: intentResult.intent,
          lastIntentConfidence: intentResult.confidence
        });

        // Handle different intents (legacy mode only)
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

          case intentClassifier.intentTypes.COMPLAINT:
            const complaintMessage = language === 'ar'
              ? '😔 *نأسف لوجود مشكلة*\n\nنحن نعمل باستمرار على تحسين الخدمة. يمكنك:\n\n• 🔄 إعادة المحاولة بصيغة مختلفة\n• 📝 وصف المشكلة بالتفصيل\n• 📞 التواصل مع الدعم الفني\n\nكيف يمكنني مساعدتك؟'
              : '😔 *Sorry to hear about the issue*\n\nWe\'re constantly working to improve our service. You can:\n\n• 🔄 Try again with different wording\n• 📝 Describe the problem in detail\n• 📞 Contact technical support\n\nHow can I help you?';
            await ctx.reply(complaintMessage, { parse_mode: 'Markdown' });
            return;

          case intentClassifier.intentTypes.CONTACT:
            const contactMessage = language === 'ar'
              ? '📞 *معلومات التواصل*\n\nللتواصل مع فريق الدعم:\n\n• 💬 يمكنك التواصل مباشرة من خلال هذا البوت\n• 📧 البريد: support@kasioon.com\n• 🌐 الموقع: www.kasioon.com\n\nأو يمكنني مساعدتك مباشرة. ما الذي تحتاجه؟'
              : '📞 *Contact Information*\n\nTo contact our support team:\n\n• 💬 You can reach out directly through this bot\n• 📧 Email: support@kasioon.com\n• 🌐 Website: www.kasioon.com\n\nOr I can help you directly. What do you need?';
            await ctx.reply(contactMessage, { parse_mode: 'Markdown' });
            return;

          case intentClassifier.intentTypes.UNCLEAR:
            // Send clarification question
            const clarificationMsg = intentResult.clarificationQuestion ||
              responseFormatter.getNoResultsMessage(language);
            await ctx.reply(clarificationMsg, { parse_mode: 'Markdown' });
            return;

          case intentClassifier.intentTypes.SEARCH:
          case intentClassifier.intentTypes.PRODUCT_INFO:
          case intentClassifier.intentTypes.COMPARISON:
          case intentClassifier.intentTypes.AVAILABILITY:
            // Continue with search flow
            break;

          default:
            // Unknown intent, try to search anyway
            logger.warn(`[INTENT] Unknown intent type: ${intentResult.intent}`);
            break;
        }
      }

      // SEARCH FLOW (MCP mode always reaches here, Legacy mode only if SEARCH/AVAILABILITY intent)

      // Check DB cache for popular searches first (skip in MCP mode for real-time data)
      if (!USE_MCP_AGENT) {
        const cachedResults = await searchHistory.getCachedResults(userMessage);
        if (cachedResults) {
          logger.info('[TELEGRAM] Using cached results');
          await this.sendResultsAsSeparateMessages(ctx, cachedResults, language, null);

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
      }

      // Send "searching" message
      const searchingMsg = await ctx.reply(
        language === 'ar' ? '🔍 جاري البحث...' : '🔍 Searching...'
      );

      let formattedResponse;
      let extractedParams = {};
      let resultsCount = 0;

      if (USE_MCP_AGENT) {
        // ========== MCP AGENT MODE ==========
        // Direct database queries via Claude with MCP tools
        console.log('🔧 [TELEGRAM] Using MCP Agent for search');

        try {
          const mcpResult = await mcpAgent.processMessage(userMessage, language);
          formattedResponse = mcpResult.response;
          resultsCount = mcpResult.toolsUsed > 0 ? 1 : 0; // Approximate
          extractedParams = { _source: 'mcp_agent', toolsUsed: mcpResult.toolsUsed };

          logger.info('[MCP] Response generated:', {
            responseLength: formattedResponse?.length,
            toolsUsed: mcpResult.toolsUsed
          });
        } catch (mcpError) {
          console.error('❌ [TELEGRAM] MCP Agent error, falling back to legacy:', mcpError.message);
          // Fallback to legacy mode
          const fallbackParams = await aiAgent.analyzeMessage(userMessage, language);
          const fallbackResponse = await aiAgent.searchMarketplace(fallbackParams, userMessage, language);
          formattedResponse = await aiAgent.formatResults(fallbackResponse.results, language, userMessage);
          extractedParams = fallbackParams;
          resultsCount = fallbackResponse.results?.length || 0;
        }

        // Delete "searching" message
        await ctx.deleteMessage(searchingMsg.message_id).catch(() => {});

        // Send the MCP-generated response directly
        await this.sendFormattedMessage(ctx, formattedResponse);

      } else {
        // ========== LEGACY MODE ==========
        // API-based search with AI parameter extraction
        console.log('🔧 [TELEGRAM] Using Legacy API mode for search');

        extractedParams = await aiAgent.analyzeMessage(userMessage, language);
        logger.info('[AI] Extracted params:', extractedParams);

        const searchResponse = await aiAgent.searchMarketplace(extractedParams, userMessage, language);
        const { results: filteredResults, filterDescription, matchedFilters } = searchResponse;
        resultsCount = filteredResults?.length || 0;

        // Delete "searching" message
        await ctx.deleteMessage(searchingMsg.message_id).catch(() => {});

        // Format and send response
        if (filteredResults.length > 0) {
          await this.sendResultsAsSeparateMessages(ctx, filteredResults, language, extractedParams);

          if (filteredResults.length >= 3) {
            await searchHistory.cacheResults(userMessage, filteredResults);
          }
        } else {
          const noResultsMessage = responseFormatter.getNoResultsMessage(language, extractedParams);
          await this.sendFormattedMessage(ctx, noResultsMessage);
        }

        // Save search results to context manager
        contextManager.saveSearchResults(userId, extractedParams, filteredResults);
      }

      // Log search to database
      const responseTime = Date.now() - startTime;
      await searchHistory.logSearch({
        userId,
        platform: 'telegram',
        queryText: userMessage,
        extractedParams,
        resultsCount,
        responseTimeMs: responseTime,
        category: extractedParams.category,
        city: extractedParams.city,
        language,
        intent: USE_MCP_AGENT ? 'mcp_agent' : 'search',
        intentConfidence: USE_MCP_AGENT ? 1.0 : 0.8,
        mode: USE_MCP_AGENT ? 'mcp' : 'legacy'
      });

      logger.info(`[TELEGRAM] Response sent in ${responseTime}ms (${USE_MCP_AGENT ? 'MCP' : 'Legacy'} mode)`);


    } catch (error) {
      logger.error('[TELEGRAM] Error handling text message:', error);
      const language = detectLanguage(userMessage);
      await ctx.reply(responseFormatter.formatError('search_error', language));
    }
  }

  async handleVoiceMessage(ctx) {
    const startTime = Date.now();
    try {
      const userId = ctx.from.id;
      const voiceInfo = ctx.message.voice;

      console.log('🎤 [TELEGRAM] Processing voice message:', {
        user_id: userId,
        file_id: voiceInfo?.file_id,
        duration: voiceInfo?.duration,
        file_size: voiceInfo?.file_size,
        mime_type: voiceInfo?.mime_type
      });

      logger.info(`Received voice message from user ${userId}`, {
        file_id: voiceInfo?.file_id,
        duration: voiceInfo?.duration,
        file_size: voiceInfo?.file_size
      });

      // Step 1: Send typing action
      console.log('🎤 [VOICE-DEBUG] Step 1: Sending typing action...');
      await ctx.sendChatAction('typing');
      console.log('🎤 [VOICE-DEBUG] Step 1: Typing action sent');

      // Step 2: Get file link
      console.log('🎤 [VOICE-DEBUG] Step 2: Getting file link...', {
        file_id: voiceInfo?.file_id
      });
      let fileLink;
      try {
        fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        console.log('🎤 [VOICE-DEBUG] Step 2: File link retrieved:', {
          href: fileLink.href,
          file_path: fileLink.file_path
        });
      } catch (error) {
        console.error('🎤 [VOICE-DEBUG] Step 2 ERROR: Failed to get file link:', error);
        logger.error('Failed to get file link:', error);
        throw error;
      }
      
      // Step 3: Download and process audio
      console.log('🎤 [VOICE-DEBUG] Step 3: Downloading audio...', {
        url: fileLink.href
      });
      let audioBuffer;
      try {
        audioBuffer = await audioProcessor.downloadAudio(fileLink.href);
        console.log('🎤 [VOICE-DEBUG] Step 3: Audio downloaded successfully:', {
          buffer_size: audioBuffer?.length,
          buffer_type: typeof audioBuffer
        });
      } catch (error) {
        console.error('🎤 [VOICE-DEBUG] Step 3 ERROR: Failed to download audio:', error);
        logger.error('Failed to download audio:', error);
        throw error;
      }
      
      // Step 4: Transcribe audio
      console.log('🎤 [VOICE-DEBUG] Step 4: Sending typing action before transcription...');
      await ctx.sendChatAction('typing');
      console.log('🎤 [VOICE-DEBUG] Step 4: Starting audio transcription...', {
        buffer_size: audioBuffer?.length
      });
      
      let transcribedText;
      try {
        // Use MCP agent for transcription if enabled, otherwise use legacy aiAgent
        transcribedText = USE_MCP_AGENT
          ? await mcpAgent.transcribeAudio(audioBuffer)
          : await aiAgent.transcribeAudio(audioBuffer);
        console.log('🎤 [VOICE-DEBUG] Step 4: Transcription completed:', {
          transcribed_text: transcribedText,
          text_length: transcribedText?.length,
          text_type: typeof transcribedText
        });
      } catch (error) {
        console.error('🎤 [VOICE-DEBUG] Step 4 ERROR: Failed to transcribe audio:', error);
        logger.error('Failed to transcribe audio:', error);
        throw error;
      }

      console.log('🎤 [TELEGRAM] Voice transcribed:', {
        user_id: userId,
        transcribed_text: transcribedText,
        processing_time_ms: Date.now() - startTime
      });

      logger.info('Transcribed text:', transcribedText);

      // Step 5: Detect language from transcribed text
      console.log('🎤 [VOICE-DEBUG] Step 5: Detecting language...');
      const detectedLanguage = detectLanguage(transcribedText);
      console.log('🎤 [VOICE-DEBUG] Step 5: Language detected:', {
        language: detectedLanguage,
        text_preview: transcribedText?.substring(0, 50)
      });

      // Step 6: Send transcription confirmation
      console.log('🎤 [VOICE-DEBUG] Step 6: Sending confirmation message...');
      const confirmMessage = detectedLanguage === 'ar'
        ? `فهمت: "${transcribedText}"\n\nأبحث عن النتائج...`
        : `I understood: "${transcribedText}"\n\nSearching for results...`;
      
      try {
        await ctx.reply(confirmMessage);
        console.log('🎤 [VOICE-DEBUG] Step 6: Confirmation message sent');
      } catch (error) {
        console.error('🎤 [VOICE-DEBUG] Step 6 ERROR: Failed to send confirmation:', error);
        logger.error('Failed to send confirmation message:', error);
        // Continue anyway
      }

      // Step 7: Continue with regular text processing
      console.log('🎤 [VOICE-DEBUG] Step 7: Processing as text message...', {
        transcribed_text: transcribedText
      });
      ctx.message.text = transcribedText;
      
      try {
        await this.handleTextMessage(ctx);
        console.log('🎤 [VOICE-DEBUG] Step 7: Text message processing completed');
        console.log('🎤 [VOICE-DEBUG] Total processing time:', Date.now() - startTime, 'ms');
      } catch (error) {
        console.error('🎤 [VOICE-DEBUG] Step 7 ERROR: Failed to process text message:', error);
        logger.error('Failed to process transcribed text message:', error);
        throw error;
      }

    } catch (error) {
      console.error('🎤 [VOICE-DEBUG] FATAL ERROR in voice message handling:', {
        error_message: error.message,
        error_stack: error.stack,
        processing_time_ms: Date.now() - startTime
      });
      logger.error('Error handling voice message:', error);
      
      try {
        await ctx.reply('عذراً، لم أتمكن من معالجة الرسالة الصوتية. يرجى المحاولة مرة أخرى.\nSorry, I couldn\'t process the voice message. Please try again.');
      } catch (replyError) {
        console.error('🎤 [VOICE-DEBUG] Failed to send error message:', replyError);
        logger.error('Failed to send error message:', replyError);
      }
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
   * Send search results as separate messages for better URL preview loading
   * Each listing is sent in its own message so Telegram can load the preview
   * @param {Object} ctx - Telegraf context
   * @param {Array} results - Search results
   * @param {string} language - Language code
   * @param {Object} searchParams - Search parameters
   */
  async sendResultsAsSeparateMessages(ctx, results, language, searchParams) {
    try {
      // Get formatted messages (header + individual listings + footer)
      const { header, listings, footer } = responseFormatter.formatSearchResultsAsSeparateMessages(
        results,
        language,
        searchParams
      );

      // Send header first
      if (header) {
        await ctx.reply(header, { parse_mode: 'Markdown', disable_web_page_preview: true });
      }

      // Send each listing as a separate message with small delay
      // This allows Telegram to load the URL preview for each listing
      for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];

        // Small delay between messages to avoid rate limiting and allow preview loading
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        try {
          // Send with web preview enabled so the listing URL shows a preview
          await ctx.reply(listing, {
            parse_mode: 'Markdown',
            disable_web_page_preview: false // Enable preview for listings
          });
        } catch (msgError) {
          // If markdown fails, try plain text
          console.warn(`[TELEGRAM] Failed to send listing ${i + 1} with markdown, trying plain text`);
          await ctx.reply(listing.replace(/[*_`]/g, ''), {
            disable_web_page_preview: false
          });
        }
      }

      // Send footer
      if (footer) {
        await new Promise(resolve => setTimeout(resolve, 200));
        await ctx.reply(footer, { parse_mode: 'Markdown', disable_web_page_preview: true });
      }

    } catch (error) {
      console.error('[TELEGRAM] Error sending separate messages:', error);
      // Fallback to single message format
      const formattedMessage = responseFormatter.formatSearchResults(results, language, null, searchParams);
      await this.sendFormattedMessage(ctx, formattedMessage);
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

