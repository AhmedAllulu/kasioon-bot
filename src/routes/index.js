const express = require('express');
const router = express.Router();

const searchRoutes = require('./searchRoutes');
const webhookRoutes = require('./webhookRoutes');
const healthRoutes = require('./healthRoutes');

// Mount routes
router.use('/search', searchRoutes);
router.use('/analyze', searchRoutes); // /api/analyze endpoint
router.use('/webhooks', webhookRoutes);
router.use('/health', healthRoutes);

module.exports = router;
