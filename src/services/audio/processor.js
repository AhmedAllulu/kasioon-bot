const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
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
   * Convert OGG/OPUS to MP3 for better compatibility with Whisper API
   * @param {Buffer} audioBuffer - Original audio buffer (OGG/OPUS)
   * @returns {Promise<Buffer>} Converted audio buffer (MP3)
   */
  async convertToMp3(audioBuffer) {
    const tempInput = path.join(os.tmpdir(), `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.ogg`);
    const tempOutput = path.join(os.tmpdir(), `output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`);

    try {
      logger.info('Converting audio to MP3 format...');

      // Write input buffer to temp file
      await fs.writeFile(tempInput, audioBuffer);

      // Convert using FFmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .toFormat('mp3')
          .audioCodec('libmp3lame')
          .audioFrequency(16000) // 16kHz is optimal for speech recognition
          .audioChannels(1) // Mono channel for speech
          .audioBitrate('32k') // Lower bitrate for smaller files (speech-optimized)
          .on('end', () => {
            logger.info('Audio conversion completed successfully');
            resolve();
          })
          .on('error', (err) => {
            logger.error('FFmpeg conversion error:', err);
            reject(err);
          })
          .save(tempOutput);
      });

      // Read converted file
      const mp3Buffer = await fs.readFile(tempOutput);
      logger.info(`Audio converted: ${audioBuffer.length} bytes → ${mp3Buffer.length} bytes`);

      // Cleanup temp files
      await this.cleanupTempFiles([tempInput, tempOutput]);

      return mp3Buffer;

    } catch (error) {
      logger.error('Error converting audio to MP3:', error);

      // Cleanup on error
      await this.cleanupTempFiles([tempInput, tempOutput]);

      throw new Error(`Failed to convert audio format: ${error.message}`);
    }
  }

  /**
   * Clean up temporary files
   * @param {string[]} filePaths - Array of file paths to delete
   */
  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore errors - file may not exist
        logger.debug(`Cleanup: Could not delete ${filePath}`);
      }
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use convertToMp3 instead
   */
  async convertAudio(audioBuffer, format = 'mp3') {
    if (format === 'mp3') {
      return this.convertToMp3(audioBuffer);
    }
    // For other formats, return as-is
    return audioBuffer;
  }
}

module.exports = new AudioProcessor();

