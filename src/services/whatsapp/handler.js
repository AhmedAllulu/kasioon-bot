const axios = require('axios');
const logger = require('../../utils/logger');
const aiAgent = require('../ai/agent');
const marketplaceSearch = require('../search/marketplaceSearch');
const audioProcessor = require('../audio/processor');

class WhatsAppHandler {
  constructor() {
    this.apiToken = process.env.WHATSAPP_API_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Verify webhook
   */
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('WhatsApp webhook verified');
      return challenge;
    }

    return null;
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(body) {
    try {
      if (body.object !== 'whatsapp_business_account') {
        return;
      }

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) {
        return;
      }

      const message = value.messages[0];
      const from = message.from;

      logger.info(`Received WhatsApp message from ${from}`);

      // Mark message as read
      await this.markAsRead(message.id);

      // Handle different message types
      if (message.type === 'text') {
        await this.handleTextMessage(from, message.text.body);
      } else if (message.type === 'audio' || message.type === 'voice') {
        await this.handleVoiceMessage(from, message.audio || message.voice);
      }

    } catch (error) {
      logger.error('Error handling WhatsApp webhook:', error);
    }
  }

  /**
   * Handle text message
   */
  async handleTextMessage(phoneNumber, text) {
    try {
      logger.info(`Processing text message: ${text}`);

      // Detect language from message content
      const detectLanguage = (messageText) => {
        if (!messageText || typeof messageText !== 'string') return 'ar';
        const arabicPattern = /[\u0600-\u06FF]/;
        const hasArabic = arabicPattern.test(messageText);
        const arabicChars = (messageText.match(/[\u0600-\u06FF]/g) || []).length;
        const englishChars = (messageText.match(/[a-zA-Z]/g) || []).length;
        if (hasArabic && arabicChars > messageText.length * 0.1) return 'ar';
        if (englishChars > messageText.length * 0.5) return 'en';
        return 'ar';
      };
      
      const detectedLanguage = detectLanguage(text);
      console.log('🌐 [WHATSAPP] Language detected:', detectedLanguage);

      // Send typing indicator
      await this.sendTypingIndicator(phoneNumber);

      // Analyze message with AI using detected language
      const searchParams = await aiAgent.analyzeMessage(text, detectedLanguage);

      if (Object.keys(searchParams).length === 0) {
        const noParamsMessage = detectedLanguage === 'ar'
          ? 'عذراً، لم أفهم طلبك. يرجى تحديد ما تبحث عنه بوضوح أكثر.\nمثال: "أريد تويوتا في حلب"'
          : 'Sorry, I didn\'t understand your request. Please specify what you\'re looking for more clearly.\nExample: "I want a Toyota in Aleppo"';
        await this.sendMessage(phoneNumber, noParamsMessage);
        return;
      }

      // Search marketplace
      const results = await marketplaceSearch.search(searchParams);

      // Format results - pass original message for language detection
      const formattedMessage = await aiAgent.formatResults(results, detectedLanguage, text);

      // Send results (split if necessary)
      await this.sendLongMessage(phoneNumber, formattedMessage);

    } catch (error) {
      logger.error('Error handling WhatsApp text message:', error);
      // Try to detect language for error message, default to Arabic
      const detectLanguage = (messageText) => {
        if (!messageText || typeof messageText !== 'string') return 'ar';
        const arabicPattern = /[\u0600-\u06FF]/;
        const hasArabic = arabicPattern.test(messageText);
        const arabicChars = (messageText.match(/[\u0600-\u06FF]/g) || []).length;
        const englishChars = (messageText.match(/[a-zA-Z]/g) || []).length;
        if (hasArabic && arabicChars > messageText.length * 0.1) return 'ar';
        if (englishChars > messageText.length * 0.5) return 'en';
        return 'ar';
      };
      const errorLanguage = detectLanguage(text);
      const errorMessage = errorLanguage === 'ar'
        ? 'عذراً، حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.'
        : 'Sorry, an error occurred during the search. Please try again.';
      await this.sendMessage(phoneNumber, errorMessage);
    }
  }

  /**
   * Handle voice message
   */
  async handleVoiceMessage(phoneNumber, audio) {
    try {
      logger.info('Processing voice message');

      await this.sendTypingIndicator(phoneNumber);

      // Download audio file
      const audioUrl = await this.getMediaUrl(audio.id);
      const audioBuffer = await audioProcessor.downloadAudio(audioUrl);

      // Transcribe
      const transcribedText = await aiAgent.transcribeAudio(audioBuffer);

      logger.info('Transcribed text:', transcribedText);

      // Detect language for confirmation message
      const detectLanguage = (messageText) => {
        if (!messageText || typeof messageText !== 'string') return 'ar';
        const arabicPattern = /[\u0600-\u06FF]/;
        const hasArabic = arabicPattern.test(messageText);
        const arabicChars = (messageText.match(/[\u0600-\u06FF]/g) || []).length;
        const englishChars = (messageText.match(/[a-zA-Z]/g) || []).length;
        if (hasArabic && arabicChars > messageText.length * 0.1) return 'ar';
        if (englishChars > messageText.length * 0.5) return 'en';
        return 'ar';
      };
      
      const detectedLanguage = detectLanguage(transcribedText);
      const confirmMessage = detectedLanguage === 'ar'
        ? `فهمت: "${transcribedText}"\n\nأبحث عن النتائج...`
        : `I understood: "${transcribedText}"\n\nSearching for results...`;

      // Send confirmation
      await this.sendMessage(phoneNumber, confirmMessage);

      // Continue with text processing
      await this.handleTextMessage(phoneNumber, transcribedText);

    } catch (error) {
      logger.error('Error handling WhatsApp voice message:', error);
      await this.sendMessage(phoneNumber, 
        'عذراً، لم أتمكن من معالجة الرسالة الصوتية. يرجى المحاولة مرة أخرى.'
      );
    }
  }

  /**
   * Send message
   */
  async sendMessage(to, text) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: text }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('WhatsApp message sent successfully');
      return response.data;

    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send long message (split if necessary)
   */
  async sendLongMessage(to, text) {
    const maxLength = 4000;
    
    if (text.length <= maxLength) {
      return await this.sendMessage(to, text);
    }

    // Split message
    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk) chunks.push(currentChunk);

    // Send chunks
    for (const chunk of chunks) {
      await this.sendMessage(to, chunk);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(to) {
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: '⏳' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      logger.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId) {
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      logger.error('Error marking message as read:', error);
    }
  }

  /**
   * Get media URL
   */
  async getMediaUrl(mediaId) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      return response.data.url;

    } catch (error) {
      logger.error('Error getting media URL:', error);
      throw error;
    }
  }
}

module.exports = new WhatsAppHandler();

