const openAIConfig = require('../../config/openai');
const logger = require('../../utils/logger');
const { AIServiceError } = require('../../utils/errorHandler');
const fs = require('fs').promises;
const path = require('path');

class WhisperService {
  constructor() {
    this.client = openAIConfig.getClient();
    this.model = 'whisper-1';
    this.uploadsDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Transcribe audio file to text
   * @param {string} audioPath - Path to audio file
   * @param {string} language - Language code ('ar' for Arabic)
   * @returns {Promise<string>} Transcribed text
   */
  async transcribe(audioPath, language = 'ar') {
    try {
      logger.info('Starting audio transcription', { audioPath, language });

      // Check if file exists
      await fs.access(audioPath);

      // Create readable stream
      const audioStream = await fs.readFile(audioPath);

      // Transcribe using Whisper
      const transcription = await this.client.audio.transcriptions.create({
        file: await this.createFileObject(audioPath),
        model: this.model,
        language: language === 'ar' ? 'ar' : language,
        response_format: 'json',
        temperature: 0.2
      });

      const text = transcription.text.trim();

      logger.info('Audio transcribed successfully', {
        textLength: text.length,
        preview: text.substring(0, 50)
      });

      // Clean up temp file
      await this.cleanupFile(audioPath);

      return text;
    } catch (error) {
      logger.error('Whisper transcription error:', error);

      // Clean up on error
      await this.cleanupFile(audioPath).catch(() => {});

      throw new AIServiceError(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Transcribe audio from buffer
   * @param {Buffer} audioBuffer - Audio buffer
   * @param {string} filename - Original filename
   * @param {string} language - Language code
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeBuffer(audioBuffer, filename, language = 'ar') {
    try {
      // Ensure uploads directory exists
      await fs.mkdir(this.uploadsDir, { recursive: true });

      // Create temp file
      const tempPath = path.join(this.uploadsDir, `temp_${Date.now()}_${filename}`);
      await fs.writeFile(tempPath, audioBuffer);

      // Transcribe
      const text = await this.transcribe(tempPath, language);

      return text;
    } catch (error) {
      logger.error('Whisper buffer transcription error:', error);
      throw new AIServiceError(`Failed to transcribe audio buffer: ${error.message}`);
    }
  }

  /**
   * Create file object for OpenAI API
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} File object
   */
  async createFileObject(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);

    return new File([fileBuffer], filename, {
      type: this.getMimeType(filename)
    });
  }

  /**
   * Get MIME type from filename
   * @param {string} filename - Filename
   * @returns {string} MIME type
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.ogg': 'audio/ogg',
      '.oga': 'audio/ogg'
    };
    return mimeTypes[ext] || 'audio/mpeg';
  }

  /**
   * Clean up temporary file
   * @param {string} filePath - Path to file
   */
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.debug('Temp file cleaned up', { filePath });
    } catch (error) {
      logger.warn('Failed to cleanup temp file', { filePath, error: error.message });
    }
  }

  /**
   * Validate audio file
   * @param {string} filePath - Path to audio file
   * @returns {Promise<boolean>} Valid or not
   */
  async validateAudioFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const maxSize = 25 * 1024 * 1024; // 25MB (Whisper limit)

      if (stats.size > maxSize) {
        throw new Error('Audio file exceeds 25MB limit');
      }

      const ext = path.extname(filePath).toLowerCase();
      const supportedFormats = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.ogg', '.oga'];

      if (!supportedFormats.includes(ext)) {
        throw new Error(`Unsupported audio format: ${ext}`);
      }

      return true;
    } catch (error) {
      logger.error('Audio validation error:', error);
      throw new Error(`Invalid audio file: ${error.message}`);
    }
  }
}

// Singleton instance
module.exports = new WhisperService();
