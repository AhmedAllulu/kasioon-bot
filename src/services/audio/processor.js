const axios = require('axios');
const logger = require('../../utils/logger');

class AudioProcessor {
  /**
   * Download audio file from URL
   * @param {string} url - Audio file URL
   * @returns {Promise<Buffer>} Audio buffer
   */
  async downloadAudio(url) {
    try {
      logger.info('Downloading audio file from:', url);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const buffer = Buffer.from(response.data);
      logger.info(`Audio downloaded: ${buffer.length} bytes`);

      return buffer;

    } catch (error) {
      logger.error('Error downloading audio:', error);
      throw new Error('Failed to download audio file');
    }
  }

  /**
   * Convert audio to supported format if needed
   * @param {Buffer} audioBuffer - Original audio buffer
   * @param {string} format - Target format (e.g., 'ogg', 'mp3')
   * @returns {Promise<Buffer>} Converted audio buffer
   */
  async convertAudio(audioBuffer, format = 'ogg') {
    try {
      // For now, return the original buffer
      // You can add ffmpeg conversion here if needed
      return audioBuffer;

    } catch (error) {
      logger.error('Error converting audio:', error);
      throw error;
    }
  }
}

module.exports = new AudioProcessor();

