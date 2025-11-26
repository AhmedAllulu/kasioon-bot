const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { validateWebhook } = require('../middleware/validator');

/**
 * @route   POST /api/webhooks/telegram
 * @desc    Telegram webhook endpoint
 * @access  Public (secured by Telegram's validation)
 *
 * Note: The Telegram webhook is handled by the TelegramBot service
 * via the webhookCallback middleware which is registered BEFORE this router in server.js
 * So this route will never be reached for Telegram webhooks - it's here for documentation only
 */
// Telegram route is handled by Telegraf middleware in server.js, not here

/**
 * @route   POST /api/webhooks/whatsapp
 * @desc    WhatsApp webhook from n8n or Meta
 * @access  Public (should be secured in production)
 */
router.post('/whatsapp', validateWebhook, webhookController.whatsapp);

/**
 * @route   GET /api/webhooks/whatsapp
 * @desc    WhatsApp webhook verification (for Meta)
 * @access  Public
 */
router.get('/whatsapp', webhookController.whatsappVerify);

module.exports = router;
