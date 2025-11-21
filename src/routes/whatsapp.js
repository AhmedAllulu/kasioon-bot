const express = require('express');
const router = express.Router();
const whatsappHandler = require('../services/whatsapp/handler');
const logger = require('../utils/logger');

// WhatsApp webhook verification
router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const result = whatsappHandler.verifyWebhook(mode, token, challenge);

    if (result) {
      return res.status(200).send(challenge);
    }

    res.sendStatus(403);

  } catch (error) {
    logger.error('Error verifying WhatsApp webhook:', error);
    res.sendStatus(500);
  }
});

// WhatsApp webhook for incoming messages
router.post('/webhook', async (req, res) => {
  try {
    logger.info('Received WhatsApp webhook');
    
    // Respond quickly to WhatsApp
    res.sendStatus(200);

    // Process webhook asynchronously
    await whatsappHandler.handleWebhook(req.body);

  } catch (error) {
    logger.error('Error handling WhatsApp webhook:', error);
  }
});

module.exports = router;

