const searchService = require('../services/search/SearchService');
const whisperService = require('../services/ai/WhisperService');
const openAIService = require('../services/ai/OpenAIService');
const intentService = require('../services/intent/IntentService');
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

    // Detect user intent from transcribed text
    const intent = await openAIService.detectIntent(transcription, language);

    logger.info('Voice intent detected', {
      original: transcription.substring(0, 50),
      intent: intent.intent
    });

    // Route based on intent
    let results;

    switch (intent.intent) {
      case 'search':
        if (!intent.query) {
          return res.status(400).json(
            responseFormatter.error('No search query found in the transcribed audio', 400)
          );
        }

        results = await searchService.search({
          query: intent.query,
          language,
          source,
          userId,
          page: 1,
          limit: 10
        });

        res.json(
          responseFormatter.success({
            transcription,
            intent: intent.intent,
            cleanedQuery: intent.query,
            searchResults: results.data
          })
        );
        break;

      case 'most_viewed':
        results = await intentService.getMostViewedListings(
          intent.limit || 10,
          language
        );
        res.json(
          responseFormatter.success({
            transcription,
            intent: intent.intent,
            ...results
          })
        );
        break;

      case 'most_impressioned':
        results = await intentService.getMostImpressionedListings(
          intent.limit || 10,
          language
        );
        res.json(
          responseFormatter.success({
            transcription,
            intent: intent.intent,
            ...results
          })
        );
        break;

      case 'get_offices':
        results = await intentService.getOffices(
          intent.limit || 20,
          language
        );
        res.json(
          responseFormatter.success({
            transcription,
            intent: intent.intent,
            ...results
          })
        );
        break;

      case 'get_office_details':
        if (!intent.officeId) {
          return res.status(400).json(
            responseFormatter.error(
              language === 'ar'
                ? 'يرجى تحديد رقم أو اسم المكتب'
                : 'Please specify office ID or name',
              400
            )
          );
        }
        results = await intentService.getOfficeDetails(intent.officeId, language);
        if (!results.success) {
          return res.status(404).json(responseFormatter.error(results.error, 404));
        }
        res.json(
          responseFormatter.success({
            transcription,
            intent: intent.intent,
            ...results
          })
        );
        break;

      case 'get_office_listings':
        if (!intent.officeId) {
          return res.status(400).json(
            responseFormatter.error(
              language === 'ar'
                ? 'يرجى تحديد رقم أو اسم المكتب'
                : 'Please specify office ID or name',
              400
            )
          );
        }
        results = await intentService.getOfficeListings(
          intent.officeId,
          intent.limit || 10,
          language
        );
        if (!results.success) {
          return res.status(404).json(responseFormatter.error(results.error, 404));
        }
        res.json(
          responseFormatter.success({
            transcription,
            intent: intent.intent,
            ...results
          })
        );
        break;

      case 'greeting':
        results = intentService.getGreetingMessage(language);
        res.json(
          responseFormatter.success({
            transcription,
            ...results
          })
        );
        break;

      case 'help':
        results = intentService.getHelpMessage(language);
        res.json(
          responseFormatter.success({
            transcription,
            ...results
          })
        );
        break;

      default:
        return res.status(400).json(
          responseFormatter.error('Unknown intent type', 400)
        );
    }
  } catch (error) {
    logger.error('Voice search error:', error);
    throw error;
  }
});

module.exports = exports;
