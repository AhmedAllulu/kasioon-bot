const openAIConfig = require('../../config/openai');
const redisCache = require('../../config/redis');
const logger = require('../../utils/logger');
const { AIServiceError } = require('../../utils/errorHandler');
const crypto = require('crypto');

class OpenAIService {
  constructor() {
    this.client = openAIConfig.getClient();
    this.models = {
      chat: openAIConfig.getModel('chat'),
      chatFast: openAIConfig.getModel('chatFast'),
      embedding: openAIConfig.getModel('embedding')
    };
  }

  /**
   * Parse natural language query using GPT-4o
   * @param {string} query - User query
   * @param {string} language - Language ('ar' or 'en')
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} Parsed query structure
   */
  async parseQuery(query, language = 'ar', useCache = true) {
    try {
      // Check cache
      if (useCache) {
        const cacheKey = redisCache.generateKey('ai', 'parse', this.hashString(query), language);
        const cached = await redisCache.get(cacheKey);
        if (cached) {
          logger.debug('Query parse cache hit', { query });
          return cached;
        }
      }

      const prompt = this.buildQueryParsePrompt(language);
      const userMessage = `Extract structured information from this query: "${query}"`;

      const completion = await this.client.chat.completions.create({
        model: this.models.chat,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 800
      });

      const content = completion.choices[0].message.content;
      const parsed = JSON.parse(content);

      logger.info('Query parsed successfully', {
        query: query.substring(0, 50),
        categoryHint: parsed.categoryHint,
        locationHint: parsed.locationHint
      });

      // Cache result
      if (useCache) {
        const cacheKey = redisCache.generateKey('ai', 'parse', this.hashString(query), language);
        await redisCache.set(cacheKey, parsed, redisCache.getTTL('ai'));
      }

      return parsed;
    } catch (error) {
      logger.error('OpenAI query parse error:', error);
      throw new AIServiceError(`Failed to parse query: ${error.message}`);
    }
  }

  /**
   * Create embeddings for text
   * @param {string|Array<string>} input - Text or array of texts
   * @returns {Promise<Array<number>|Array<Array<number>>>} Embedding(s)
   */
  async createEmbedding(input) {
    try {
      const isArray = Array.isArray(input);
      const texts = isArray ? input : [input];

      const response = await this.client.embeddings.create({
        model: this.models.embedding,
        input: texts,
        encoding_format: 'float',
        dimensions: 1536 // Reduced from 3072 for pgvector compatibility
      });

      const embeddings = response.data.map(item => item.embedding);

      logger.debug('Embeddings created', {
        count: embeddings.length,
        dimensions: embeddings[0]?.length
      });

      return isArray ? embeddings : embeddings[0];
    } catch (error) {
      logger.error('OpenAI embedding error:', error);
      throw new AIServiceError(`Failed to create embeddings: ${error.message}`);
    }
  }

  /**
   * Extract attributes from query text based on category
   * @param {string} query - Search query
   * @param {string} categorySlug - Category slug
   * @param {Array} availableAttributes - Available attributes for this category
   * @param {string} language - Language
   * @returns {Promise<Object>} Extracted attributes
   */
  async extractAttributes(query, categorySlug, availableAttributes, language = 'ar') {
    try {
      const prompt = this.buildAttributeExtractionPrompt(categorySlug, availableAttributes, language);
      const userMessage = `Extract attributes from: "${query}"`;

      const completion = await this.client.chat.completions.create({
        model: this.models.chatFast,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 500
      });

      const content = completion.choices[0].message.content;
      const attributes = JSON.parse(content);

      logger.debug('Attributes extracted', { categorySlug, attributes });

      return attributes;
    } catch (error) {
      logger.error('OpenAI attribute extraction error:', error);
      // Return empty attributes on error, don't fail the whole search
      return {};
    }
  }

  /**
   * Build query parsing system prompt
   * @param {string} language - Language
   * @returns {string} System prompt
   */
  buildQueryParsePrompt(language) {
    return `You are a query parser for a Syrian marketplace (Qasioun). Extract structured information from Arabic/English search queries.

Database Context:
- Categories: cars (سيارات), motorcycles (دراجات نارية), apartments (شقق), houses (منازل), land (أراضي), phones (هواتف), computers (حواسيب), jobs (وظائف), services (خدمات), furniture (أثاث), clothing (ملابس), etc.
- Syrian Governorates: Damascus (دمشق), Aleppo (حلب), Homs (حمص), Hama (حماة), Latakia (اللاذقية), Tartus (طرطوس), Idlib (إدلب), Deir ez-Zor (دير الزور), Raqqa (الرقة), Hasakah (الحسكة), Daraa (درعا), Suwayda (السويداء), Quneitra (القنيطرة), Rural Damascus (ريف دمشق)
- Transaction Types: sale (للبيع), rent (للإيجار), exchange (للتبادل), wanted (مطلوب), daily_rent (للإيجار اليومي)

Extract from the query:
1. categoryHint: What type of item/service (be specific, e.g., "سيارة" not just "مركبة")
2. locationHint: City or area mentioned (use standard name, e.g., "دمشق" not "الشام")
3. transactionType: sale/rent/exchange/wanted (default: sale)
4. priceIndicator: "cheap"/"expensive"/specific range
5. conditionIndicator: "new"/"used"/null
6. keywords: Important search keywords (array of strings)

Price indicators:
- "رخيص/رخيصة" = cheap
- "غالي/غالية" = expensive
- Numbers with "ليرة" or "دولار" = specific price

Condition indicators:
- "جديد/جديدة" = new
- "مستعمل/مستعملة" = used

Syrian dialect translations:
- "بدي" = "أريد" (I want)
- "شو" = "ماذا" (what)
- "وين" = "أين" (where)

Output JSON only with this structure:
{
  "categoryHint": "string or null",
  "locationHint": "string or null",
  "transactionType": "sale/rent/exchange/wanted or null",
  "priceIndicator": "cheap/expensive or null",
  "conditionIndicator": "new/used or null",
  "keywords": ["array", "of", "keywords"]
}`;
  }

  /**
   * Build attribute extraction system prompt
   * @param {string} categorySlug - Category slug
   * @param {Array} attributes - Available attributes
   * @param {string} language - Language
   * @returns {string} System prompt
   */
  buildAttributeExtractionPrompt(categorySlug, attributes, language) {
    const attrList = attributes.map(attr =>
      `- ${attr.slug}: ${language === 'ar' ? attr.name_ar : attr.name_en} (${attr.type})`
    ).join('\n');

    return `Extract specific attributes from a search query for category: ${categorySlug}

Available attributes for this category:
${attrList}

Extract values mentioned in the query. For numeric values, extract just the number. For text values, extract the exact term mentioned.

Common patterns:
- "غرفتين" or "2 غرفة" = rooms: 2
- "200 متر" = area: 200
- "سامسونج" = brand: "سامسونج"
- "موديل 2020" = year: 2020

Output JSON only with extracted attributes:
{
  "attributeSlug1": value,
  "attributeSlug2": value
}

Only include attributes that are explicitly mentioned in the query.`;
  }

  /**
   * Generate cache key hash from string
   * @param {string} str - String to hash
   * @returns {string} Hash
   */
  hashString(str) {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * Test OpenAI connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      logger.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
module.exports = new OpenAIService();
