const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { validateWebhook } = require('../middleware/validator');

/**
 * @route   POST /api/webhooks/telegram
 * @desc    Telegram webhook from n8n
 * @access  Public (should be secured in production)
 */
router.post('/telegram', validateWebhook, webhookController.telegram);

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
