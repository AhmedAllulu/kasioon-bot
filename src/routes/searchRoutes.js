const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const voiceController = require('../controllers/voiceController');
const { validateSearch, validateAnalyze, validateCategorySearch } = require('../middleware/validator');
const { strictLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const path = require('path');

// Configure multer for voice file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|mp4|m4a|wav|webm|ogg|oga/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid audio file format'));
    }
  }
});

/**
 * @route   POST /api/search
 * @desc    Main search endpoint
 * @access  Public
 */
router.post('/', validateSearch, searchController.search);

/**
 * @route   POST /api/analyze
 * @desc    Analyze query without searching
 * @access  Public
 */
router.post('/analyze', validateAnalyze, searchController.analyze);

/**
 * @route   POST /api/search/voice
 * @desc    Voice message search
 * @access  Public (with strict rate limiting)
 */
router.post('/voice', strictLimiter, upload.single('audio'), voiceController.voiceSearch);

/**
 * @route   GET /api/search/category/:categoryId
 * @desc    Search by category
 * @access  Public
 */
router.get('/category/:categoryId', validateCategorySearch, searchController.searchByCategory);

module.exports = router;
