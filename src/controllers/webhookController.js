const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const telegramBot = require('../services/messaging/TelegramBot');

/**
 * Webhook Controller
 * Handles webhooks from messaging platforms
 */

/**
 * Telegram webhook handler
 * POST /api/webhooks/telegram
 *
 * Note: This endpoint is handled by the Telegram bot's webhookCallback middleware
 * which is set up in the server initialization
 */
exports.telegram = asyncHandler(async (req, res) => {
  logger.info('Telegram webhook received', {
    update_id: req.body.update_id,
    message: req.body.message?.text?.substring(0, 50)
  });

  // The actual processing is handled by TelegramBot service
  // This is just a fallback/logging endpoint
  res.status(200).json({
    success: true,
    message: 'Telegram webhook processed'
  });
});

/**
 * WhatsApp webhook handler
 * POST /api/webhooks/whatsapp
 */
exports.whatsapp = asyncHandler(async (req, res) => {
  logger.info('WhatsApp webhook received', { body: req.body });

  // TODO: Implement WhatsApp webhook handling
  res.status(200).json({
    success: true,
    message: 'WhatsApp webhook endpoint ready for implementation'
  });
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
