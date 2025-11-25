const OpenAI = require('openai');
const logger = require('../utils/logger');

class OpenAIConfig {
  constructor() {
    this.client = null;
    this.models = {
      chat: process.env.OPENAI_MODEL || 'gpt-4o',
      chatFast: process.env.OPENAI_MODEL_FAST || 'gpt-4o-mini',
      chatPowerful: process.env.OPENAI_MODEL_POWERFUL || 'gpt-4o',
      embedding: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
      whisper: 'whisper-1'
    };
  }

  initialize() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    this.client = new OpenAI({
      apiKey: apiKey,
      timeout: 30000,
      maxRetries: 2
    });

    logger.info('OpenAI client initialized', {
      model: this.models.chat,
      fastModel: this.models.chatFast,
      embeddingModel: this.models.embedding
    });

    return this.client;
  }

  getClient() {
    if (!this.client) {
      this.initialize();
    }
    return this.client;
  }

  getModel(type = 'chat') {
    return this.models[type] || this.models.chat;
  }
}

// Singleton instance
const openAIConfig = new OpenAIConfig();

module.exports = openAIConfig;
