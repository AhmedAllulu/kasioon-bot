/**
 * Conversation Context Manager
 * نظام إدارة سياق المحادثة - يحفظ تاريخ المحادثات ومعاملات البحث لكل مستخدم
 *
 * @module contextManager
 */

const logger = require('../../utils/logger');

/**
 * مدير سياق المحادثة
 * Manages conversation context for each user
 */
class ConversationContextManager {
  constructor() {
    // TODO: For production, replace with Redis for persistence and scalability
    // For now, using in-memory Map
    this.conversations = new Map();

    // Session timeout (30 minutes)
    this.TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

    // Maximum messages to keep in history
    this.MAX_HISTORY = 5;

    // Cleanup expired sessions every 10 minutes
    this.startCleanupInterval();

    logger.info('[ContextManager] Initialized with in-memory storage');
  }

  /**
   * احصل على سياق المستخدم أو أنشئ سياق جديد
   * Get user context or create new one
   *
   * @param {string} userId - معرف المستخدم
   * @returns {Object} - سياق المستخدم
   */
  getContext(userId) {
    const context = this.conversations.get(userId);

    // إذا لا يوجد سياق أو انتهت صلاحيته، أنشئ واحد جديد
    if (!context || this.isExpired(context)) {
      return this.createNewContext(userId);
    }

    return context;
  }

  /**
   * تحديث سياق المستخدم
   * Update user context
   *
   * @param {string} userId - معرف المستخدم
   * @param {Object} updates - التحديثات المطلوبة
   * @returns {Object} - السياق المحدث
   */
  updateContext(userId, updates) {
    const context = this.getContext(userId);

    // دمج التحديثات
    Object.assign(context, updates, {
      lastUpdate: Date.now(),
      messageCount: (context.messageCount || 0) + 1
    });

    // إذا كان التحديث يحتوي على رسالة جديدة، أضفها للتاريخ
    if (updates.lastMessage) {
      this.addToHistory(context, {
        message: updates.lastMessage,
        timestamp: Date.now(),
        intent: updates.lastIntent,
        intentConfidence: updates.lastIntentConfidence
      });
    }

    // حفظ السياق المحدث
    this.conversations.set(userId, context);

    logger.debug(`[ContextManager] Updated context for user ${userId}:`, {
      messageCount: context.messageCount,
      lastIntent: context.lastIntent,
      historyLength: context.messageHistory.length
    });

    return context;
  }

  /**
   * إضافة رسالة لتاريخ المحادثة
   * Add message to conversation history
   *
   * @param {Object} context - السياق الحالي
   * @param {Object} messageData - بيانات الرسالة
   */
  addToHistory(context, messageData) {
    if (!context.messageHistory) {
      context.messageHistory = [];
    }

    context.messageHistory.push(messageData);

    // احتفظ بآخر N رسائل فقط
    if (context.messageHistory.length > this.MAX_HISTORY) {
      context.messageHistory.shift(); // احذف الأقدم
    }
  }

  /**
   * إنشاء سياق جديد لمستخدم
   * Create new context for user
   *
   * @param {string} userId - معرف المستخدم
   * @returns {Object} - السياق الجديد
   */
  createNewContext(userId) {
    const context = {
      userId,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      messageCount: 0,

      // آخر نية واستعلام
      lastIntent: null,
      lastIntentConfidence: null,
      lastMessage: null,

      // آخر معاملات بحث
      lastSearchParams: null,
      lastSearchResults: null,
      lastSearchTimestamp: null,

      // تفضيلات المستخدم
      preferredLanguage: null,
      preferredCity: null,

      // تاريخ الرسائل (آخر 5 رسائل)
      messageHistory: [],

      // إحصائيات
      searchCount: 0,
    };

    this.conversations.set(userId, context);

    logger.info(`[ContextManager] Created new context for user ${userId}`);

    return context;
  }

  /**
   * تحقق من انتهاء صلاحية السياق
   * Check if context is expired
   *
   * @param {Object} context - السياق
   * @returns {boolean} - true إذا انتهت الصلاحية
   */
  isExpired(context) {
    return Date.now() - context.lastUpdate > this.TTL;
  }

  /**
   * احذف سياق المستخدم
   * Clear user context
   *
   * @param {string} userId - معرف المستخدم
   */
  clearContext(userId) {
    this.conversations.delete(userId);
    logger.info(`[ContextManager] Cleared context for user ${userId}`);
  }

  /**
   * تحقق من وجود بحث سابق
   * Check if user has a previous search
   *
   * @param {string} userId - معرف المستخدم
   * @returns {boolean} - true إذا كان هناك بحث سابق
   */
  hasPreviousSearch(userId) {
    const context = this.getContext(userId);
    return context.lastSearchParams !== null && context.lastSearchTimestamp !== null;
  }

  /**
   * تحقق من أن الرسالة قد تكون سؤال متابعة
   * Check if message might be a follow-up question
   *
   * @param {string} userId - معرف المستخدم
   * @param {string} message - الرسالة الحالية
   * @returns {boolean} - true إذا كانت سؤال متابعة محتمل
   */
  isLikelyFollowUp(userId, message) {
    const context = this.getContext(userId);

    // إذا لا يوجد بحث سابق، ليست متابعة
    if (!context.lastIntent || context.lastIntent !== 'search') {
      return false;
    }

    // إذا مر أكثر من 5 دقائق، غالباً ليست متابعة
    const timeSinceLastSearch = Date.now() - (context.lastSearchTimestamp || 0);
    if (timeSinceLastSearch > 5 * 60 * 1000) { // 5 minutes
      return false;
    }

    // إذا الرسالة قصيرة (أقل من 20 حرف) وكان آخر إجراء بحث
    if (message.length < 20) {
      return true;
    }

    // أنماط شائعة للمتابعة
    const followUpPatterns = [
      /أرخص|أغلى|أرخص سعر/i,
      /في مدينة (ثانية|تانية|أخرى)/i,
      /غير (الموقع|المدينة)/i,
      /المزيد/i,
      /cheaper|more expensive|different city|more/i
    ];

    return followUpPatterns.some(pattern => pattern.test(message));
  }

  /**
   * حفظ نتائج البحث في السياق
   * Save search results to context
   *
   * @param {string} userId - معرف المستخدم
   * @param {Object} searchParams - معاملات البحث
   * @param {Array} results - النتائج
   */
  saveSearchResults(userId, searchParams, results) {
    const context = this.getContext(userId);

    context.lastSearchParams = searchParams;
    context.lastSearchResults = results.slice(0, 10); // احفظ أول 10 نتائج فقط
    context.lastSearchTimestamp = Date.now();
    context.searchCount = (context.searchCount || 0) + 1;

    // استنتج التفضيلات
    if (searchParams.city && !context.preferredCity) {
      context.preferredCity = searchParams.city;
    }

    this.conversations.set(userId, context);

    logger.debug(`[ContextManager] Saved search results for user ${userId}`, {
      category: searchParams.category,
      city: searchParams.city,
      resultsCount: results.length
    });
  }

  /**
   * احصل على إحصائيات المحادثة
   * Get conversation statistics
   *
   * @param {string} userId - معرف المستخدم
   * @returns {Object} - إحصائيات
   */
  getStats(userId) {
    const context = this.getContext(userId);

    return {
      messageCount: context.messageCount,
      searchCount: context.searchCount,
      sessionDuration: Date.now() - context.createdAt,
      lastActive: context.lastUpdate,
      preferredLanguage: context.preferredLanguage,
      preferredCity: context.preferredCity,
    };
  }

  /**
   * احصل على عدد المحادثات النشطة
   * Get active conversations count
   *
   * @returns {number} - عدد المحادثات النشطة
   */
  getActiveConversationsCount() {
    let activeCount = 0;

    for (const [userId, context] of this.conversations.entries()) {
      if (!this.isExpired(context)) {
        activeCount++;
      }
    }

    return activeCount;
  }

  /**
   * تنظيف الجلسات منتهية الصلاحية
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    let cleanedCount = 0;

    for (const [userId, context] of this.conversations.entries()) {
      if (this.isExpired(context)) {
        this.conversations.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`[ContextManager] Cleaned up ${cleanedCount} expired sessions`);
    }

    return cleanedCount;
  }

  /**
   * بدء عملية التنظيف الدورية
   * Start cleanup interval
   */
  startCleanupInterval() {
    // تنظيف كل 10 دقائق
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 10 * 60 * 1000);

    logger.info('[ContextManager] Started cleanup interval (every 10 minutes)');
  }

  /**
   * إيقاف عملية التنظيف
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      logger.info('[ContextManager] Stopped cleanup interval');
    }
  }

  /**
   * للاستخدام في الإنتاج - هجرة إلى Redis
   * For production use - migrate to Redis
   *
   * TODO: Implement Redis integration
   *
   * Example Redis structure:
   * - Key: `context:${userId}`
   * - Value: JSON string of context object
   * - Expiry: TTL (30 minutes)
   *
   * Benefits of Redis:
   * - Persistence across restarts
   * - Shared state across multiple bot instances
   * - Automatic TTL expiration
   * - Better performance for large user base
   */
  async migrateToRedis() {
    // TODO: Implement Redis migration
    throw new Error('Redis migration not implemented yet. See comments for structure.');
  }
}

// Export singleton instance
module.exports = new ConversationContextManager();
