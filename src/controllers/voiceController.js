const searchService = require('../services/search/SearchService');
const whisperService = require('../services/ai/WhisperService');
const responseFormatter = require('../utils/responseFormatter');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const path = require('path');

/**
 * Voice Controller
 * Handles voice message transcription and search
 */

/**
 * Voice search endpoint
 * POST /api/search/voice
 */
exports.voiceSearch = asyncHandler(async (req, res) => {
  const { source = 'api', userId, language = 'ar' } = req.body;

  logger.info('Voice search request received', {
    source,
    userId,
    hasFile: !!req.file
  });

  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json(
      responseFormatter.error('Audio file is required', 400)
    );
  }

  try {
    // Validate audio file
    await whisperService.validateAudioFile(req.file.path);

    // Transcribe audio
    const transcription = await whisperService.transcribe(req.file.path, language);

    logger.info('Voice transcribed', {
      transcription: transcription.substring(0, 50),
      source
    });

    // Perform search with transcribed text
    const results = await searchService.search({
      query: transcription,
      language,
      source,
      userId,
      page: 1,
      limit: 10
    });

    res.json(
      responseFormatter.success({
        transcription,
        searchResults: results.data
      })
    );
  } catch (error) {
    logger.error('Voice search error:', error);
    throw error;
  }
});

module.exports = exports;
