/**
 * Intent Classifier
 * نظام تصنيف نية المستخدم - يحدد ما يريد المستخدم فعله من رسالته
 *
 * @module intentClassifier
 */

const patterns = require('../nlp/intentPatterns');
const arabicNormalizer = require('../../utils/arabicNormalizer');
const logger = require('../../utils/logger');

/**
 * أنواع النوايا المدعومة
 * Supported intent types
 */
const INTENT_TYPES = {
  GREETING: 'greeting',           // تحية
  HELP: 'help',                   // طلب مساعدة
  SEARCH: 'search',               // بحث عن منتج
  REFINEMENT: 'refinement',       // تحسين بحث سابق
  FEEDBACK: 'feedback',           // ملاحظات (إيجابية/سلبية)
  GOODBYE: 'goodbye',             // وداع
  CONFIRMATION: 'confirmation',   // تأكيد (نعم/لا)
  UNCLEAR: 'unclear',             // غير واضح
};

class IntentClassifier {
  constructor() {
    this.patterns = patterns;
    this.intentTypes = INTENT_TYPES;
  }

  /**
   * تصنيف نية المستخدم من الرسالة
   * Classify user intent from message
   *
   * @param {string} message - رسالة المستخدم
   * @param {Object} context - سياق المحادثة (optional)
   * @returns {Object} - نتيجة التصنيف
   */
  classify(message, context = {}) {
    try {
      const text = message.trim();
      const normalizedText = arabicNormalizer.normalize(text);
      const wordCount = text.split(/\s+/).length;

      logger.info(`[IntentClassifier] Classifying message: "${text.substring(0, 50)}..."`);

      // 1. تحقق من التحية
      const greetingResult = this.checkGreeting(text, wordCount);
      if (greetingResult.isMatch) {
        return {
          intent: INTENT_TYPES.GREETING,
          confidence: greetingResult.confidence,
          metadata: { wordCount }
        };
      }

      // 2. تحقق من الوداع
      const goodbyeResult = this.checkGoodbye(text);
      if (goodbyeResult.isMatch) {
        return {
          intent: INTENT_TYPES.GOODBYE,
          confidence: goodbyeResult.confidence,
        };
      }

      // 3. تحقق من التأكيد (نعم/لا)
      const confirmationResult = this.checkConfirmation(text);
      if (confirmationResult.isMatch) {
        return {
          intent: INTENT_TYPES.CONFIRMATION,
          confidence: confirmationResult.confidence,
          isPositive: confirmationResult.isPositive,
        };
      }

      // 4. تحقق من طلب المساعدة
      const helpResult = this.checkHelp(text);
      if (helpResult.isMatch) {
        return {
          intent: INTENT_TYPES.HELP,
          confidence: helpResult.confidence,
        };
      }

      // 5. تحقق من الملاحظات
      const feedbackResult = this.checkFeedback(text);
      if (feedbackResult.isMatch) {
        return {
          intent: INTENT_TYPES.FEEDBACK,
          confidence: feedbackResult.confidence,
          sentiment: feedbackResult.sentiment,
        };
      }

      // 6. تحقق من تحسين البحث (Follow-up)
      // يحتاج وجود سياق محادثة سابقة
      if (context.lastIntent === INTENT_TYPES.SEARCH) {
        const refinementResult = this.checkRefinement(text, context);
        if (refinementResult.isMatch) {
          return {
            intent: INTENT_TYPES.REFINEMENT,
            confidence: refinementResult.confidence,
            refinementType: refinementResult.type,
          };
        }
      }

      // 7. تحقق من نية البحث
      const searchResult = this.checkSearch(text, normalizedText);
      if (searchResult.isMatch) {
        // تحقق من جودة البحث
        if (searchResult.confidence < 0.6) {
          return {
            intent: INTENT_TYPES.UNCLEAR,
            confidence: searchResult.confidence,
            possibleIntent: INTENT_TYPES.SEARCH,
            clarificationQuestion: this.generateClarificationQuestion(text, 'search'),
            extractedInfo: searchResult.extractedInfo,
          };
        }

        return {
          intent: INTENT_TYPES.SEARCH,
          confidence: searchResult.confidence,
          extractedInfo: searchResult.extractedInfo,
        };
      }

      // 8. افتراضي: غير واضح
      return {
        intent: INTENT_TYPES.UNCLEAR,
        confidence: 0.2,
        clarificationQuestion: this.generateClarificationQuestion(text, 'default'),
      };

    } catch (error) {
      logger.error('[IntentClassifier] Error classifying intent:', error);
      return {
        intent: INTENT_TYPES.UNCLEAR,
        confidence: 0.1,
        error: error.message,
      };
    }
  }

  /**
   * تحقق من التحية
   * Check for greeting intent
   */
  checkGreeting(text, wordCount) {
    const { patterns: greetingPatterns, maxLength, maxWords } = this.patterns.greeting;

    // تحقق من طول الرسالة
    if (text.length > maxLength || wordCount > maxWords) {
      return { isMatch: false };
    }

    // تحقق من الأنماط
    for (const pattern of greetingPatterns) {
      if (pattern.test(text)) {
        return {
          isMatch: true,
          confidence: 0.95,
        };
      }
    }

    return { isMatch: false };
  }

  /**
   * تحقق من الوداع
   * Check for goodbye intent
   */
  checkGoodbye(text) {
    const { patterns: goodbyePatterns } = this.patterns.goodbye;

    for (const pattern of goodbyePatterns) {
      if (pattern.test(text)) {
        return {
          isMatch: true,
          confidence: 0.9,
        };
      }
    }

    return { isMatch: false };
  }

  /**
   * تحقق من التأكيد (نعم/لا)
   * Check for confirmation intent
   */
  checkConfirmation(text) {
    const lowerText = text.toLowerCase().trim();
    const { positive, negative } = this.patterns.confirmationWords;

    if (positive.includes(lowerText)) {
      return {
        isMatch: true,
        confidence: 0.95,
        isPositive: true,
      };
    }

    if (negative.includes(lowerText)) {
      return {
        isMatch: true,
        confidence: 0.95,
        isPositive: false,
      };
    }

    return { isMatch: false };
  }

  /**
   * تحقق من طلب المساعدة
   * Check for help request intent
   */
  checkHelp(text) {
    const { patterns: helpPatterns } = this.patterns.help;

    for (const pattern of helpPatterns) {
      if (pattern.test(text)) {
        return {
          isMatch: true,
          confidence: 0.9,
        };
      }
    }

    return { isMatch: false };
  }

  /**
   * تحقق من الملاحظات
   * Check for feedback intent
   */
  checkFeedback(text) {
    const { patterns: feedbackPatterns } = this.patterns.feedback;

    for (const pattern of feedbackPatterns) {
      if (pattern.test(text)) {
        // حدد المشاعر (إيجابي/سلبي)
        const sentiment = this.detectSentiment(text);

        return {
          isMatch: true,
          confidence: 0.85,
          sentiment,
        };
      }
    }

    return { isMatch: false };
  }

  /**
   * تحقق من تحسين البحث
   * Check for search refinement intent
   */
  checkRefinement(text, context) {
    const { patterns: refinementPatterns } = this.patterns.refinement;

    // إذا الرسالة قصيرة جداً وكان آخر إجراء بحث
    if (text.length < 20 && context.lastSearchParams) {
      for (const pattern of refinementPatterns) {
        if (pattern.test(text)) {
          return {
            isMatch: true,
            confidence: 0.85,
            type: this.detectRefinementType(text),
          };
        }
      }

      // حتى لو لم تطابق الأنماط، إذا كانت قصيرة جداً فقد تكون تحسين
      if (text.length < 10) {
        return {
          isMatch: true,
          confidence: 0.6,
          type: 'unclear',
        };
      }
    }

    return { isMatch: false };
  }

  /**
   * تحقق من نية البحث
   * Check for search intent
   */
  checkSearch(text, normalizedText) {
    let score = 0;
    const extractedInfo = {
      hasProduct: false,
      hasLocation: false,
      hasPrice: false,
      hasTransaction: false,
      hasSearchIntent: false,
    };

    // 1. تحقق من أنماط البحث الواضحة (+0.3)
    if (this.hasSearchPattern(text)) {
      score += 0.3;
      extractedInfo.hasSearchIntent = true;
    }

    // 2. تحقق من كلمات المنتجات (+0.3)
    if (this.hasProductKeyword(normalizedText)) {
      score += 0.3;
      extractedInfo.hasProduct = true;
    }

    // 3. تحقق من كلمات الموقع (+0.15)
    if (this.hasLocationIndicator(text)) {
      score += 0.15;
      extractedInfo.hasLocation = true;
    }

    // 4. تحقق من كلمات السعر (+0.1)
    if (this.hasPriceKeyword(normalizedText)) {
      score += 0.1;
      extractedInfo.hasPrice = true;
    }

    // 5. تحقق من كلمات البيع/الشراء (+0.15)
    if (this.hasTransactionKeyword(normalizedText)) {
      score += 0.15;
      extractedInfo.hasTransaction = true;
    }

    // 6. طول الرسالة (+0.1 if > 10 chars)
    if (text.length > 10) {
      score += 0.1;
    }

    // إذا كان المجموع أكبر من 0.4 فهي نية بحث
    if (score >= 0.4) {
      return {
        isMatch: true,
        confidence: Math.min(score, 1),
        extractedInfo,
      };
    }

    return { isMatch: false };
  }

  /**
   * تحقق من وجود نمط بحث واضح
   */
  hasSearchPattern(text) {
    const { patterns: searchPatterns } = this.patterns.search;
    return searchPatterns.some(pattern => pattern.test(text));
  }

  /**
   * تحقق من وجود كلمة منتج
   */
  hasProductKeyword(normalizedText) {
    const { productKeywords } = this.patterns.search;
    const normalized = normalizedText.toLowerCase();

    return productKeywords.some(keyword => {
      const normalizedKeyword = arabicNormalizer.normalize(keyword.toLowerCase());
      return normalized.includes(normalizedKeyword);
    });
  }

  /**
   * تحقق من وجود مؤشر موقع
   */
  hasLocationIndicator(text) {
    const { locationIndicators } = this.patterns;

    // تحقق من الكلمات الدالة على الموقع
    const words = text.split(/\s+/);
    return words.some(word => locationIndicators.includes(word));
  }

  /**
   * تحقق من وجود كلمة سعر
   */
  hasPriceKeyword(normalizedText) {
    const { priceKeywords } = this.patterns.search;
    const normalized = normalizedText.toLowerCase();

    return priceKeywords.some(keyword => {
      const normalizedKeyword = arabicNormalizer.normalize(keyword.toLowerCase());
      return normalized.includes(normalizedKeyword);
    });
  }

  /**
   * تحقق من وجود كلمة بيع/شراء
   */
  hasTransactionKeyword(normalizedText) {
    const { transactionKeywords } = this.patterns.search;
    const normalized = normalizedText.toLowerCase();

    return transactionKeywords.some(keyword => {
      const normalizedKeyword = arabicNormalizer.normalize(keyword.toLowerCase());
      return normalized.includes(normalizedKeyword);
    });
  }

  /**
   * كشف المشاعر (إيجابي/سلبي)
   */
  detectSentiment(text) {
    const positiveWords = ['شكرا', 'ممتاز', 'رائع', 'حلو', 'زين', 'تمام', 'كويس', 'جميل',
                          'thanks', 'great', 'good', 'nice', 'excellent', 'perfect'];
    const negativeWords = ['سيء', 'مو منيح', 'مش زابط', 'مش كويس', 'مو كويس',
                          'bad', 'poor', 'terrible', 'not good'];

    const lowerText = text.toLowerCase();

    if (positiveWords.some(word => lowerText.includes(word))) {
      return 'positive';
    }

    if (negativeWords.some(word => lowerText.includes(word))) {
      return 'negative';
    }

    return 'neutral';
  }

  /**
   * كشف نوع التحسين
   */
  detectRefinementType(text) {
    const lowerText = text.toLowerCase();

    if (/أرخص|ارخص|أغلى|اغلى|سعر|cheaper|expensive|price/.test(lowerText)) {
      return 'price';
    }

    if (/مدينة|منطقة|موقع|city|location|area/.test(lowerText)) {
      return 'location';
    }

    if (/المزيد|اكثر|أكثر|more|additional/.test(lowerText)) {
      return 'more_results';
    }

    return 'general';
  }

  /**
   * توليد سؤال توضيحي
   * Generate clarification question
   */
  generateClarificationQuestion(text, type, language = null) {
    // كشف اللغة إذا لم تكن محددة
    if (!language) {
      language = this.detectLanguage(text);
    }

    const questions = {
      ar: {
        search: this.generateSearchClarification(text, 'ar'),
        default: 'عذراً، لم أفهم طلبك. هل تريد:\n• البحث عن منتج؟\n• المساعدة في استخدام البوت؟',
        tooShort: 'هل يمكنك توضيح ما تبحث عنه بشكل أكثر تفصيلاً؟',
      },
      en: {
        search: this.generateSearchClarification(text, 'en'),
        default: 'Sorry, I didn\'t understand. Do you want to:\n• Search for a product?\n• Get help using the bot?',
        tooShort: 'Could you provide more details about what you\'re looking for?',
      }
    };

    return questions[language][type] || questions[language].default;
  }

  /**
   * توليد سؤال توضيحي للبحث
   */
  generateSearchClarification(text, language) {
    const extractedInfo = {
      hasProduct: this.hasProductKeyword(arabicNormalizer.normalize(text)),
      hasLocation: this.hasLocationIndicator(text),
    };

    if (language === 'ar') {
      if (!extractedInfo.hasProduct) {
        return 'ما نوع المنتج الذي تبحث عنه؟\n(مثال: سيارة، شقة، موبايل)';
      }
      if (!extractedInfo.hasLocation) {
        return 'في أي مدينة تريد البحث؟\n(مثال: دمشق، حلب، اللاذقية)';
      }
      return 'هل يمكنك توضيح طلبك أكثر؟ مثلاً:\n• "سيارة للبيع في دمشق"\n• "شقة للإيجار في حلب"';
    } else {
      if (!extractedInfo.hasProduct) {
        return 'What type of product are you looking for?\n(Example: car, apartment, phone)';
      }
      if (!extractedInfo.hasLocation) {
        return 'Which city are you searching in?\n(Example: Damascus, Aleppo, Latakia)';
      }
      return 'Could you clarify your request? For example:\n• "car for sale in Damascus"\n• "apartment for rent in Aleppo"';
    }
  }

  /**
   * كشف لغة الرسالة
   */
  detectLanguage(text) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

    return arabicChars > englishChars ? 'ar' : 'en';
  }
}

// Export singleton instance
module.exports = new IntentClassifier();
