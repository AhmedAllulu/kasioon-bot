const searchService = require('../services/search/SearchService');
const whisperService = require('../services/ai/WhisperService');
const telegramFormatter = require('../services/messaging/TelegramFormatter');
const whatsAppFormatter = require('../services/messaging/WhatsAppFormatter');
const responseFormatter = require('../utils/responseFormatter');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Webhook Controller
 * Handles Telegram and WhatsApp webhooks from n8n
 */

/**
 * Telegram webhook handler
 * POST /api/webhooks/telegram
 */
exports.telegram = asyncHandler(async (req, res) => {
  const {
    chatId,
    userId,
    username,
    messageType = 'text',
    text,
    voiceFileId,
    language = 'ar'
  } = req.body;

  logger.info('Telegram webhook received', {
    chatId,
    userId,
    messageType,
    text: text?.substring(0, 50)
  });

  try {
    let searchQuery = text;

    // Handle voice messages
    if (messageType === 'voice' && voiceFileId) {
      // In production, you would download the voice file from Telegram
      // For now, we'll just return an error
      return res.json(
        responseFormatter.success({
          reply: telegramFormatter.formatError(
            'دعم الرسائل الصوتية قيد التطوير حالياً',
            language
          )
        })
      );
    }

    if (!searchQuery) {
      return res.json(
        responseFormatter.success({
          reply: telegramFormatter.formatError(
            'الرجاء إرسال نص البحث',
            language
          )
        })
      );
    }

    // Perform search
    const results = await searchService.search({
      query: searchQuery,
      language,
      source: 'telegram',
      userId,
      page: 1,
      limit: 10
    });

    // Format for Telegram
    const reply = telegramFormatter.formatSearchResults(results, language);

    res.json(responseFormatter.success({ reply }));
  } catch (error) {
    logger.error('Telegram webhook error:', error);

    const reply = telegramFormatter.formatError(
      error.message || 'حدث خطأ أثناء البحث',
      language
    );

    res.json(responseFormatter.success({ reply }));
  }
});

/**
 * WhatsApp webhook handler
 * POST /api/webhooks/whatsapp
 */
exports.whatsapp = asyncHandler(async (req, res) => {
  const {
    from,
    messageType = 'text',
    text,
    audioUrl,
    timestamp,
    language = 'ar'
  } = req.body;

  logger.info('WhatsApp webhook received', {
    from,
    messageType,
    text: text?.substring(0, 50)
  });

  try {
    let searchQuery = text;

    // Handle audio messages
    if (messageType === 'audio' && audioUrl) {
      // In production, you would download and transcribe the audio
      return res.json(
        responseFormatter.success({
          reply: whatsAppFormatter.formatError(
            'دعم الرسائل الصوتية قيد التطوير حالياً',
            language
          )
        })
      );
    }

    if (!searchQuery) {
      return res.json(
        responseFormatter.success({
          reply: whatsAppFormatter.formatError(
            'الرجاء إرسال نص البحث',
            language
          )
        })
      );
    }

    // Perform search
    const results = await searchService.search({
      query: searchQuery,
      language,
      source: 'whatsapp',
      userId: from,
      page: 1,
      limit: 10
    });

    // Format for WhatsApp
    const reply = whatsAppFormatter.formatSearchResults(results, language);

    res.json(responseFormatter.success({ reply }));
  } catch (error) {
    logger.error('WhatsApp webhook error:', error);

    const reply = whatsAppFormatter.formatError(
      error.message || 'حدث خطأ أثناء البحث',
      language
    );

    res.json(responseFormatter.success({ reply }));
  }
});

/**
 * WhatsApp verification (for Meta webhook setup)
 * GET /api/webhooks/whatsapp
 */
exports.whatsappVerify = asyncHandler(async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      logger.info('WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

module.exports = exports;
