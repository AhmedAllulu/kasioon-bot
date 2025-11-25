const database = require('../../config/database');
const openAIService = require('../ai/OpenAIService');
const arabicNormalizer = require('../../utils/arabicNormalizer');
const logger = require('../../utils/logger');

class AttributeExtractor {
  constructor() {
    this.db = database;
    this.ai = openAIService;
  }

  /**
   * Extract attributes from query based on category
   * @param {string} query - Search query
   * @param {string} categoryId - Category UUID
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Promise<Object>} Extracted attributes
   */
  async extract(query, categoryId, language = 'ar') {
    if (!categoryId || !query) {
      return {};
    }

    try {
      logger.debug('Extracting attributes', { categoryId, query: query.substring(0, 50) });

      // Get available attributes for this category
      const availableAttributes = await this.getCategoryAttributes(categoryId);

      if (availableAttributes.length === 0) {
        logger.debug('No attributes defined for category', { categoryId });
        return {};
      }

      // Extract using pattern matching first (fast)
      const patternExtracted = this.extractByPatterns(query, availableAttributes, language);

      // If we have good coverage, return pattern results
      if (Object.keys(patternExtracted).length >= 2) {
        logger.info('Attributes extracted via patterns', {
          categoryId,
          count: Object.keys(patternExtracted).length
        });
        return patternExtracted;
      }

      // Otherwise, use AI for more complex extraction
      const aiExtracted = await this.extractByAI(
        query,
        categoryId,
        availableAttributes,
        language
      );

      // Merge results (pattern results take precedence)
      const merged = { ...aiExtracted, ...patternExtracted };

      logger.info('Attributes extracted', {
        categoryId,
        count: Object.keys(merged).length,
        attributes: Object.keys(merged)
      });

      return merged;
    } catch (error) {
      logger.error('Attribute extraction error:', error);
      return {};
    }
  }

  /**
   * Extract attributes using regex patterns (fast)
   * @param {string} query - Search query
   * @param {Array} attributes - Available attributes
   * @param {string} language - Language
   * @returns {Object} Extracted attributes
   */
  extractByPatterns(query, attributes, language) {
    const extracted = {};
    const normalized = arabicNormalizer.normalize(query);

    // Price patterns
    if (this.hasAttribute(attributes, 'price')) {
      const price = this.extractPrice(normalized, language);
      if (price) {
        extracted.price = price;
      }
    }

    // Area patterns (متر مربع)
    if (this.hasAttribute(attributes, 'area')) {
      const area = this.extractArea(normalized, language);
      if (area) {
        extracted.area = area;
      }
    }

    // Rooms patterns (غرف/غرفة)
    if (this.hasAttribute(attributes, 'rooms')) {
      const rooms = this.extractRooms(normalized, language);
      if (rooms) {
        extracted.rooms = rooms;
      }
    }

    // Bathrooms patterns
    if (this.hasAttribute(attributes, 'bathrooms')) {
      const bathrooms = this.extractBathrooms(normalized, language);
      if (bathrooms) {
        extracted.bathrooms = bathrooms;
      }
    }

    // Year patterns
    if (this.hasAttribute(attributes, 'year')) {
      const year = this.extractYear(normalized);
      if (year) {
        extracted.year = year;
      }
    }

    // Condition patterns (جديد/مستعمل)
    if (this.hasAttribute(attributes, 'condition')) {
      const condition = this.extractCondition(normalized, language);
      if (condition) {
        extracted.condition = condition;
      }
    }

    // Mileage patterns (كيلومتر)
    if (this.hasAttribute(attributes, 'mileage')) {
      const mileage = this.extractMileage(normalized, language);
      if (mileage) {
        extracted.mileage = mileage;
      }
    }

    return extracted;
  }

  /**
   * Extract attributes using AI
   * @param {string} query - Search query
   * @param {string} categoryId - Category ID
   * @param {Array} attributes - Available attributes
   * @param {string} language - Language
   * @returns {Promise<Object>} Extracted attributes
   */
  async extractByAI(query, categoryId, attributes, language) {
    try {
      const categorySlug = attributes[0]?.category_slug || 'general';
      const extracted = await this.ai.extractAttributes(
        query,
        categorySlug,
        attributes,
        language
      );

      return extracted.attributes || extracted || {};
    } catch (error) {
      logger.error('AI attribute extraction error:', error);
      return {};
    }
  }

  /**
   * Get category attributes from database
   * @param {string} categoryId - Category UUID
   * @returns {Promise<Array>} Category attributes
   */
  async getCategoryAttributes(categoryId) {
    try {
      const result = await this.db.query(
        `
        SELECT
          la.id,
          la.slug,
          la.name_ar,
          la.name_en,
          la.type,
          la.unit_ar,
          la.unit_en,
          la.options,
          ca.is_required,
          ca.is_filterable,
          c.slug as category_slug
        FROM listing_attributes la
        JOIN category_attributes ca ON la.id = ca.attribute_id
        JOIN categories c ON ca.category_id = c.id
        WHERE ca.category_id = $1
          AND la.is_active = true
          AND ca.is_filterable = true
        ORDER BY ca.sort_order ASC
        `,
        [categoryId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Get category attributes error:', error);
      return [];
    }
  }

  /**
   * Check if attribute exists in available attributes
   * @param {Array} attributes - Available attributes
   * @param {string} slug - Attribute slug
   * @returns {boolean}
   */
  hasAttribute(attributes, slug) {
    return attributes.some(attr => attr.slug === slug);
  }

  /**
   * Extract price from text
   * @param {string} text - Text
   * @param {string} language - Language
   * @returns {Object|null} Price range
   */
  extractPrice(text, language) {
    // Price range patterns: "من 100000 الى 200000" or "بين 100000 و 200000"
    const rangeMatch = text.match(/(?:من|بين)\s*(\d+(?:,\d+)*)\s*(?:الى|و|إلى)\s*(\d+(?:,\d+)*)/);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1].replace(/,/g, '')),
        max: parseInt(rangeMatch[2].replace(/,/g, ''))
      };
    }

    // Max price: "اقل من 100000" or "حتى 100000"
    const maxMatch = text.match(/(?:اقل من|حتى|أقل من|لغاية)\s*(\d+(?:,\d+)*)/);
    if (maxMatch) {
      return {
        max: parseInt(maxMatch[1].replace(/,/g, ''))
      };
    }

    // Min price: "اكثر من 100000" or "فوق 100000"
    const minMatch = text.match(/(?:اكثر من|فوق|أكثر من|من)\s*(\d+(?:,\d+)*)/);
    if (minMatch) {
      return {
        min: parseInt(minMatch[1].replace(/,/g, ''))
      };
    }

    // Price indicators
    if (language === 'ar') {
      if (/رخيص|رخيصه/.test(text)) {
        return { max: 5000000 }; // Under 5 million SYP
      }
      if (/غالي|غاليه/.test(text)) {
        return { min: 20000000 }; // Over 20 million SYP
      }
    }

    return null;
  }

  /**
   * Extract area from text
   * @param {string} text - Text
   * @param {string} language - Language
   * @returns {Object|null} Area value
   */
  extractArea(text, language) {
    const match = text.match(/(\d+)\s*(?:متر|م²|م2|مربع|sqm)/);
    if (match) {
      return { value: parseInt(match[1]) };
    }
    return null;
  }

  /**
   * Extract number of rooms from text
   * @param {string} text - Text
   * @param {string} language - Language
   * @returns {number|null} Number of rooms
   */
  extractRooms(text, language) {
    const match = text.match(/(\d+)\s*(?:غرف|غرفه|غرفة|rooms?)/);
    if (match) {
      return parseInt(match[1]);
    }

    // Text numbers
    const textNumbers = {
      'غرفة': 1,
      'غرفتين': 2,
      'ثلاث': 3,
      'اربع': 4,
      'خمس': 5
    };

    for (const [word, num] of Object.entries(textNumbers)) {
      if (text.includes(word)) {
        return num;
      }
    }

    return null;
  }

  /**
   * Extract number of bathrooms from text
   * @param {string} text - Text
   * @param {string} language - Language
   * @returns {number|null} Number of bathrooms
   */
  extractBathrooms(text, language) {
    const match = text.match(/(\d+)\s*(?:حمام|حمامات|bathroom)/);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
  }

  /**
   * Extract year from text
   * @param {string} text - Text
   * @returns {number|null} Year
   */
  extractYear(text) {
    const match = text.match(/(?:موديل|سنة|عام|model|year)\s*(20\d{2})/);
    if (match) {
      return parseInt(match[1]);
    }

    // Standalone 4-digit year
    const yearMatch = text.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      return parseInt(yearMatch[1]);
    }

    return null;
  }

  /**
   * Extract condition from text
   * @param {string} text - Text
   * @param {string} language - Language
   * @returns {string|null} Condition
   */
  extractCondition(text, language) {
    if (language === 'ar') {
      if (/جديد|جديده|صفر/.test(text)) {
        return 'new';
      }
      if (/مستعمل|مستعمله/.test(text)) {
        return 'used';
      }
    } else {
      if (/\bnew\b/i.test(text)) {
        return 'new';
      }
      if (/\bused\b/i.test(text)) {
        return 'used';
      }
    }
    return null;
  }

  /**
   * Extract mileage from text
   * @param {string} text - Text
   * @param {string} language - Language
   * @returns {Object|null} Mileage value
   */
  extractMileage(text, language) {
    const match = text.match(/(\d+)\s*(?:كيلو|كم|km|kilometer)/);
    if (match) {
      return { value: parseInt(match[1]) };
    }
    return null;
  }
}

// Singleton instance
module.exports = new AttributeExtractor();
