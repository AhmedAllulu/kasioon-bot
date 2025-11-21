/**
 * Conversation History Tracker
 * متتبع تاريخ المحادثات - يوفر وظائف إضافية لتحليل تاريخ المحادثة
 *
 * @module historyTracker
 */

const contextManager = require('./contextManager');
const logger = require('../../utils/logger');

/**
 * متتبع تاريخ المحادثات
 * Tracks and analyzes conversation history
 */
class ConversationHistoryTracker {
  constructor() {
    this.contextManager = contextManager;
  }

  /**
   * احصل على تاريخ محادثة المستخدم
   * Get user's conversation history
   *
   * @param {string} userId - معرف المستخدم
   * @returns {Array} - تاريخ الرسائل
   */
  getHistory(userId) {
    const context = this.contextManager.getContext(userId);
    return context.messageHistory || [];
  }

  /**
   * احصل على آخر رسالة
   * Get last message
   *
   * @param {string} userId - معرف المستخدم
   * @returns {Object|null} - آخر رسالة أو null
   */
  getLastMessage(userId) {
    const history = this.getHistory(userId);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * احصل على آخر N رسائل
   * Get last N messages
   *
   * @param {string} userId - معرف المستخدم
   * @param {number} count - عدد الرسائل
   * @returns {Array} - الرسائل
   */
  getLastMessages(userId, count = 5) {
    const history = this.getHistory(userId);
    return history.slice(-count);
  }

  /**
   * احصل على آخر نية
   * Get last intent
   *
   * @param {string} userId - معرف المستخدم
   * @returns {string|null} - آخر نية
   */
  getLastIntent(userId) {
    const lastMessage = this.getLastMessage(userId);
    return lastMessage ? lastMessage.intent : null;
  }

  /**
   * احصل على سلسلة النوايا (آخر N نوايا)
   * Get intent sequence
   *
   * @param {string} userId - معرف المستخدم
   * @param {number} count - عدد النوايا
   * @returns {Array} - سلسلة النوايا
   */
  getIntentSequence(userId, count = 5) {
    const messages = this.getLastMessages(userId, count);
    return messages.map(msg => msg.intent).filter(intent => intent !== null);
  }

  /**
   * تحقق من نمط المحادثة
   * Detect conversation pattern
   *
   * @param {string} userId - معرف المستخدم
   * @returns {string} - نوع النمط
   */
  detectConversationPattern(userId) {
    const intents = this.getIntentSequence(userId, 5);

    if (intents.length === 0) {
      return 'new_user';
    }

    // نمط البحث المتكرر
    const searchCount = intents.filter(i => i === 'search').length;
    if (searchCount >= 3) {
      return 'active_searcher';
    }

    // نمط الاستكشاف (تبديل بين help و search)
    const helpCount = intents.filter(i => i === 'help').length;
    if (helpCount >= 2 && searchCount >= 1) {
      return 'explorer';
    }

    // نمط المحادثة (تحيات ومحادثة عامة)
    const conversationalIntents = intents.filter(i =>
      ['greeting', 'help', 'feedback', 'goodbye'].includes(i)
    );
    if (conversationalIntents.length >= 3) {
      return 'conversational';
    }

    // نمط غير واضح (unclear متكرر)
    const unclearCount = intents.filter(i => i === 'unclear').length;
    if (unclearCount >= 2) {
      return 'needs_guidance';
    }

    return 'casual_user';
  }

  /**
   * احصل على اقتراحات بناءً على التاريخ
   * Get suggestions based on history
   *
   * @param {string} userId - معرف المستخدم
   * @param {string} language - اللغة
   * @returns {string|null} - اقتراح أو null
   */
  getSuggestion(userId, language = 'ar') {
    const pattern = this.detectConversationPattern(userId);
    const context = this.contextManager.getContext(userId);

    const suggestions = {
      ar: {
        needs_guidance: '💡 يبدو أنك تحتاج مساعدة! جرب البحث بشكل أكثر تحديداً، مثل:\n"سيارة للبيع في دمشق"',
        active_searcher: '🔥 أنت تبحث بنشاط! إذا لم تجد ما تريد، جرب توسيع نطاق البحث أو تغيير المدينة',
        conversational: '😊 أهلاً بك! إذا كنت تريد البحث عن شيء معين، أنا جاهز لمساعدتك',
        new_user: null,
        explorer: '👍 رائع! يبدو أنك تستكشف. إذا احتجت مساعدة في أي وقت، فقط اسأل!',
        casual_user: null,
      },
      en: {
        needs_guidance: '💡 Looks like you need help! Try searching more specifically, like:\n"car for sale in Damascus"',
        active_searcher: '🔥 You\'re searching actively! If you don\'t find what you want, try broadening your search',
        conversational: '😊 Welcome! If you want to search for something specific, I\'m here to help',
        new_user: null,
        explorer: '👍 Great! Looks like you\'re exploring. If you need help anytime, just ask!',
        casual_user: null,
      }
    };

    return suggestions[language][pattern] || null;
  }

  /**
   * تحليل فاعلية البحث
   * Analyze search effectiveness
   *
   * @param {string} userId - معرف المستخدم
   * @returns {Object} - تحليل الفاعلية
   */
  analyzeSearchEffectiveness(userId) {
    const context = this.contextManager.getContext(userId);
    const stats = this.contextManager.getStats(userId);

    // حساب نسبة نجاح البحث
    const searchCount = stats.searchCount || 0;
    const messageCount = stats.messageCount || 1;

    return {
      searchRate: searchCount / messageCount,
      averageSearchesPerSession: searchCount,
      isActiveSearcher: searchCount >= 3,
      needsHelp: this.detectConversationPattern(userId) === 'needs_guidance',
      preferredCity: context.preferredCity,
      sessionDuration: stats.sessionDuration,
    };
  }

  /**
   * احصل على ملخص الجلسة
   * Get session summary
   *
   * @param {string} userId - معرف المستخدم
   * @param {string} language - اللغة
   * @returns {string} - ملخص الجلسة
   */
  getSessionSummary(userId, language = 'ar') {
    const stats = this.contextManager.getStats(userId);
    const pattern = this.detectConversationPattern(userId);
    const context = this.contextManager.getContext(userId);

    if (language === 'ar') {
      let summary = `📊 *ملخص جلستك:*\n\n`;
      summary += `• عدد الرسائل: ${stats.messageCount}\n`;
      summary += `• عدد عمليات البحث: ${stats.searchCount}\n`;

      if (context.preferredCity) {
        summary += `• مدينتك المفضلة: ${context.preferredCity}\n`;
      }

      const durationMinutes = Math.floor(stats.sessionDuration / 60000);
      if (durationMinutes > 0) {
        summary += `• مدة الجلسة: ${durationMinutes} دقيقة\n`;
      }

      return summary;
    } else {
      let summary = `📊 *Session Summary:*\n\n`;
      summary += `• Messages: ${stats.messageCount}\n`;
      summary += `• Searches: ${stats.searchCount}\n`;

      if (context.preferredCity) {
        summary += `• Preferred city: ${context.preferredCity}\n`;
      }

      const durationMinutes = Math.floor(stats.sessionDuration / 60000);
      if (durationMinutes > 0) {
        summary += `• Session duration: ${durationMinutes} minutes\n`;
      }

      return summary;
    }
  }

  /**
   * تحقق من تكرار رسالة معينة
   * Check for repeated messages
   *
   * @param {string} userId - معرف المستخدم
   * @param {string} message - الرسالة الحالية
   * @returns {boolean} - true إذا كانت متكررة
   */
  isRepeatedMessage(userId, message) {
    const history = this.getHistory(userId);

    if (history.length === 0) {
      return false;
    }

    // تحقق من آخر 3 رسائل
    const recentMessages = history.slice(-3);
    const normalizedMessage = message.toLowerCase().trim();

    return recentMessages.some(msg =>
      msg.message.toLowerCase().trim() === normalizedMessage
    );
  }

  /**
   * احصل على توصيات بناءً على التاريخ
   * Get recommendations based on history
   *
   * @param {string} userId - معرف المستخدم
   * @param {string} language - اللغة
   * @returns {Array} - قائمة التوصيات
   */
  getRecommendations(userId, language = 'ar') {
    const context = this.contextManager.getContext(userId);
    const recommendations = [];

    // إذا كان المستخدم يبحث كثيراً في نفس المدينة
    if (context.searchCount >= 3 && context.preferredCity) {
      recommendations.push({
        type: 'city_preference',
        message: language === 'ar'
          ? `لاحظت أنك تبحث كثيراً في ${context.preferredCity}. هل تريد جعلها مدينتك الافتراضية؟`
          : `I noticed you search a lot in ${context.preferredCity}. Want to make it your default city?`
      });
    }

    // إذا كان المستخدم يواجه صعوبة في البحث
    const pattern = this.detectConversationPattern(userId);
    if (pattern === 'needs_guidance') {
      recommendations.push({
        type: 'search_tips',
        message: language === 'ar'
          ? '💡 نصيحة: حاول أن تكون أكثر تحديداً في بحثك. مثلاً: "سيارة تويوتا 2015 في دمشق"'
          : '💡 Tip: Try to be more specific in your search. Example: "Toyota car 2015 in Damascus"'
      });
    }

    return recommendations;
  }

  /**
   * سجل حدث في التاريخ
   * Log an event in history
   *
   * @param {string} userId - معرف المستخدم
   * @param {string} eventType - نوع الحدث
   * @param {Object} eventData - بيانات الحدث
   */
  logEvent(userId, eventType, eventData = {}) {
    logger.info(`[HistoryTracker] Event for user ${userId}:`, {
      type: eventType,
      data: eventData,
      timestamp: Date.now()
    });

    // يمكن إضافة المزيد من المعالجة هنا حسب الحاجة
  }
}

// Export singleton instance
module.exports = new ConversationHistoryTracker();
