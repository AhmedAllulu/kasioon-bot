const logger = require('../../utils/logger');

/**
 * AI Model Manager for cost optimization
 * Routes requests to appropriate models based on task complexity
 * Tracks usage and optimizes API costs
 */
class AIModelManager {
  constructor() {
    // Model tiers for different complexity levels
    this.models = {
      // Fast & cheap - for simple tasks (parameter extraction, quick formatting)
      fast: {
        openai: process.env.OPENAI_MODEL_FAST || 'gpt-4o-mini',
        anthropic: process.env.ANTHROPIC_MODEL_FAST || 'claude-3-haiku-20240307'
      },
      // Standard - for regular tasks (conversation, analysis)
      standard: {
        openai: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        anthropic: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
      },
      // Powerful - for complex tasks (advanced reasoning, multi-step)
      powerful: {
        openai: process.env.OPENAI_MODEL_POWERFUL || 'gpt-4o',
        anthropic: process.env.ANTHROPIC_MODEL_POWERFUL || 'claude-3-5-sonnet-20241022'
      }
    };

    // Task complexity classification
    // Maps task types to appropriate model tiers
    this.taskComplexity = {
      'transcribe': 'fast',           // Voice transcription (uses Whisper anyway)
      'extract_params': 'fast',       // Simple parameter extraction
      'format_results': 'fast',       // Simple formatting tasks
      'analyze_intent': 'standard',   // Understanding user intent
      'generate_suggestions': 'standard', // Creating search suggestions
      'complex_query': 'powerful',    // Multi-step reasoning
      'conversation': 'standard',     // General conversation
      'category_validation': 'fast'   // Validate categories
    };

    // Token limits per task type to prevent excessive usage
    this.tokenLimits = {
      'extract_params': 500,          // Parameter extraction is simple
      'format_results': 1500,         // Formatting can be longer
      'analyze_intent': 300,          // Intent analysis is quick
      'generate_suggestions': 800,    // Suggestions need context
      'conversation': 1000,           // General conversation
      'category_validation': 200,     // Quick validation
      'complex_query': 2000           // Complex tasks need more tokens
    };

    // Usage tracking for monitoring and optimization
    this.usageStats = {
      today: new Date().toISOString().split('T')[0],
      calls: {},    // Track number of calls per task type
      tokens: {},   // Track tokens used per task type
      costs: {}     // Estimated costs per task type
    };

    // Cost estimates per 1K tokens (approximate)
    this.costPer1KTokens = {
      'gpt-4o-mini': 0.00015,
      'gpt-4o': 0.0025,
      'claude-3-haiku-20240307': 0.00025,
      'claude-3-5-sonnet-20241022': 0.003
    };
  }

  /**
   * Get appropriate model for a specific task
   * @param {string} taskType - Type of task (e.g., 'extract_params', 'conversation')
   * @param {string} provider - AI provider ('openai' or 'anthropic')
   * @returns {string} Model name to use
   */
  getModel(taskType, provider = 'openai') {
    const complexity = this.taskComplexity[taskType] || 'standard';
    const model = this.models[complexity][provider];

    logger.debug(`Model selection: ${taskType} → ${complexity} → ${model}`);
    return model;
  }

  /**
   * Get maximum token limit for a task type
   * @param {string} taskType - Type of task
   * @returns {number} Maximum tokens allowed
   */
  getMaxTokens(taskType) {
    return this.tokenLimits[taskType] || 1000;
  }

  /**
   * Track API usage for monitoring and cost optimization
   * @param {string} taskType - Type of task performed
   * @param {number} tokensUsed - Number of tokens consumed
   * @param {string} model - Model that was used
   */
  trackUsage(taskType, tokensUsed, model) {
    const today = new Date().toISOString().split('T')[0];

    // Reset stats if it's a new day
    if (this.usageStats.today !== today) {
      this.usageStats = {
        today,
        calls: {},
        tokens: {},
        costs: {}
      };
    }

    // Increment call count
    this.usageStats.calls[taskType] = (this.usageStats.calls[taskType] || 0) + 1;

    // Add tokens used
    this.usageStats.tokens[taskType] = (this.usageStats.tokens[taskType] || 0) + tokensUsed;

    // Calculate and track estimated cost
    const costPer1K = this.costPer1KTokens[model] || 0.001;
    const estimatedCost = (tokensUsed / 1000) * costPer1K;
    this.usageStats.costs[taskType] = (this.usageStats.costs[taskType] || 0) + estimatedCost;

    logger.debug('AI Usage tracked:', {
      taskType,
      tokensUsed,
      model,
      estimatedCost: `$${estimatedCost.toFixed(6)}`,
      dailyTotal: `$${this.getDailyCost().toFixed(4)}`
    });
  }

  /**
   * Get total daily cost
   * @returns {number} Total estimated cost for today
   */
  getDailyCost() {
    return Object.values(this.usageStats.costs).reduce((sum, cost) => sum + cost, 0);
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage statistics object
   */
  getUsageStats() {
    return {
      ...this.usageStats,
      totalCalls: Object.values(this.usageStats.calls).reduce((sum, n) => sum + n, 0),
      totalTokens: Object.values(this.usageStats.tokens).reduce((sum, n) => sum + n, 0),
      totalCost: this.getDailyCost()
    };
  }

  /**
   * Determine if response should be cached
   * Some tasks benefit from caching, others need fresh responses
   * @param {string} taskType - Type of task
   * @returns {boolean} Whether to cache the response
   */
  shouldCache(taskType) {
    // Don't cache dynamic or personalized content
    const noCacheTypes = ['conversation', 'format_results'];
    return !noCacheTypes.includes(taskType);
  }

  /**
   * Get cache TTL for a task type
   * @param {string} taskType - Type of task
   * @returns {number} Cache TTL in seconds
   */
  getCacheTTL(taskType) {
    const ttls = {
      'extract_params': 3600,        // 1 hour - search params are stable
      'category_validation': 7200,   // 2 hours - categories don't change often
      'analyze_intent': 1800,        // 30 minutes - intents are fairly stable
      'generate_suggestions': 900    // 15 minutes - suggestions can be fresher
    };
    return ttls[taskType] || 3600; // Default 1 hour
  }

  /**
   * Get recommended complexity tier for a task
   * @param {string} taskType - Type of task
   * @returns {string} Complexity tier ('fast', 'standard', 'powerful')
   */
  getComplexityTier(taskType) {
    return this.taskComplexity[taskType] || 'standard';
  }

  /**
   * Log daily usage summary
   */
  logDailySummary() {
    const stats = this.getUsageStats();

    logger.info('=== Daily AI Usage Summary ===');
    logger.info(`Date: ${stats.today}`);
    logger.info(`Total Calls: ${stats.totalCalls}`);
    logger.info(`Total Tokens: ${stats.totalTokens.toLocaleString()}`);
    logger.info(`Estimated Cost: $${stats.totalCost.toFixed(4)}`);
    logger.info('Breakdown by task type:');

    Object.keys(stats.calls).forEach(taskType => {
      logger.info(`  ${taskType}: ${stats.calls[taskType]} calls, ${stats.tokens[taskType]} tokens, $${stats.costs[taskType].toFixed(4)}`);
    });

    logger.info('=============================');
  }
}

module.exports = new AIModelManager();
