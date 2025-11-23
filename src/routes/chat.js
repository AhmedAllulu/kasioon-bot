const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { detectLanguage } = require('../utils/languageDetector');

// Services
const aiAgent = require('../services/ai/agent');
const intentClassifier = require('../services/ai/intentClassifier');
const responseFormatter = require('../services/ai/responseFormatter');
const contextManager = require('../services/conversation/contextManager');
const historyTracker = require('../services/conversation/historyTracker');
const searchHistory = require('../services/db/searchHistory');
const dynamicDataManager = require('../services/data/dynamicDataManager');

/**
 * Chat API - Replicates bot functionality for website/mobile integration
 *
 * This API provides the same intelligent search capabilities as the Telegram/WhatsApp bot
 * but in a RESTful format suitable for web and mobile applications.
 */

/**
 * Async route handler wrapper
 */
const asyncHandler = (fn, context) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(error => {
    logger.error(`Error in ${context}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: 'INTERNAL_ERROR'
    });
  });
};

/**
 * Initialize dynamic data if not already loaded
 */
async function ensureDataLoaded() {
  const stats = dynamicDataManager.getCacheStats();
  if (!stats.categoriesLoaded) {
    await dynamicDataManager.loadStructure('ar');
    await dynamicDataManager.getCategories('ar');
  }
}

/**
 * POST /api/chat
 *
 * Main chat endpoint - processes user messages exactly like the bot does
 *
 * Request body:
 * {
 *   "message": "سيارة تويوتا في دمشق",     // Required: User message
 *   "sessionId": "user-123",                // Optional: Session ID for context
 *   "language": "ar",                       // Optional: Language (auto-detected if not provided)
 *   "userName": "Ahmad"                     // Optional: User name for personalized responses
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "sessionId": "user-123",
 *   "intent": "search",
 *   "intentConfidence": 0.95,
 *   "language": "ar",
 *   "response": {
 *     "type": "search_results",             // greeting, help, search_results, no_results, etc.
 *     "message": "...",                     // Formatted text message
 *     "results": [...],                     // Search results (if type is search_results)
 *     "resultsCount": 5,
 *     "searchParams": {...}                 // Extracted search parameters
 *   },
 *   "context": {
 *     "messageCount": 3,
 *     "searchCount": 2,
 *     "lastSearch": {...}
 *   }
 * }
 */
router.post('/', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { message, sessionId, language: providedLanguage, userName } = req.body;

  // Validate input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Message is required',
      errorCode: 'MISSING_MESSAGE'
    });
  }

  const userMessage = message.trim();

  // Generate or use provided session ID
  const userId = sessionId || `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Ensure dynamic data is loaded
  await ensureDataLoaded();

  // Get user context
  const userContext = contextManager.getContext(userId);

  // Detect language
  const language = providedLanguage || userContext.preferredLanguage || detectLanguage(userMessage);

  logger.info(`[CHAT-API] Processing message from session ${userId}:`, userMessage);

  // Check for repeated messages
  if (historyTracker.isRepeatedMessage(userId, userMessage)) {
    return res.json({
      success: true,
      sessionId: userId,
      intent: 'repeated',
      language,
      response: {
        type: 'repeated_message',
        message: language === 'ar'
          ? 'لقد أرسلت نفس الرسالة للتو. هل تريد تجربة بحث مختلف؟'
          : 'You just sent the same message. Want to try a different search?'
      }
    });
  }

  // Classify intent
  const intentResult = intentClassifier.classify(userMessage, {
    lastIntent: userContext.lastIntent,
    lastSearchParams: userContext.lastSearchParams
  });

  logger.info(`[CHAT-API] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence})`);

  // Update context
  contextManager.updateContext(userId, {
    lastMessage: userMessage,
    lastIntent: intentResult.intent,
    lastIntentConfidence: intentResult.confidence,
    preferredLanguage: language
  });

  // Handle different intents
  let responseData;

  switch (intentResult.intent) {
    case intentClassifier.intentTypes.GREETING:
      responseData = {
        type: 'greeting',
        message: responseFormatter.formatGreeting(userName || 'Friend', language)
      };
      break;

    case intentClassifier.intentTypes.HELP:
      responseData = {
        type: 'help',
        message: language === 'ar'
          ? `🤖 *كيف يمكنني مساعدتك؟*\n\nأنا مساعد ذكي للبحث في سوق قاسيون السوري.\n\n*أمثلة على طلبات البحث:*\n• "سيارة للبيع في دمشق"\n• "شقة للإيجار في حلب بسعر أقل من 500 ألف"\n• "موبايل سامسونج مستعمل"\n\nأرسل ما تبحث عنه وسأساعدك!`
          : `🤖 *How can I help you?*\n\nI'm an intelligent assistant for Kasioon marketplace.\n\n*Search examples:*\n• "car for sale in Damascus"\n• "apartment for rent in Aleppo under 500k"\n• "used Samsung phone"\n\nSend what you're looking for!`
      };
      break;

    case intentClassifier.intentTypes.GOODBYE:
      responseData = {
        type: 'goodbye',
        message: language === 'ar'
          ? 'مع السلامة! سعدت بمساعدتك 👋\nإذا احتجت شي ثاني، أنا هنا!'
          : 'Goodbye! Happy to help you 👋\nIf you need anything else, I\'m here!'
      };
      break;

    case intentClassifier.intentTypes.FEEDBACK:
      const sentiment = intentResult.sentiment || 'neutral';
      responseData = {
        type: 'feedback',
        sentiment,
        message: sentiment === 'positive'
          ? (language === 'ar' ? '😊 شكراً على ملاحظاتك الإيجابية!' : '😊 Thanks for the positive feedback!')
          : sentiment === 'negative'
          ? (language === 'ar' ? '😔 عذراً إذا لم تكن النتائج كما توقعت. جرب تعديل معايير البحث.' : '😔 Sorry the results weren\'t as expected. Try adjusting your search.')
          : (language === 'ar' ? 'شكراً على ملاحظاتك!' : 'Thanks for your feedback!')
      };
      break;

    case intentClassifier.intentTypes.UNCLEAR:
      responseData = {
        type: 'unclear',
        message: intentResult.clarificationQuestion || responseFormatter.getNoResultsMessage(language)
      };
      break;

    case intentClassifier.intentTypes.SEARCH:
    default:
      // Perform search
      responseData = await handleSearchIntent(userId, userMessage, language, userContext, startTime);
      break;
  }

  // Build response
  const response = {
    success: true,
    sessionId: userId,
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    language,
    response: responseData,
    context: {
      messageCount: userContext.messageCount + 1,
      searchCount: userContext.searchCount,
      lastSearchTimestamp: userContext.lastSearchTimestamp
    },
    processingTimeMs: Date.now() - startTime
  };

  res.json(response);

}, 'chat message'));

/**
 * Handle search intent
 */
async function handleSearchIntent(userId, userMessage, language, userContext, startTime) {
  try {
    // Check cache first
    const cachedResults = await searchHistory.getCachedResults(userMessage);
    if (cachedResults && cachedResults.length > 0) {
      logger.info('[CHAT-API] Using cached results');

      contextManager.saveSearchResults(userId, {}, cachedResults);

      return {
        type: 'search_results',
        message: formatResultsForAPI(cachedResults, language),
        results: cachedResults.slice(0, 7),
        resultsCount: cachedResults.length,
        fromCache: true
      };
    }

    // Analyze message with AI
    const extractedParams = await aiAgent.analyzeMessage(userMessage, language);
    logger.info('[CHAT-API] Extracted params:', extractedParams);

    // Search marketplace
    const searchResponse = await aiAgent.searchMarketplace(extractedParams, userMessage, language);
    const { results: filteredResults, filterDescription, matchedFilters, fallbackMessage } = searchResponse;

    // Save to context
    contextManager.saveSearchResults(userId, extractedParams, filteredResults);

    // Log search
    await searchHistory.logSearch({
      userId,
      platform: 'web-api',
      queryText: userMessage,
      extractedParams,
      resultsCount: filteredResults.length,
      responseTimeMs: Date.now() - startTime,
      category: extractedParams.category,
      city: extractedParams.city,
      language
    });

    // Cache if enough results
    if (filteredResults.length >= 3) {
      await searchHistory.cacheResults(userMessage, filteredResults);
    }

    if (filteredResults.length > 0) {
      return {
        type: 'search_results',
        message: formatResultsForAPI(filteredResults, language),
        results: formatResultsData(filteredResults.slice(0, 7)),
        resultsCount: filteredResults.length,
        searchParams: extractedParams,
        filterDescription,
        matchedFilters,
        fallbackMessage
      };
    } else {
      return {
        type: 'no_results',
        message: responseFormatter.getNoResultsMessage(language, extractedParams),
        searchParams: extractedParams,
        suggestions: generateSearchSuggestions(extractedParams, language)
      };
    }

  } catch (error) {
    logger.error('[CHAT-API] Search error:', error);
    return {
      type: 'error',
      message: responseFormatter.formatError('search_error', language),
      error: error.message
    };
  }
}

/**
 * Format results for API response (clean version without Telegram markdown)
 */
function formatResultsForAPI(results, language) {
  const isArabic = language === 'ar';
  const count = Math.min(results.length, 7);

  let message = isArabic
    ? `✨ وجدت ${count} نتيجة\n\n`
    : `✨ Found ${count} results\n\n`;

  results.slice(0, 7).forEach((item, index) => {
    const title = item.title || (isArabic ? 'بدون عنوان' : 'No title');
    message += `${index + 1}. ${title}\n`;

    const price = item.attributes?.price || item.price;
    if (price) {
      message += isArabic ? `   💰 السعر: ${formatPrice(price)}\n` : `   💰 Price: ${formatPrice(price)}\n`;
    }

    const location = getLocationText(item);
    if (location) {
      message += isArabic ? `   📍 ${location}\n` : `   📍 ${location}\n`;
    }

    if (item.id) {
      message += `   🔗 https://www.kasioon.com/listing/${item.id}/\n`;
    }

    message += '\n';
  });

  return message;
}

/**
 * Format results data for structured API response
 */
function formatResultsData(results) {
  return results.map(item => ({
    id: item.id,
    title: item.title,
    price: item.attributes?.price || item.price,
    location: getLocationText(item),
    category: item.category?.name || item.category,
    url: `https://www.kasioon.com/listing/${item.id}/`,
    image: getFirstImage(item),
    attributes: item.attributes || {},
    matchScore: item.matchScore,
    attributeMatch: item._attributeMatch
  }));
}

/**
 * Get location text from item
 */
function getLocationText(item) {
  if (!item.location) return null;

  if (typeof item.location === 'string') return item.location;

  if (item.location.city) {
    const city = typeof item.location.city === 'string'
      ? item.location.city
      : item.location.city.name;
    if (item.location.province && item.location.province !== city) {
      return `${city}, ${item.location.province}`;
    }
    return city;
  }

  return item.location.province || null;
}

/**
 * Get first image URL
 */
function getFirstImage(item) {
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    const firstImage = item.images[0];
    return typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage);
  }
  if (item.image) {
    return typeof item.image === 'string' ? item.image : (item.image.url || item.image);
  }
  return null;
}

/**
 * Format price value
 */
function formatPrice(price) {
  if (!price) return null;

  if (typeof price === 'object') {
    const value = price.value;
    const unit = price.unit_ar || price.unit_en || '';
    return `${Number(value).toLocaleString()} ${unit}`;
  }

  return Number(price).toLocaleString();
}

/**
 * Generate search suggestions
 */
function generateSearchSuggestions(params, language) {
  const isArabic = language === 'ar';
  const suggestions = [];

  if (params.minPrice || params.maxPrice) {
    suggestions.push(isArabic ? 'جرب إزالة فلتر السعر' : 'Try removing the price filter');
  }
  if (params.city || params.province) {
    suggestions.push(isArabic ? 'جرب البحث في محافظات أخرى' : 'Try searching in other provinces');
  }
  if (params.category) {
    suggestions.push(isArabic ? 'جرب فئة أوسع' : 'Try a broader category');
  }

  return suggestions;
}

/**
 * POST /api/chat/voice
 *
 * Process voice message - transcribes audio and processes as text
 *
 * Request: multipart/form-data with audio file
 * - audio: Audio file (ogg, mp3, wav, m4a)
 * - sessionId: Optional session ID
 * - language: Optional language hint
 */
router.post('/voice', asyncHandler(async (req, res) => {
  const startTime = Date.now();

  // Check if we have audio data
  if (!req.body.audio && !req.files?.audio) {
    return res.status(400).json({
      success: false,
      error: 'Audio data is required',
      errorCode: 'MISSING_AUDIO'
    });
  }

  const { sessionId, language: providedLanguage } = req.body;
  const userId = sessionId || `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Get audio buffer
    let audioBuffer;
    if (req.files?.audio) {
      audioBuffer = req.files.audio.data;
    } else if (req.body.audio) {
      // Handle base64 encoded audio
      audioBuffer = Buffer.from(req.body.audio, 'base64');
    }

    // Transcribe audio
    logger.info('[CHAT-API] Transcribing audio...');
    const transcribedText = await aiAgent.transcribeAudio(audioBuffer);

    if (!transcribedText || transcribedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not transcribe audio',
        errorCode: 'TRANSCRIPTION_FAILED'
      });
    }

    logger.info('[CHAT-API] Transcribed:', transcribedText);

    // Detect language from transcription
    const language = providedLanguage || detectLanguage(transcribedText);

    // Process as regular chat message
    const userContext = contextManager.getContext(userId);

    // Classify intent
    const intentResult = intentClassifier.classify(transcribedText, {
      lastIntent: userContext.lastIntent,
      lastSearchParams: userContext.lastSearchParams
    });

    // Update context
    contextManager.updateContext(userId, {
      lastMessage: transcribedText,
      lastIntent: intentResult.intent,
      lastIntentConfidence: intentResult.confidence,
      preferredLanguage: language
    });

    // Handle search (most common for voice)
    const responseData = await handleSearchIntent(userId, transcribedText, language, userContext, startTime);

    res.json({
      success: true,
      sessionId: userId,
      transcription: transcribedText,
      intent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      language,
      response: responseData,
      processingTimeMs: Date.now() - startTime
    });

  } catch (error) {
    logger.error('[CHAT-API] Voice processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice message',
      errorCode: 'VOICE_PROCESSING_ERROR',
      details: error.message
    });
  }
}, 'voice message'));

/**
 * GET /api/chat/session/:sessionId
 *
 * Get session information and history
 */
router.get('/session/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const context = contextManager.getContext(sessionId);
  const stats = contextManager.getStats(sessionId);

  res.json({
    success: true,
    sessionId,
    context: {
      messageCount: context.messageCount,
      searchCount: context.searchCount,
      preferredLanguage: context.preferredLanguage,
      preferredCity: context.preferredCity,
      lastIntent: context.lastIntent,
      lastSearchParams: context.lastSearchParams,
      messageHistory: context.messageHistory?.slice(-5) || []
    },
    stats
  });
}, 'get session'));

/**
 * DELETE /api/chat/session/:sessionId
 *
 * Clear session and start fresh
 */
router.delete('/session/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  contextManager.clearContext(sessionId);

  res.json({
    success: true,
    message: 'Session cleared successfully'
  });
}, 'clear session'));

/**
 * GET /api/chat/suggestions
 *
 * Get search suggestions based on popular/trending searches
 */
router.get('/suggestions', asyncHandler(async (req, res) => {
  const { language = 'ar' } = req.query;

  try {
    const trending = await searchHistory.getTrendingSearches(10);

    res.json({
      success: true,
      suggestions: trending.map(item => ({
        query: item.query_text,
        category: item.category,
        searchCount: item.search_count
      })),
      examples: language === 'ar' ? [
        'سيارة تويوتا في دمشق',
        'شقة للإيجار في حلب',
        'موبايل آيفون',
        'أثاث منزلي',
        'لابتوب مستعمل'
      ] : [
        'Toyota car in Damascus',
        'Apartment for rent in Aleppo',
        'iPhone mobile',
        'Home furniture',
        'Used laptop'
      ]
    });
  } catch (error) {
    res.json({
      success: true,
      suggestions: [],
      examples: language === 'ar' ? [
        'سيارة تويوتا في دمشق',
        'شقة للإيجار في حلب'
      ] : [
        'Toyota car in Damascus',
        'Apartment for rent'
      ]
    });
  }
}, 'get suggestions'));

/**
 * GET /api/chat/welcome
 *
 * Get welcome message for new users
 */
router.get('/welcome', asyncHandler(async (req, res) => {
  const { name = 'Friend', language = 'ar' } = req.query;

  const welcomeMessage = responseFormatter.formatWelcome(name, language);

  res.json({
    success: true,
    message: welcomeMessage,
    language
  });
}, 'get welcome'));

module.exports = router;
