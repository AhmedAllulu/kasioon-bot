const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const logger = require('../../utils/logger');
const aiAgent = require('../ai/agent');
const marketplaceSearch = require('../search/marketplaceSearch');
const audioProcessor = require('../audio/processor');

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
    this.bot.start((ctx) => {
      console.log('📱 [TELEGRAM] Received /start command from user:', {
        id: ctx.from.id,
        username: ctx.from.username || 'N/A',
        first_name: ctx.from.first_name,
        language: ctx.from.language_code
      });
      
      const welcomeMessage = ctx.from.language_code === 'ar'
        ? `مرحباً ${ctx.from.first_name}! 👋\n\nأنا بوت البحث في سوق kasioon.com. أستطيع مساعدتك في العثور على ما تبحث عنه.\n\nفقط أخبرني ما تبحث عنه، مثل:\n"أريد سيارة تويوتا في حلب"\n"شقة للبيع في دمشق"\n"لابتوب مستعمل"\n"أثاث غرفة نوم"\n\nيمكنك أيضاً إرسال رسالة صوتية! 🎤`
        : `Welcome ${ctx.from.first_name}! 👋\n\nI'm the kasioon.com marketplace search bot. I can help you find what you're looking for.\n\nJust tell me what you need, like:\n"I want a Toyota car in Aleppo"\n"Apartment for sale in Damascus"\n"Used laptop"\n"Bedroom furniture"\n\nYou can also send a voice message! 🎤`;
      
      ctx.reply(welcomeMessage);
    });

    // Help command
    this.bot.help((ctx) => {
      console.log('📱 [TELEGRAM] Received /help command from user:', {
        id: ctx.from.id,
        username: ctx.from.username || 'N/A',
        first_name: ctx.from.first_name
      });
      
      const helpMessage = ctx.from.language_code === 'ar'
        ? `كيف تستخدم البوت:\n\n1️⃣ أرسل رسالة نصية تصف ما تبحث عنه\n2️⃣ أو أرسل رسالة صوتية\n3️⃣ سأقوم بالبحث وإرسال النتائج لك\n\nأمثلة:\n• "أريد سيارة تويوتا في حلب"\n• "شقة للإيجار في دمشق"\n• "موبايل آيفون"\n• "أثاث مستعمل"`
        : `How to use the bot:\n\n1️⃣ Send a text message describing what you're looking for\n2️⃣ Or send a voice message\n3️⃣ I'll search and send you the results\n\nExamples:\n• "I want a Toyota car in Aleppo"\n• "Apartment for rent in Damascus"\n• "iPhone mobile"\n• "Used furniture"`;
      
      ctx.reply(helpMessage);
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
    try {
      const userMessage = ctx.message.text;
      const userId = ctx.from.id;
      
      // Detect language from message content, not user settings
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
      
      const detectedLanguage = detectLanguage(userMessage);
      const language = detectedLanguage; // Use detected language

      console.log('💬 [TELEGRAM] Processing text message:', {
        user_id: userId,
        message: userMessage,
        detected_language: detectedLanguage,
        user_language_code: ctx.from.language_code
      });

      logger.info(`Received text message from user ${userId}:`, userMessage);

      // Send typing action
      console.log('⌨️  [TELEGRAM] Sending typing indicator...');
      await ctx.sendChatAction('typing');

      // Analyze message with AI
      console.log('🤖 [AI] Starting message analysis...');
      console.log('📝 [AI] Input:', {
        message: userMessage,
        language: language
      });
      
      const searchParams = await aiAgent.analyzeMessage(userMessage, language);

      console.log('✅ [AI] Analysis complete!');
      console.log('📊 [AI] Extracted parameters:', JSON.stringify(searchParams, null, 2));
      logger.info('Extracted search params:', searchParams);

      // Check if we have any search parameters
      if (Object.keys(searchParams).length === 0) {
        console.log('⚠️  [AI] No search parameters extracted!');
        const noParamsMessage = language === 'ar'
          ? 'عذراً، لم أفهم طلبك. يرجى تحديد ما تبحث عنه بوضوح أكثر.\nمثال: "أريد تويوتا في حلب"'
          : 'Sorry, I didn\'t understand your request. Please specify what you\'re looking for more clearly.\nExample: "I want a Toyota in Aleppo"';
        
        return ctx.reply(noParamsMessage);
      }

      // Search marketplace
      console.log('🔍 [SEARCH] Starting marketplace search...');
      console.log('📋 [SEARCH] Search parameters:', JSON.stringify(searchParams, null, 2));
      
      await ctx.sendChatAction('typing');
      const results = await marketplaceSearch.search(searchParams);
      
      console.log('✅ [SEARCH] Search complete!');
      console.log('📊 [SEARCH] Results:', {
        count: results.length,
        sample: results.length > 0 ? results[0] : null
      });

      // Format and send results
      console.log('📝 [AI] Formatting results for user...');
      console.log('📊 [AI] Formatting:', {
        results_count: results.length,
        language: language
      });
      
      // Pass the original user message so AI can detect and match the language
      const formattedMessage = await aiAgent.formatResults(results, language, userMessage);
      
      console.log('✅ [AI] Formatting complete!');
      console.log('📄 [AI] Formatted message length:', formattedMessage.length);
      console.log('📄 [AI] Formatted message preview:', formattedMessage.substring(0, 200) + '...');
      
      console.log('✅ [TELEGRAM] Sending response:', {
        user_id: userId,
        results_count: results.length,
        message_length: formattedMessage.length
      });
      
      // Split message if too long (Telegram limit is 4096 characters)
      if (formattedMessage.length > 4000) {
        const chunks = this.splitMessage(formattedMessage, 4000);
        console.log(`📤 [TELEGRAM] Splitting message into ${chunks.length} chunks`);
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      } else {
        await ctx.reply(formattedMessage);
      }

    } catch (error) {
      console.error('❌ [ERROR] Error in handleTextMessage:', {
        message: error.message,
        stack: error.stack,
        user_id: userId
      });
      logger.error('Error handling text message:', error);
      ctx.reply('عذراً، حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.\nSorry, an error occurred during the search. Please try again.');
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

  splitMessage(message, maxLength) {
    const chunks = [];
    let currentChunk = '';
    const lines = message.split('\n');

    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk) chunks.push(currentChunk);
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

