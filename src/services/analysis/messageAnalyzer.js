const dynamicDataManager = require('../data/dynamicDataManager');
const logger = require('../../utils/logger');

/**
 * Dynamic Message Analyzer
 * Uses data fetched from API to analyze user messages
 * NO static data - everything is dynamic
 */
class MessageAnalyzer {
  constructor() {
    // Number patterns (these are regex patterns, not static data)
    this.numberPatterns = {
      // Price with unit
      priceWithUnit: /(\d+(?:[,،]\d{3})*(?:\.\d+)?)\s*(ليرة|ل\.س|مليون|ألف|دولار|\$|USD|SYP)/gi,
      // Price with keyword
      priceWithKeyword: /(?:سعر[هـ]?[ا]?|بـ?سعر|price)\s*(\d+(?:[,،]\d{3})*)/gi,
      // Area
      area: /(\d+)\s*(?:متر|م2|م²|sqm|square|meter)/gi,
      // Year
      year: /(?:موديل|سنة|model|year)\s*(\d{4})/gi,
      // Rooms
      rooms: /(\d+)\s*(?:غرف|غرفة|rooms?|bedroom)/gi,
      // Bathrooms
      bathrooms: /(\d+)\s*(?:حمام|حمامات|bathroom|wc)/gi,
      // Mileage
      mileage: /(\d+(?:[,،]\d{3})*)\s*(?:كم|كيلو|km|kilometer)/gi,
      // Floor
      floor: /(?:طابق|دور|floor)\s*(\d+)/gi,
      // Range: from X to Y
      range: /(?:من|between)\s*(\d+(?:[,،]\d{3})*)\s*(?:إلى|الى|لـ?|to|-)\s*(\d+(?:[,،]\d{3})*)/gi,
      // Less than
      lessThan: /(?:أقل من|تحت|under|less than|max)\s*(\d+(?:[,،]\d{3})*)/gi,
      // More than
      moreThan: /(?:أكثر من|فوق|over|more than|min)\s*(\d+(?:[,،]\d{3})*)/gi
    };

    // Transaction type patterns
    this.transactionPatterns = {
      sale: /(?:للبيع|بيع|for\s*sale|sell)/i,
      rent: /(?:للإيجار|للايجار|إيجار|ايجار|أجار|for\s*rent|rent)/i
    };

    // Condition patterns
    this.conditionPatterns = {
      new: /(?:جديد[ة]?|new)/i,
      used: /(?:مستعمل[ة]?|used)/i,
      excellent: /(?:ممتاز[ة]?|excellent)/i
    };

    // Boolean patterns
    this.booleanPatterns = {
      furnished: { positive: /مفروش[ة]?|furnished/i, negative: /غير مفروش|فارغ[ة]?|unfurnished/i },
      parking: { positive: /موقف|كراج|parking|garage/i },
      garden: { positive: /حديقة|garden/i },
      pool: { positive: /مسبح|pool/i },
      elevator: { positive: /مصعد|elevator|lift/i },
      balcony: { positive: /بلكون[ة]?|شرفة|balcony/i },
      ac: { positive: /تكييف|مكيف|ac|air\s*condition/i }
    };
  }

  /**
   * Analyze user message
   * @param {string} message - User message
   * @param {string} language - Language
   * @returns {Object} Analysis result
   */
  async analyze(message, language = 'ar') {
    console.log('🔍 [ANALYZER] Starting analysis:', message.substring(0, 50));

    // Ensure data is loaded
    await dynamicDataManager.loadStructure(language);

    const result = {
      category: null,
      transactionType: null,
      location: null,
      attributes: {},
      keywords: [],
      confidence: 0,
      raw: { message, language }
    };

    // 1. Extract category
    result.category = await this.extractCategory(message, language);

    // 2. Extract transaction type
    result.transactionType = this.extractTransactionType(message);

    // 3. Extract location
    result.location = this.extractLocation(message);

    // 4. Extract numbers and basic filters
    const basicFilters = this.extractBasicFilters(message);
    Object.assign(result.attributes, basicFilters);

    // 5. If category found, get its filters and extract values
    if (result.category?.slug) {
      const categoryFilters = await this.extractCategorySpecificFilters(
        message,
        result.category.slug,
        language
      );
      Object.assign(result.attributes, categoryFilters);
    }

    // 6. Extract remaining keywords
    result.keywords = this.extractKeywords(message, result);

    // 7. Calculate confidence
    result.confidence = this.calculateConfidence(result);

    console.log('📊 [ANALYZER] Analysis result:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Extract category from message
   */
  async extractCategory(message, language) {
    const words = message.toLowerCase().split(/\s+/);

    // 1. Local search first (fast)
    for (const word of words) {
      if (word.length < 2) continue;

      const found = dynamicDataManager.findCategoryLocally(word);
      if (found) {
        return {
          slug: found.slug,
          name: found.name || found.name_ar || found.name_en,
          level: found.level,
          parent: found.parent?.slug
        };
      }
    }

    // 2. Compound search (two words together)
    for (let i = 0; i < words.length - 1; i++) {
      const compound = `${words[i]} ${words[i + 1]}`;
      const found = dynamicDataManager.findCategoryLocally(compound);
      if (found) {
        return {
          slug: found.slug,
          name: found.name || found.name_ar || found.name_en,
          level: found.level,
          parent: found.parent?.slug
        };
      }
    }

    // 3. API search (if not found locally)
    for (const word of words) {
      if (word.length < 3) continue;

      const apiResults = await dynamicDataManager.searchCategories(word, language);
      if (apiResults.length > 0) {
        const best = apiResults[0];
        return {
          slug: best.slug,
          name: best.name,
          level: best.level,
          parent: best.parent?.slug
        };
      }
    }

    return null;
  }

  /**
   * Extract transaction type
   */
  extractTransactionType(message) {
    if (this.transactionPatterns.sale.test(message)) {
      return 'for-sale';
    }
    if (this.transactionPatterns.rent.test(message)) {
      return 'for-rent';
    }
    return null;
  }

  /**
   * Extract location
   */
  extractLocation(message) {
    const words = message.toLowerCase().split(/\s+/);

    for (const word of words) {
      if (word.length < 2) continue;

      const found = dynamicDataManager.findLocationLocally(word);
      if (found) {
        return {
          name: found.names[0],
          type: found.type,
          id: found.id
        };
      }
    }

    return null;
  }

  /**
   * Extract basic filters (numbers)
   */
  extractBasicFilters(message) {
    const filters = {};

    // Price with unit
    let match = this.numberPatterns.priceWithUnit.exec(message);
    if (match) {
      let value = parseFloat(match[1].replace(/[,،]/g, ''));
      const unit = match[2].toLowerCase();

      if (unit.includes('مليون')) value *= 1000000;
      else if (unit.includes('ألف')) value *= 1000;

      filters.price = { value };
    }

    // Price with keyword
    this.numberPatterns.priceWithKeyword.lastIndex = 0;
    match = this.numberPatterns.priceWithKeyword.exec(message);
    if (match && !filters.price) {
      filters.price = { value: parseFloat(match[1].replace(/[,،]/g, '')) };
    }

    // Area
    this.numberPatterns.area.lastIndex = 0;
    match = this.numberPatterns.area.exec(message);
    if (match) {
      filters.area = { value: parseInt(match[1]) };
    }

    // Rooms
    this.numberPatterns.rooms.lastIndex = 0;
    match = this.numberPatterns.rooms.exec(message);
    if (match) {
      filters.rooms = parseInt(match[1]);
    }

    // Bathrooms
    this.numberPatterns.bathrooms.lastIndex = 0;
    match = this.numberPatterns.bathrooms.exec(message);
    if (match) {
      filters.bathrooms = parseInt(match[1]);
    }

    // Year
    this.numberPatterns.year.lastIndex = 0;
    match = this.numberPatterns.year.exec(message);
    if (match) {
      filters.year = parseInt(match[1]);
    }

    // Mileage
    this.numberPatterns.mileage.lastIndex = 0;
    match = this.numberPatterns.mileage.exec(message);
    if (match) {
      filters.mileage = parseInt(match[1].replace(/[,،]/g, ''));
    }

    // Ranges
    this.numberPatterns.range.lastIndex = 0;
    match = this.numberPatterns.range.exec(message);
    if (match) {
      const min = parseFloat(match[1].replace(/[,،]/g, ''));
      const max = parseFloat(match[2].replace(/[,،]/g, ''));

      // Determine if price or area
      if (max > 10000) {
        filters.price = { min, max };
      } else {
        filters.area = { min, max };
      }
    }

    // Less than
    this.numberPatterns.lessThan.lastIndex = 0;
    match = this.numberPatterns.lessThan.exec(message);
    if (match) {
      const value = parseFloat(match[1].replace(/[,،]/g, ''));
      if (value > 10000) {
        if (!filters.price) filters.price = {};
        filters.price.max = value;
      }
    }

    // More than
    this.numberPatterns.moreThan.lastIndex = 0;
    match = this.numberPatterns.moreThan.exec(message);
    if (match) {
      const value = parseFloat(match[1].replace(/[,،]/g, ''));
      if (value > 10000) {
        if (!filters.price) filters.price = {};
        filters.price.min = value;
      }
    }

    // Condition
    for (const [condition, pattern] of Object.entries(this.conditionPatterns)) {
      if (pattern.test(message)) {
        filters.condition = condition;
        break;
      }
    }

    // Boolean filters
    for (const [attr, patterns] of Object.entries(this.booleanPatterns)) {
      if (patterns.negative?.test(message)) {
        filters[attr] = false;
      } else if (patterns.positive.test(message)) {
        filters[attr] = true;
      }
    }

    return filters;
  }

  /**
   * Extract category-specific filters (from API)
   */
  async extractCategorySpecificFilters(message, categorySlug, language) {
    const filters = {};

    // Get category filters
    const filterData = await dynamicDataManager.getCategoryFilters(categorySlug, language);
    if (!filterData?.filters?.attributes) return filters;

    const lowerMessage = message.toLowerCase();

    for (const attr of filterData.filters.attributes) {
      // Skip already extracted filters
      if (['price', 'area', 'rooms', 'bathrooms', 'year', 'mileage'].includes(attr.slug)) {
        continue;
      }

      // Search for filter name in message
      const attrNames = [attr.name, attr.slug].filter(Boolean).map(n => n.toLowerCase());
      const mentioned = attrNames.some(name => lowerMessage.includes(name));

      if (!mentioned && attr.type !== 'select') continue;

      // Extract value based on type
      switch (attr.type) {
        case 'select':
          // Search in options
          if (attr.options?.length) {
            for (const option of attr.options) {
              const optionLabel = (option.label || option.value || option).toLowerCase();
              if (lowerMessage.includes(optionLabel)) {
                filters[attr.slug] = option.value || option;
                break;
              }
            }
          }
          break;

        case 'multiselect':
          if (attr.options?.length) {
            const matched = [];
            for (const option of attr.options) {
              const optionLabel = (option.label || option.value || option).toLowerCase();
              if (lowerMessage.includes(optionLabel)) {
                matched.push(option.value || option);
              }
            }
            if (matched.length > 0) {
              filters[attr.slug] = matched;
            }
          }
          break;

        case 'number':
          // Try to extract number near filter name
          for (const name of attrNames) {
            const pattern = new RegExp(`${name}\\s*(\\d+)|(\\d+)\\s*${name}`, 'gi');
            const match = pattern.exec(message);
            if (match) {
              filters[attr.slug] = parseInt(match[1] || match[2]);
              break;
            }
          }
          break;

        case 'boolean':
          if (mentioned) {
            filters[attr.slug] = true;
          }
          break;
      }
    }

    return filters;
  }

  /**
   * Extract remaining keywords
   */
  extractKeywords(message, result) {
    // Remove extracted words
    let remaining = message.toLowerCase();

    // Remove numbers
    remaining = remaining.replace(/\d+/g, '');

    // Remove filter words
    const wordsToRemove = [
      'غرف', 'غرفة', 'حمام', 'متر', 'سنة', 'موديل',
      'للبيع', 'للإيجار', 'مفروش', 'جديد', 'مستعمل',
      'في', 'من', 'إلى', 'أقل', 'أكثر', 'تحت', 'فوق'
    ];

    for (const word of wordsToRemove) {
      remaining = remaining.replace(new RegExp(word, 'gi'), '');
    }

    // Remove category name
    if (result.category?.name) {
      remaining = remaining.replace(new RegExp(result.category.name, 'gi'), '');
    }

    // Remove location name
    if (result.location?.name) {
      remaining = remaining.replace(new RegExp(result.location.name, 'gi'), '');
    }

    // Extract remaining words
    const keywords = remaining
      .split(/\s+/)
      .filter(w => w.length > 2)
      .filter(w => !['و', 'أو', 'the', 'and', 'or'].includes(w));

    return [...new Set(keywords)];
  }

  /**
   * Calculate confidence level
   */
  calculateConfidence(result) {
    let score = 0;

    if (result.category) score += 30;
    if (result.transactionType) score += 15;
    if (result.location) score += 20;
    if (Object.keys(result.attributes).length > 0) {
      score += Math.min(Object.keys(result.attributes).length * 5, 25);
    }
    if (result.keywords.length > 0) score += 10;

    return Math.min(score, 100);
  }
}

module.exports = new MessageAnalyzer();
