const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');
const marketplaceSearch = require('../search/marketplaceSearch');
const modelManager = require('./modelManager');
const cache = require('../cache');
const AttributeMatcher = require('./attributeMatcher');
const FilterMatcher = require('./filterMatcher');
const MatchScorer = require('./matchScorer');
const ResultValidator = require('../search/resultValidator');

// Dynamic analysis components
const dynamicDataManager = require('../data/dynamicDataManager');
const messageAnalyzer = require('../analysis/messageAnalyzer');
const searchParamsBuilder = require('../search/searchParamsBuilder');

/**
 * Detect language from text message
 * Returns 'ar' if Arabic characters are detected, 'en' otherwise
 * @param {string} text - Text to analyze
 * @returns {string} - 'ar' or 'en'
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') {
    return 'ar'; // Default to Arabic
  }
  
  // Check for Arabic characters (Unicode range: \u0600-\u06FF)
  const arabicPattern = /[\u0600-\u06FF]/;
  const hasArabic = arabicPattern.test(text);
  
  // Count Arabic vs English characters
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  // If Arabic characters are present and more than 30% of the text, consider it Arabic
  if (hasArabic && arabicChars > text.length * 0.1) {
    return 'ar';
  }
  
  // If mostly English characters, consider it English
  if (englishChars > text.length * 0.5) {
    return 'en';
  }
  
  // Default to Arabic if uncertain
  return 'ar';
}

class AIAgent {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;

    this.anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    }) : null;

    this.provider = process.env.AI_PROVIDER || 'openai'; // 'openai' or 'anthropic'

    console.log('🤖 [AI] AI Agent initialized:', {
      provider: this.provider,
      hasOpenAI: !!this.openai,
      hasAnthropic: !!this.anthropic,
      modelManager: 'enabled'
    });
  }

  /**
   * Analyze message dynamically using fetched data from API
   * IMPROVED: Checks if category is LEAF and uses AI if not
   * @param {string} userMessage - User message
   * @param {string} language - Message language (ar/en)
   * @returns {Promise<Object>} Extracted search parameters
   */
  async analyzeMessageDynamic(userMessage, language = 'ar') {
    try {
      console.log('🤖 [AI-AGENT] Starting dynamic analysis...');

      // 1. Analyze message with dynamic analyzer
      const analysis = await messageAnalyzer.analyze(userMessage, language);

      console.log('📊 [AI-AGENT] Analysis result:', {
        category: analysis.category?.slug,
        isLeaf: analysis.category?.isLeaf,
        hasChildren: analysis.category?.hasChildren,
        confidence: analysis.confidence
      });

      // 2. CRITICAL: If category is NOT a leaf (has children), use AI to find specific subcategory
      if (analysis.category && !analysis.category.isLeaf) {
        console.log('⚠️ [AI-AGENT] Category is NOT leaf, using AI to find specific subcategory...');
        console.log(`   Current: ${analysis.category.slug} (has children)`);

        const aiParams = await this.analyzeMessage(userMessage, language);

        // Check if AI returned a more specific (leaf) category
        if (aiParams.category && aiParams.category !== analysis.category.slug) {
          // Verify the AI category is indeed more specific
          const isAiCategoryLeaf = dynamicDataManager.isLeafCategory(aiParams.category);

          if (isAiCategoryLeaf) {
            console.log(`✅ [AI-AGENT] AI found more specific category: ${aiParams.category} (leaf)`);
            analysis.category = {
              slug: aiParams.category,
              isLeaf: true,
              confidence: 85
            };
          } else {
            console.log(`⚠️ [AI-AGENT] AI category ${aiParams.category} is also not leaf, keeping original`);
          }
        }
      }

      // 3. If confidence is low, use AI fallback
      if (analysis.confidence < 50) {
        console.log('⚠️ [AI-AGENT] Low confidence, using AI fallback...');
        const aiParams = await this.analyzeMessage(userMessage, language);

        // Merge results - prefer leaf categories
        return this.mergeAnalysis(analysis, aiParams);
      }

      // 4. Build search parameters
      const searchParams = searchParamsBuilder.build(analysis);

      console.log('✅ [AI-AGENT] Dynamic analysis complete:', {
        categorySlug: searchParams.categorySlug,
        isLeaf: analysis.category?.isLeaf,
        confidence: analysis.confidence
      });

      return searchParams;

    } catch (error) {
      console.error('❌ [AI-AGENT] Dynamic analysis error:', error);
      // Fallback to traditional analysis
      return this.analyzeMessage(userMessage, language);
    }
  }

  /**
   * Merge dynamic analysis with AI analysis
   * @param {Object} dynamicResult - Result from dynamic analyzer
   * @param {Object} aiResult - Result from AI
   * @returns {Object} Merged result
   */
  mergeAnalysis(dynamicResult, aiResult) {
    console.log('🔄 [AI-AGENT] Merging dynamic and AI results...');

    // Convert dynamic result to search params format
    const dynamicParams = searchParamsBuilder.build(dynamicResult);

    // Merge with AI result, preferring dynamic where available
    return {
      category: dynamicParams.categorySlug || aiResult.category,
      city: dynamicResult.location?.name || aiResult.city,
      transactionType: dynamicParams.transactionTypeSlug || aiResult.transactionType,
      keywords: dynamicParams.keywords || aiResult.keywords,
      minPrice: dynamicParams['attributes.price.min'] || aiResult.minPrice,
      maxPrice: dynamicParams['attributes.price.max'] || aiResult.maxPrice,
      ...dynamicParams,
      _source: 'merged'
    };
  }

  /**
   * Analyze message with keyword expansion and intelligent category suggestions
   * 🆕 ENHANCED: Returns expanded keywords and suggested categories for smart search
   * @param {string} message - User message
   * @param {string} language - Message language (ar/en)
   * @returns {Promise<Object>} Extracted search parameters with keyword expansion
   */
  async analyzeMessage(message, language = 'ar') {
    const taskType = 'extract_params';

    try {
      // ========================================================================
      // DEBUG STEP 1: USER MESSAGE
      // ========================================================================
      console.log('\n' + '='.repeat(80));
      console.log('📱 [DEBUG STEP 1] USER MESSAGE');
      console.log('='.repeat(80));
      console.log('Message:', message);
      console.log('Language:', language);
      console.log('Message Length:', message.length);
      console.log('='.repeat(80) + '\n');

      // Check cache for similar queries (cost saving)
      if (modelManager.shouldCache(taskType)) {
        const cacheKey = `ai:params:${this.hashString(message)}`;
        const cached = await cache.get(cacheKey);
        if (cached) {
          logger.info('✅ [AI-ANALYZE] Using cached response for parameter extraction');
          const cachedParams = JSON.parse(cached);
          console.log('\n' + '='.repeat(80));
          console.log('💾 [DEBUG] USING CACHED RESPONSE');
          console.log('='.repeat(80));
          console.log('Cached Params:', JSON.stringify(cachedParams, null, 2));
          console.log('='.repeat(80) + '\n');
          return cachedParams;
        }
      }

      console.log('🤖 [AI-ANALYZE] Starting analysis with keyword expansion...');
      console.log('📥 [AI-ANALYZE] Input:', {
        message: message,
        language: language,
        provider: this.provider
      });

      // Step 1: Get ONLY root categories (simplified context)
      console.log('🔨 [AI-ANALYZE] Fetching root categories only...');
      let categories = [];

      try {
        categories = await marketplaceSearch.getCategories();
        console.log('✅ [AI-ANALYZE] Loaded root categories:', categories.length);
      } catch (contextError) {
        console.error('❌ [AI-ANALYZE] Failed to fetch categories:', contextError.message);
      }

      // Detect language from message if not provided
      const detectedLanguage = language || detectLanguage(message);
      console.log('🌐 [AI-ANALYZE] Language detection:', {
        provided: language,
        detected: detectedLanguage,
        message_preview: message.substring(0, 50)
      });

      // Step 2: Build simplified prompt with ROOT categories only
      const isArabic = detectedLanguage === 'ar';
      let categoryList = '';

      if (categories.length > 0) {
        categoryList = `\n\n📂 AVAILABLE ROOT CATEGORIES (فقط الفئات الأساسية):\n`;
        categories.forEach(cat => {
          categoryList += `- ${cat.slug}: ${cat.name}\n`;
        });
      } else {
        categoryList = '\n\nCommon root categories: vehicles, real-estate, electronics, furniture, fashion, services';
      }

      const systemPrompt = isArabic ?
`أنت مساعد ذكي لمنصة قاسيون للإعلانات المبوبة في سوريا.${categoryList}

🎯 **مهمتك الرئيسية:**
عندما يطلب المستخدم البحث، قم بما يلي:

1️⃣ **استخرج الكلمة المفتاحية الأساسية** من رسالة المستخدم
2️⃣ **وسّع الكلمات المفتاحية**: اقترح 4-5 كلمات مشابهة أو بديلة تختلف في الكتابة ولكنها تعني نفس الشيء والأفضل أن تكون من كلمة واحدة فقط

   📌 **أمثلة على توسيع الكلمات:**
   - "شقة" → ["شقة", "شقق", "استديو", "وحدة سكنية", "بيت "]
   - "سيارة تويوتا" → ["تويوتا", "toyota", "توي", "طويوطة", "تويوته"]
   - "لابتوب" → ["لابتوب", "laptop", "حاسوب ", "كمبيوتر ", "نوت بوك"]
   - "منزل" → ["منزل", "بيت", "دار", "مسكن", "house"]

3️⃣ **اقترح الفئات المحتملة** (فقط من القائمة أعلاه - الفئات الجذرية فقط)

4️⃣ **استخرج الخصائص المطلوبة** (إن وجدت في الرسالة):
   ⚠️ **تنبيه مهم جداً:**
   - أسماء الشركات والموديلات **ليست خصائص** في فئة السيارات/الدراجات النارية
   - مثلاً: "تويوتا"، "كامري"، "هوندا" = فئات فرعية، **ليست خصائص**
   - الخصائص الحقيقية: اللون، الحالة، السنة، نوع الوقود، الجير، المسافة المقطوعة، إلخ

   📌 **أمثلة على الخصائص:**
   - "سيارة بيضاء" → { "color": "أبيض" }
   - "شقة 3 غرف" → { "rooms": "3" }
   - "لابتوب جديد" → { "condition": "جديد" }
   - "منزل واسع 200 متر" → { "area": "200" }
   - "سيارة موديل 2020 بنزين" → { "year": "2020", "fuelType": "بنزين" }

5️⃣ **لا تقم بتصفية النتائج** - فقط اقترح الفئات المحتملة

⚠️ **مهم جداً:**
- استخدم فقط الفئات الجذرية (root categories) من القائمة أعلاه
- الكلمات المقترحة يجب أن تشمل: العربية، الإنجليزية، أخطاء إملائية شائعة، مرادفات
- استخرج الخصائص فقط إذا كانت موجودة في الرسالة
- أرجع JSON فقط بدون أي نص إضافي

📋 **هيكل JSON المطلوب:**
{
  "intent": "search",
  "mainKeyword": "الكلمة الأساسية",
  "expandedKeywords": ["كلمة1", "كلمة2", "كلمة3", "كلمة4", "كلمة5"],
  "suggestedCategories": ["category-slug-1", "category-slug-2"],
  "location": "المدينة إن وجدت",
  "transactionType": "للبيع أو للإيجار إن وجد",
  "requestedAttributes": {
    "attributeName": "قيمة الخاصية"
  }
}

🔍 **أمثلة:**

المستخدم: "بدي شقة 3 غرف للبيع في دمشق"
الإجابة:
{
  "intent": "search",
  "mainKeyword": "شقة",
  "expandedKeywords": ["شقة", "شقق", "استديو", "وحدة سكنية", "apartment"],
  "suggestedCategories": ["real-estate"],
  "location": "دمشق",
  "transactionType": "للبيع",
  "requestedAttributes": {
    "rooms": "3"
  }
}

المستخدم: "سيارة بيضاء موديل 2020 في حلب"
الإجابة:
{
  "intent": "search",
  "mainKeyword": "سيارة",
  "expandedKeywords": ["سيارة", "سيارات", "مركبة", "عربة", "car"],
  "suggestedCategories": ["vehicles"],
  "location": "حلب",
  "transactionType": null,
  "requestedAttributes": {
    "color": "أبيض",
    "year": "2020"
  }
}

المستخدم: "لابتوب جديد رخيص"
الإجابة:
{
  "intent": "search",
  "mainKeyword": "لابتوب",
  "expandedKeywords": ["لابتوب", "laptop", "حاسوب", "كمبيوتر محمول", "نوت بوك"],
  "suggestedCategories": ["electronics"],
  "location": null,
  "transactionType": null,
  "requestedAttributes": {
    "condition": "جديد"
  }
}`
:
`You are an AI assistant for Qasioun marketplace platform in Syria.${categoryList}

🎯 **Your Main Task:**
When user requests a search, do the following:

1️⃣ **Extract the main keyword** from user message
2️⃣ **Expand keywords**: Suggest 4-5 similar or alternative keywords with different spellings but same meaning

   📌 **Examples of keyword expansion:**
   - "apartment" → ["apartment", "flat", "studio", "unit", "condo"]
   - "toyota car" → ["toyota", "توي��تا", "toyo", "toyota vehicle"]
   - "laptop" → ["laptop", "notebook", "portable computer", "لابتوب"]

3️⃣ **Suggest possible categories** (only from the list above - root categories only)
4️⃣ **Don't filter results** - only suggest possible categories

⚠️ **Important:**
- Use only root categories from the list above
- Suggested keywords should include: Arabic, English, common misspellings, synonyms
- Return JSON only without any additional text

📋 **Required JSON Structure:**
{
  "intent": "search",
  "mainKeyword": "main keyword",
  "expandedKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "suggestedCategories": ["category-slug-1", "category-slug-2"],
  "location": "city if found",
  "transactionType": "for-sale or for-rent if found"
}

🔍 **Examples:**

User: "apartment for sale in Damascus"
Response:
{
  "intent": "search",
  "mainKeyword": "apartment",
  "expandedKeywords": ["apartment", "flat", "studio", "unit", "شقة"],
  "suggestedCategories": ["real-estate"],
  "location": "Damascus",
  "transactionType": "for-sale"
}`;


      // ========================================================================
      // DEBUG STEP 2: PROMPT TO AI
      // ========================================================================
      console.log('\n' + '='.repeat(80));
      console.log('📝 [DEBUG STEP 2] PROMPT TO AI');
      console.log('='.repeat(80));
      console.log('System Prompt Length:', systemPrompt.length);
      console.log('System Prompt (first 500 chars):', systemPrompt.substring(0, 500));
      console.log('User Message:', message);
      console.log('Provider:', this.provider);
      console.log('='.repeat(80) + '\n');

      let extractedParams;

      if (this.provider === 'anthropic' && this.anthropic) {
        const model = modelManager.getModel(taskType, 'anthropic');
        const maxTokens = modelManager.getMaxTokens(taskType);

        console.log('🔵 [AI-ANALYZE] Using Anthropic Claude...');
        console.log('🤖 [AI-ANALYZE] Model:', model);
        const fullPrompt = `${systemPrompt}\n\nUser message: "${message}"`;
        console.log('📤 [AI-ANALYZE] Full prompt length:', fullPrompt.length);
        
        const response = await this.anthropic.messages.create({
          model: model,
          max_tokens: maxTokens,
          messages: [
            {
              role: 'user',
              content: fullPrompt
            }
          ]
        });

        console.log('✅ [AI-ANALYZE] Anthropic response received');
        const content = response.content[0].text;
        
        // ========================================================================
        // DEBUG STEP 3: AI RESPONSE
        // ========================================================================
        console.log('\n' + '='.repeat(80));
        console.log('🤖 [DEBUG STEP 3] AI RESPONSE');
        console.log('='.repeat(80));
        console.log('Raw Response:', content);
        console.log('Response Length:', content.length);
        console.log('='.repeat(80) + '\n');
        
        extractedParams = JSON.parse(content);

        // Track usage
        modelManager.trackUsage(taskType, response.usage?.output_tokens || maxTokens, model);

      } else if (this.openai) {
        const model = modelManager.getModel(taskType, 'openai');

        console.log('🟢 [AI-ANALYZE] Using OpenAI GPT...');
        console.log('🤖 [AI-ANALYZE] Model:', model);

        try {
          // Build request parameters
          const requestParams = {
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            response_format: { type: 'json_object' }
          };

          // ========================================================================
          // DEBUG STEP 2: PROMPT TO AI (OpenAI)
          // ========================================================================
          console.log('\n' + '='.repeat(80));
          console.log('📝 [DEBUG STEP 2] PROMPT TO AI (OpenAI)');
          console.log('='.repeat(80));
          console.log('Model:', model);
          console.log('System Prompt Length:', systemPrompt.length);
          console.log('System Prompt (first 500 chars):', systemPrompt.substring(0, 500));
          console.log('User Message:', message);
          console.log('Request Params:', JSON.stringify({
            model: requestParams.model,
            messages_count: requestParams.messages.length,
            response_format: requestParams.response_format
          }, null, 2));
          console.log('='.repeat(80) + '\n');

          // Some models (like gpt-5-nano) don't support custom temperature
          // Only add temperature if model supports it
          const modelsWithoutTemperature = ['gpt-5-nano'];
          if (!modelsWithoutTemperature.includes(model)) {
            requestParams.temperature = 0.3;
          } else {
            console.log('⚠️  [AI-ANALYZE] Model does not support custom temperature, using default');
          }

          const response = await this.openai.chat.completions.create(requestParams);

          console.log('✅ [AI-ANALYZE] OpenAI response received');
          const rawContent = response.choices[0].message.content;
          
          // ========================================================================
          // DEBUG STEP 3: AI RESPONSE (OpenAI)
          // ========================================================================
          console.log('\n' + '='.repeat(80));
          console.log('🤖 [DEBUG STEP 3] AI RESPONSE (OpenAI)');
          console.log('='.repeat(80));
          console.log('Raw Response:', rawContent);
          console.log('Response Length:', rawContent.length);
          console.log('Usage:', JSON.stringify(response.usage, null, 2));
          console.log('='.repeat(80) + '\n');
          
          extractedParams = JSON.parse(rawContent);

          // Track usage
          modelManager.trackUsage(taskType, response.usage?.total_tokens || 500, model);
        } catch (modelError) {
          // Check if it's a temperature error - retry without temperature
          if (modelError.message && modelError.message.includes('temperature') && 
              (modelError.message.includes('does not support') || modelError.message.includes('Unsupported value'))) {
            console.warn('⚠️  [AI-ANALYZE] Temperature not supported, retrying without temperature...');
            try {
              const response = await this.openai.chat.completions.create({
                model: this.openaiModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: message }
                ],
                response_format: { type: 'json_object' }
                // No temperature parameter
              });
              
              console.log('✅ [AI-ANALYZE] Retry without temperature succeeded!');
              const rawContent = response.choices[0].message.content;
              console.log('📄 [AI-ANALYZE] Raw response:', rawContent);
              extractedParams = JSON.parse(rawContent);
            } catch (retryError) {
              console.error('❌ [AI-ANALYZE] Retry also failed:', retryError.message);
              throw modelError; // Throw original error
            }
          }
          // If model access error, try fallback models
          else if (modelError.message && modelError.message.includes('does not have access to model')) {
            console.warn('⚠️  [AI-ANALYZE] Model access error, trying fallback models...');
            const fallbackModels = ['gpt-5-mini', 'gpt-3.5-turbo', 'gpt-4'];
            
            for (const fallbackModel of fallbackModels) {
              if (fallbackModel === this.openaiModel) continue; // Skip if already tried
              
              try {
                console.log(`🔄 [AI-ANALYZE] Trying fallback model: ${fallbackModel}`);
                
                const fallbackParams = {
                  model: fallbackModel,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                  ],
                  response_format: { type: 'json_object' }
                };
                
                // Only add temperature if model supports it
                const modelsWithoutTemperature = ['gpt-5-nano'];
                if (!modelsWithoutTemperature.includes(fallbackModel)) {
                  fallbackParams.temperature = 0.3;
                }
                
                const response = await this.openai.chat.completions.create(fallbackParams);
                
                console.log(`✅ [AI-ANALYZE] Fallback model ${fallbackModel} worked!`);
                const rawContent = response.choices[0].message.content;
                extractedParams = JSON.parse(rawContent);
                break; // Success, exit loop
              } catch (fallbackError) {
                console.warn(`❌ [AI-ANALYZE] Fallback model ${fallbackModel} also failed:`, fallbackError.message);
                if (fallbackModel === fallbackModels[fallbackModels.length - 1]) {
                  // Last fallback failed, throw original error
                  throw modelError;
                }
              }
            }
          } else {
            throw modelError;
          }
        }
      } else {
        console.error('❌ [AI-ANALYZE] No AI provider configured!');
        throw new Error('No AI provider configured');
      }

      // ========================================================================
      // DEBUG STEP 3 (continued): PARSED AI RESPONSE
      // ========================================================================
      console.log('\n' + '='.repeat(80));
      console.log('📊 [DEBUG STEP 3] PARSED AI RESPONSE');
      console.log('='.repeat(80));
      console.log('Extracted Params:', JSON.stringify(extractedParams, null, 2));
      console.log('='.repeat(80) + '\n');

      console.log('✅ [AI-ANALYZE] Analysis complete!');

      // Step 2: Validate expanded keywords structure
      if (!extractedParams.expandedKeywords || !Array.isArray(extractedParams.expandedKeywords)) {
        console.log('⚠️  [AI-ANALYZE] No expanded keywords, creating from mainKeyword or message');
        // Fallback: create expanded keywords from mainKeyword or message
        const baseKeyword = extractedParams.mainKeyword || extractedParams.keywords || message.trim();
        extractedParams.expandedKeywords = [baseKeyword];
        extractedParams.mainKeyword = baseKeyword;
      }

      // Step 3: Validate suggested categories
      if (!extractedParams.suggestedCategories || !Array.isArray(extractedParams.suggestedCategories)) {
        console.log('⚠️  [AI-ANALYZE] No suggested categories, using empty array');
        extractedParams.suggestedCategories = [];
      }

      // Step 4: Ensure location is properly extracted
      if (extractedParams.location && !extractedParams.city) {
        extractedParams.city = extractedParams.location;
      }

      console.log('📊 [AI-ANALYZE] Final extracted params:', JSON.stringify(extractedParams, null, 2));
      logger.info('Message analyzed with keyword expansion', {
        mainKeyword: extractedParams.mainKeyword,
        expandedCount: extractedParams.expandedKeywords?.length || 0,
        suggestedCategories: extractedParams.suggestedCategories
      });

      // Cache the result
      if (modelManager.shouldCache(taskType)) {
        const cacheKey = `ai:params:${this.hashString(message)}`;
        const cacheTTL = modelManager.getCacheTTL(taskType);
        await cache.set(cacheKey, JSON.stringify(extractedParams), cacheTTL);
      }

      return extractedParams;

    } catch (error) {
      console.error('❌ [AI-ANALYZE] Error analyzing message:', {
        message: error.message,
        stack: error.stack
      });
      logger.error('Error analyzing message:', error);
      throw error;
    }
  }

  /**
   * Enrich search parameters with category-specific filters
   * @param {Object} params - Basic search parameters from analyzeMessage
   * @param {string} userMessage - Original user message
   * @param {string} language - Language code (ar/en)
   * @returns {Promise<Object>} Enriched parameters with filters
   */
  async enrichParametersWithFilters(params, userMessage, language = 'ar') {
    try {
      // If no category, can't fetch filters
      if (!params.category) {
        console.log('ℹ️  [FILTER-ENRICH] No category specified, skipping filter enrichment');
        return params;
      }

      console.log('🔍 [FILTER-ENRICH] Starting filter enrichment for category:', params.category);

      // Fetch category filters
      const filterData = await marketplaceSearch.getCategoryFilters(params.category);

      if (!filterData || !filterData.filters || filterData.filters.length === 0) {
        console.log('⚠️  [FILTER-ENRICH] No filters available for category:', params.category);
        return params;
      }

      console.log('✅ [FILTER-ENRICH] Fetched filters:', filterData.filters.length, 'filters');

      // Extract and match filters from user message
      const matchedFilters = FilterMatcher.matchFiltersFromMessage(
        userMessage,
        filterData.filters,
        language
      );

      if (Object.keys(matchedFilters).length > 0) {
        console.log('✅ [FILTER-ENRICH] Matched filters:', JSON.stringify(matchedFilters, null, 2));

        // Add matched filters to params
        params.matchedFilters = matchedFilters;

        // Build filter query parameters for API
        const filterQueryParams = FilterMatcher.buildFilterQueryParams(matchedFilters);
        params.filterParams = filterQueryParams;

        // Get human-readable description
        const filterDescription = FilterMatcher.describeMatchedFilters(
          matchedFilters,
          filterData.filters,
          language
        );
        params.filterDescription = filterDescription;

        console.log('📋 [FILTER-ENRICH] Filter description:', filterDescription);
      } else {
        console.log('ℹ️  [FILTER-ENRICH] No filters matched from user message');
      }

      return params;

    } catch (error) {
      console.error('❌ [FILTER-ENRICH] Error enriching parameters:', error.message);
      logger.error('Error enriching parameters with filters:', error);
      // Return original params on error (graceful fallback)
      return params;
    }
  }

  /**
   * Format search results into a user-friendly message
   * @param {Array} results - Search results
   * @param {string} language - Response language (will be detected from user message if not provided)
   * @param {string} userMessage - Optional: original user message for language detection
   * @returns {Promise<string>} Formatted message
   */
  async formatResults(results, language = 'ar', userMessage = null) {
    try {
      // Detect language from user message if provided, otherwise use provided language
      const detectedLanguage = userMessage ? detectLanguage(userMessage) : language;
      // ========================================================================
      // DEBUG STEP 5: FORMATTING INPUT
      // ========================================================================
      console.log('\n' + '='.repeat(80));
      console.log('📝 [DEBUG STEP 5] FORMATTING INPUT');
      console.log('='.repeat(80));
      console.log('Results Count:', results?.length || 0);
      console.log('Provided Language:', language);
      console.log('Detected Language:', detectedLanguage);
      console.log('Provider:', this.provider);
      if (results && results.length > 0) {
        console.log('First Result Preview:', JSON.stringify(results[0], null, 2).substring(0, 500));
      }
      console.log('='.repeat(80) + '\n');

      console.log('📝 [AI-FORMAT] Starting result formatting...');
      
      if (!results || results.length === 0) {
        console.log('⚠️  [AI-FORMAT] No results to format');
        return detectedLanguage === 'ar' 
          ? 'عذراً، لم أجد أي نتائج تطابق بحثك. يرجى المحاولة مرة أخرى بمعايير مختلفة.'
          : 'Sorry, I couldn\'t find any results matching your search. Please try again with different criteria.';
      }

      // Add listing URLs and photo URLs to each result before formatting
      // ⚠️ أقصى 7 نتائج - للمزيد يمكن للمستخدم زيارة kasioon.com أو التطبيق
      const enrichedResults = results.slice(0, 7).map(result => {
        const enriched = { ...result };

        // Add listing URL if id exists
        if (result.id) {
          enriched.listingUrl = `https://www.kasioon.com/listing/${result.id}/`;
        }

        // Add first photo URL if images exist
        if (result.images && Array.isArray(result.images) && result.images.length > 0) {
          // Handle both string URLs and objects with url property
          const firstImage = result.images[0];
          enriched.photoUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage);
        } else if (result.image) {
          // Fallback for single image field
          enriched.photoUrl = typeof result.image === 'string' ? result.image : (result.image.url || result.image);
        }

        // ✨ NEW: Include attribute matching info if available
        if (result._attributeMatch) {
          enriched.attributeMatch = {
            type: result._attributeMatch.type,
            score: result._attributeMatch.score,
            matched: result._attributeMatch.matched,
            unmatched: result._attributeMatch.unmatched,
            notes: result._attributeMatch.notes
          };
        }

        return enriched;
      });

      // Create a more generic prompt that works for all categories
      // IMPORTANT: Always respond in the same language as the user's original message
      const systemPrompt = detectedLanguage === 'ar'
        ? `أنت مساعد ذكي يساعد المستخدمين في البحث عن المنتجات في سوق kasioon.com.

قم بتنسيق نتائج البحث التالية بشكل واضح وجذاب باللغة العربية فقط. استجب دائماً بالعربية.

اعرض لكل نتيجة:
- العنوان/الاسم
- الفئة (سيارات، عقارات، إلكترونيات، إلخ)
- السعر (إن وجد)
- الموقع/المدينة (إن وجد)
- الخصائص المهمة (الغرف، المساحة، العلامة التجارية، إلخ)
- رابط الإعلان (listingUrl) - يجب تضمينه دائماً
- رابط الصورة (photoUrl) - إذا كان متوفراً

✨ **معلومات مطابقة الخصائص (إن وجدت):**
- إذا كان للنتيجة حقل attributeMatch، اذكر درجة المطابقة:
  - exact match → "✅ مطابق تماماً للمواصفات المطلوبة"
  - partial match → "⚠️ مطابق جزئياً (درجة المطابقة: X%)"
  - no_match → "❌ غير مطابق للمواصفات"
- اذكر الخصائص المطابقة والخصائص غير المطابقة

استخدم الإيموجي لجعل الرسالة أكثر جاذبية. كن واضحاً ومختصراً. تأكد من تضمين رابط الإعلان لكل نتيجة.`
        : `You are an AI assistant helping users search for products on kasioon.com marketplace.

Format the following search results in a clear and attractive way in English only. Always respond in English.

For each result, show:
- Title/Name
- Category (vehicles, real estate, electronics, etc.)
- Price (if available)
- Location/City (if available)
- Important attributes (rooms, area, brand, etc.)
- Listing URL (listingUrl) - MUST be included for every result
- Photo URL (photoUrl) - if available

✨ **Attribute Matching Info (if available):**
- If result has attributeMatch field, mention the match score:
  - exact match → "✅ Perfect match for requested specs"
  - partial match → "⚠️ Partial match (score: X%)"
  - no_match → "❌ Does not match specs"
- Mention which attributes matched and which didn't

Use emojis to make the message more engaging. Be clear and concise. Make sure to include the listing URL for every result.`;

      const resultsData = JSON.stringify(enrichedResults, null, 2); // Limit to top 10 results
      console.log('📦 [AI-FORMAT] Results data size:', resultsData.length, 'characters');

      let formattedMessage;

      if (this.provider === 'anthropic' && this.anthropic) {
        console.log('🔵 [AI-FORMAT] Using Anthropic Claude...');
        console.log('🤖 [AI-FORMAT] Model:', this.anthropicModel);
        
        const response = await this.anthropic.messages.create({
          model: this.anthropicModel,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `${systemPrompt}\n\nSearch Results:\n${resultsData}`
            }
          ]
        });

        console.log('✅ [AI-FORMAT] Anthropic response received');
        formattedMessage = response.content[0].text;

      } else if (this.openai) {
        console.log('🟢 [AI-FORMAT] Using OpenAI GPT...');
        console.log('🤖 [AI-FORMAT] Model:', this.openaiModel);
        
        try {
          const response = await this.openai.chat.completions.create({
            model: this.openaiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Search Results:\n${resultsData}` }
            ],
            temperature: 0.7
          });

          console.log('✅ [AI-FORMAT] OpenAI response received');
          formattedMessage = response.choices[0].message.content;
        } catch (modelError) {
          // Check if it's a temperature error - retry without temperature
          if (modelError.message && modelError.message.includes('temperature') && 
              modelError.message.includes('does not support')) {
            console.warn('⚠️  [AI-FORMAT] Temperature not supported, retrying without temperature...');
            try {
              const response = await this.openai.chat.completions.create({
                model: this.openaiModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `Search Results:\n${resultsData}` }
                ]
                // No temperature parameter
              });
              
              console.log('✅ [AI-FORMAT] Retry without temperature succeeded!');
              formattedMessage = response.choices[0].message.content;
            } catch (retryError) {
              console.error('❌ [AI-FORMAT] Retry also failed:', retryError.message);
              throw modelError; // Throw original error
            }
          }
          // If model access error, try fallback models
          else if (modelError.message && modelError.message.includes('does not have access to model')) {
            console.warn('⚠️  [AI-FORMAT] Model access error, trying fallback models...');
            const fallbackModels = ['gpt-5-mini', 'gpt-3.5-turbo', 'gpt-4'];
            
            for (const fallbackModel of fallbackModels) {
              if (fallbackModel === this.openaiModel) continue; // Skip if already tried
              
              try {
                console.log(`🔄 [AI-FORMAT] Trying fallback model: ${fallbackModel}`);
                const response = await this.openai.chat.completions.create({
                  model: fallbackModel,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Search Results:\n${resultsData}` }
                  ],
                  temperature: 0.7
                });
                
                console.log(`✅ [AI-FORMAT] Fallback model ${fallbackModel} worked!`);
                formattedMessage = response.choices[0].message.content;
                break; // Success, exit loop
              } catch (fallbackError) {
                console.warn(`❌ [AI-FORMAT] Fallback model ${fallbackModel} also failed:`, fallbackError.message);
                if (fallbackModel === fallbackModels[fallbackModels.length - 1]) {
                  // Last fallback failed, throw original error
                  throw modelError;
                }
              }
            }
          } else {
            throw modelError;
          }
        }
      }

      // ========================================================================
      // DEBUG STEP 5 (continued): FORMATTED OUTPUT
      // ========================================================================
      console.log('\n' + '='.repeat(80));
      console.log('✅ [DEBUG STEP 5] FORMATTED OUTPUT');
      console.log('='.repeat(80));
      console.log('Formatted Message Length:', formattedMessage?.length || 0);
      console.log('Formatted Message (first 1000 chars):', formattedMessage?.substring(0, 1000));
      console.log('='.repeat(80) + '\n');

      console.log('✅ [AI-FORMAT] Formatting complete!');
      return formattedMessage;

    } catch (error) {
      console.error('❌ [AI-FORMAT] Error formatting results:', {
        message: error.message,
        stack: error.stack
      });
      console.log('🔄 [AI-FORMAT] Falling back to simple formatting...');
      logger.error('Error formatting results:', error);
      // Fallback to simple formatting
      const fallbackLanguage = userMessage ? detectLanguage(userMessage) : language;
      return this.simpleFormat(results, fallbackLanguage);
    }
  }

  /**
   * Simple fallback formatting
   */
  simpleFormat(results, language = 'ar') {
    if (language === 'ar') {
      let message = `🚗 وجدت ${results.length} نتيجة:\n\n`;
      results.slice(0, 7).forEach((item, index) => {
        const title = item.title || item.name || `${item.brand || ''} ${item.model || ''}`.trim() || 'إعلان';
        message += `${index + 1}. ${title}\n`;
        
        if (item.brand || item.model) {
          message += `   🏷️ ${item.brand || ''} ${item.model || ''}\n`;
        }
        if (item.year) {
          message += `   📅 السنة: ${item.year}\n`;
        }
        if (item.attributes?.price || item.price) {
          message += `   💰 السعر: ${item.attributes?.price || item.price}\n`;
        }
        // Handle location - API returns location.city as string
        let locationText = null;
        if (item.location) {
          if (typeof item.location === 'string') {
            locationText = item.location;
          } else if (item.location.city) {
            locationText = typeof item.location.city === 'string' 
              ? item.location.city 
              : item.location.city.name;
            if (item.location.province && item.location.province !== locationText) {
              locationText = `${locationText}, ${item.location.province}`;
            }
          } else if (item.location.province) {
            locationText = item.location.province;
          } else if (item.location.cityName) {
            locationText = item.location.cityName;
          }
        } else if (item.city) {
          locationText = typeof item.city === 'string' ? item.city : item.city.name;
        }
        if (locationText) {
          message += `   📍 المدينة: ${locationText}\n`;
        }
        
        // Add listing URL
        if (item.id) {
          message += `   🔗 الرابط: https://www.kasioon.com/listing/${item.id}/\n`;
        }
        
        // Add photo URL if available
        if (item.images && Array.isArray(item.images) && item.images.length > 0) {
          const firstImage = item.images[0];
          const photoUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage);
          message += `   📷 الصورة: ${photoUrl}\n`;
        } else if (item.image) {
          const photoUrl = typeof item.image === 'string' ? item.image : (item.image.url || item.image);
          message += `   📷 الصورة: ${photoUrl}\n`;
        }
        
        message += `\n`;
      });
      return message;
    } else {
      let message = `🚗 Found ${results.length} results:\n\n`;
      results.slice(0, 7).forEach((item, index) => {
        const title = item.title || item.name || `${item.brand || ''} ${item.model || ''}`.trim() || 'Listing';
        message += `${index + 1}. ${title}\n`;
        
        if (item.brand || item.model) {
          message += `   🏷️ ${item.brand || ''} ${item.model || ''}\n`;
        }
        if (item.year) {
          message += `   📅 Year: ${item.year}\n`;
        }
        if (item.attributes?.price || item.price) {
          message += `   💰 Price: ${item.attributes?.price || item.price}\n`;
        }
        // Handle location - API returns location.city as string
        let locationText = null;
        if (item.location) {
          if (typeof item.location === 'string') {
            locationText = item.location;
          } else if (item.location.city) {
            locationText = typeof item.location.city === 'string' 
              ? item.location.city 
              : item.location.city.name;
            if (item.location.province && item.location.province !== locationText) {
              locationText = `${locationText}, ${item.location.province}`;
            }
          } else if (item.location.province) {
            locationText = item.location.province;
          } else if (item.location.cityName) {
            locationText = item.location.cityName;
          }
        } else if (item.city) {
          locationText = typeof item.city === 'string' ? item.city : item.city.name;
        }
        if (locationText) {
          message += `   📍 City: ${locationText}\n`;
        }
        
        // Add listing URL
        if (item.id) {
          message += `   🔗 Link: https://www.kasioon.com/listing/${item.id}/\n`;
        }
        
        // Add photo URL if available
        if (item.images && Array.isArray(item.images) && item.images.length > 0) {
          const firstImage = item.images[0];
          const photoUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage);
          message += `   📷 Photo: ${photoUrl}\n`;
        } else if (item.image) {
          const photoUrl = typeof item.image === 'string' ? item.image : (item.image.url || item.image);
          message += `   📷 Photo: ${photoUrl}\n`;
        }
        
        message += `\n`;
      });
      return message;
    }
  }

  /**
   * Transcribe voice message to text using OpenAI Whisper
   * @param {Buffer} audioBuffer - Audio file buffer
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(audioBuffer) {
    const startTime = Date.now();
    try {
      console.log('🎙️ [TRANSCRIBE-DEBUG] Starting transcription...', {
        buffer_size: audioBuffer?.length,
        buffer_type: typeof audioBuffer,
        has_openai: !!this.openai
      });

      if (!this.openai) {
        console.error('🎙️ [TRANSCRIBE-DEBUG] OpenAI client not initialized');
        throw new Error('OpenAI is required for audio transcription');
      }

      // Import toFile helper from openai package for proper file handling
      const { toFile } = require('openai');

      console.log('🎙️ [TRANSCRIBE-DEBUG] Creating file object...');
      // Create proper file object for OpenAI API
      const file = await toFile(audioBuffer, 'audio.ogg', { type: 'audio/ogg' });
      console.log('🎙️ [TRANSCRIBE-DEBUG] File object created:', {
        file_name: file.name,
        file_type: file.type,
        file_size: file.size
      });

      console.log('🎙️ [TRANSCRIBE-DEBUG] Sending transcription request to OpenAI...', {
        model: 'whisper-1'
      });
      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1'
        // Language auto-detection - Whisper handles this better without hardcoding
      });

      console.log('🎙️ [TRANSCRIBE-DEBUG] Transcription response received:', {
        has_text: !!response.text,
        text_length: response.text?.length,
        text_preview: response.text?.substring(0, 100),
        transcription_time_ms: Date.now() - startTime
      });

      logger.info('Audio transcribed successfully');
      return response.text;

    } catch (error) {
      console.error('🎙️ [TRANSCRIBE-DEBUG] Transcription failed:', {
        error_message: error.message,
        error_type: error.constructor.name,
        error_code: error.code,
        error_status: error.status,
        error_response: error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : undefined,
        transcription_time_ms: Date.now() - startTime
      });

      logger.error('Error transcribing audio:', error);

      // Provide more context in error messages
      if (error.message?.includes('Invalid file')) {
        throw new Error('Audio file format is not supported. Please try again.');
      }
      if (error.message?.includes('timeout')) {
        throw new Error('Audio transcription timed out. The file may be too large.');
      }

      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Analyze search results and return most relevant ones with comprehensive match scoring
   * @param {Array} results - Search results from API
   * @param {string} userMessage - Original user query
   * @param {Object} userParams - Extracted search parameters
   * @param {number} maxResults - Maximum number of results to return (default: 10)
   * @param {number} minScore - Minimum match score threshold (default: 30)
   * @returns {Promise<Array>} Filtered and ranked results with match scores
   */
  async filterRelevantResults(results, userMessage, userParams = {}, maxResults = 10, minScore = 30) {
    try {
      // If results are already within limit, return all
      if (!results || results.length === 0) {
        return results;
      }

      // Calculate match scores for all results
      const scoredResults = results.map(result => {
        const scoreResult = MatchScorer.calculateMatchScore(
          result,
          userParams,
          userMessage,
          userParams.matchedFilters || {}
        );

        return {
          ...result,
          matchScore: scoreResult.matchScore,
          matchDetails: scoreResult.matchDetails,
          excluded: scoreResult.excluded,
          excludeReason: scoreResult.excludeReason
        };
      });

      // Filter out excluded results
      const excludedResults = scoredResults.filter(r => r.excluded);

      // Sort by match score (descending)
      const sortedResults = MatchScorer.sortByMatchScore(scoredResults);

      // Filter by minimum score threshold
      const filteredResults = MatchScorer.filterByThreshold(sortedResults, minScore);

      // Return top N results
      const topResults = filteredResults.slice(0, maxResults);

      if (topResults.length > 0) {

        // Validate results quality
        const language = userParams.language || 'ar';
        const validation = ResultValidator.validate(topResults, userParams, userMessage, language);
        console.log(`🔍 [VALIDATOR] Quality score: ${validation.qualityScore}%`);

        if (validation.warnings.length > 0) {
          console.log(`⚠️  [VALIDATOR] Warnings:`, validation.warnings);
        }

        // Attach validation info to results for use in response formatting
        return topResults.map(result => ({
          ...result,
          _validation: {
            qualityScore: validation.qualityScore,
            warnings: validation.warnings,
            suggestions: validation.suggestions
          }
        }));
      }

      return topResults;

    } catch (error) {
      console.error('❌ [AI-FILTER] Error filtering results:', error.message);
      logger.error('Error filtering results:', error);
      // Fallback: return first N results
      return results.slice(0, maxResults);
    }
  }

  /**
   * 🆕 ENHANCED: Search marketplace with intelligent keyword expansion and fallback
   * Uses new intelligentSearch flow instead of old smartSearch
   * ✨ NEW: Includes attribute matching for precise results
   *
   * @param {Object} params - Search parameters with expandedKeywords
   * @param {string} userMessage - Original user message
   * @param {string} language - Language code
   * @returns {Promise<Object>} Search results with metadata
   */
  async searchMarketplace(params, userMessage = '', language = 'ar') {
    try {
      // ========================================================================
      // DEBUG STEP 4: SEARCH PARAMETERS
      // ========================================================================
      console.log('\n' + '='.repeat(80));
      console.log('🔍 [DEBUG STEP 4] SEARCH PARAMETERS');
      console.log('='.repeat(80));
      console.log('Search Params:', JSON.stringify(params, null, 2));
      console.log('User Message:', userMessage);
      console.log('Language:', language);
      console.log('='.repeat(80) + '\n');

      console.log('🔍 [AGENT] Starting intelligent marketplace search...');

      // Extract requested attributes if available
      const requestedAttributes = params.requestedAttributes || null;
      const hasRequestedAttributes = requestedAttributes && Object.keys(requestedAttributes).length > 0;

      if (hasRequestedAttributes) {
        console.log('✨ [AGENT] User requested specific attributes:', requestedAttributes);
      }

      // NEW: Check if we have expanded keywords (from new AI analysis)
      if (params.expandedKeywords && params.expandedKeywords.length > 0) {
        console.log('🧠 [AGENT] Using intelligent search with keyword expansion');

        // Use new intelligent search method
        const searchResult = await marketplaceSearch.intelligentSearch(params);

        // Apply relevance filtering if we have results
        let finalResults = searchResult.results;
        if (finalResults.length > 0 && userMessage) {
          finalResults = await this.filterRelevantResults(
            finalResults,
            userMessage,
            params
          );
        }

        // ✨ NEW: Apply attribute matching if user requested specific attributes
        if (hasRequestedAttributes && finalResults.length > 0) {
          console.log('🎯 [AGENT] Applying attribute matching...');
          finalResults = await this.applyAttributeMatching(
            finalResults,
            requestedAttributes,
            language
          );
        }

        return {
          results: finalResults,
          searchType: searchResult.searchType,
          usedKeywords: searchResult.usedKeywords,
          matchedCategories: searchResult.matchedCategories,
          fallbackMessage: this.buildResponseMessage(searchResult, language),
          attributeMatchingApplied: hasRequestedAttributes
        };
      }

      // FALLBACK: Old flow for backward compatibility (if no expanded keywords)
      console.log('⚠️  [AGENT] No expanded keywords, using legacy smart search');

      // Step 1: Enrich parameters with category-specific filters
      const enrichedParams = await this.enrichParametersWithFilters(params, userMessage, language);

      // Step 2: Use smart search
      const { results, usedStrategy, totalStrategiesTried, fallbackMessage } = await marketplaceSearch.smartSearch(enrichedParams);

      // Step 3: Filter and score results by relevance
      let filteredResults = results;
      if (results.length > 0 && userMessage) {
        filteredResults = await this.filterRelevantResults(
          results,
          userMessage,
          enrichedParams
        );
      }

      // ✨ NEW: Apply attribute matching if user requested specific attributes
      if (hasRequestedAttributes && filteredResults.length > 0) {
        console.log('🎯 [AGENT] Applying attribute matching...');
        filteredResults = await this.applyAttributeMatching(
          filteredResults,
          requestedAttributes,
          language
        );
      }

      return {
        results: filteredResults,
        usedStrategy,
        totalStrategiesTried,
        filterDescription: enrichedParams.filterDescription || null,
        matchedFilters: enrichedParams.matchedFilters || null,
        fallbackMessage: fallbackMessage ? (fallbackMessage[language] || fallbackMessage.ar || fallbackMessage) : null,
        attributeMatchingApplied: hasRequestedAttributes
      };
    } catch (error) {
      console.error('❌ [AGENT] Search error:', error.message);
      throw error;
    }
  }

  /**
   * ✨ NEW: Apply attribute matching to search results
   * تطبيق مطابقة الخصائص على نتائج البحث
   *
   * @param {Array} searchResults - Search results from marketplace
   * @param {Object} requestedAttributes - Attributes requested by user
   * @param {string} language - Language code (ar/en)
   * @returns {Promise<Array>} Results with attribute matching applied and reordered
   */
  async applyAttributeMatching(searchResults, requestedAttributes, language = 'ar') {
    try {
      console.log('🎯 [ATTR-MATCH] Starting attribute matching process...');
      console.log(`📊 [ATTR-MATCH] Processing ${searchResults.length} results`);
      console.log('📋 [ATTR-MATCH] Requested attributes:', requestedAttributes);

      // Step 1: Extract relevant attributes from listings (للاقتصاد - نرسل فقط الخصائص المطلوبة للـ AI)
      const extractedData = AttributeMatcher.extractRelevantAttributes(
        searchResults,
        requestedAttributes
      );

      // Step 2: Match attributes using AI
      const matchedResults = await AttributeMatcher.matchWithAI(
        requestedAttributes,
        extractedData,
        this, // Pass the AI agent instance
        language
      );

      // Step 3: Reorder by match score
      const reorderedMatches = AttributeMatcher.reorderByMatchScore(matchedResults);

      // Step 4: Apply matching data to original search results
      const enhancedResults = AttributeMatcher.applyMatchingToResults(
        searchResults,
        reorderedMatches
      );

      console.log('✅ [ATTR-MATCH] Attribute matching complete');
      console.log(`📊 [ATTR-MATCH] Results breakdown:`);
      console.log(`   - Exact matches: ${enhancedResults.filter(r => r._attributeMatch?.type === 'exact').length}`);
      console.log(`   - Partial matches: ${enhancedResults.filter(r => r._attributeMatch?.type === 'partial').length}`);
      console.log(`   - No matches: ${enhancedResults.filter(r => r._attributeMatch?.type === 'no_match').length}`);

      return enhancedResults;

    } catch (error) {
      console.error('❌ [ATTR-MATCH] Error in attribute matching:', error.message);
      logger.error('Error applying attribute matching:', error);
      // Fallback: return original results without attribute matching
      return searchResults;
    }
  }

  /**
   * 🆕 Build user-friendly response message based on search results
   * بناء رسالة ودية للمستخدم بناءً على نتائج البحث
   *
   * @param {Object} searchResult - Result from intelligent search
   * @param {string} language - Language code (ar/en)
   * @returns {string|null} Response message or null
   */
  buildResponseMessage(searchResult, language = 'ar') {
    const { searchType, matchedCategories, message } = searchResult;

    if (searchType === 'exact') {
      // Found results with exact keywords - no message needed
      return null;
    }

    if (searchType === 'similar' && matchedCategories && matchedCategories.length > 0) {
      const categoryNames = matchedCategories.map(c => c.name).join('، ');
      return language === 'ar'
        ? `⚠️ لم نجد نتائج مطابقة تماماً، لكن وجدنا نتائج مشابهة في: ${categoryNames}`
        : `⚠️ No exact matches found, but found similar results in: ${categoryNames}`;
    }

    if (searchType === 'no_results' && message) {
      return message[language] || message.ar || message;
    }

    return null;
  }

  /**
   * Create a hash from a string for caching purposes
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * 🆕 Match attributes using AI
   * مطابقة الخصائص باستخدام الـ AI
   *
   * @param {Object} prompt - Prompt object with systemPrompt and dataPrompt
   * @param {string} language - Language code (ar/en)
   * @returns {Promise<string>} AI response (JSON string)
   */
  async matchAttributes(prompt, language = 'ar') {
    try {
      console.log('🤖 [AI-MATCH-ATTR] Matching attributes with AI...');

      const { systemPrompt, dataPrompt } = prompt;
      const fullPrompt = `${systemPrompt}\n\n${dataPrompt}`;

      let aiResponse;

      if (this.provider === 'anthropic' && this.anthropic) {
        console.log('🔵 [AI-MATCH-ATTR] Using Anthropic Claude...');

        const response = await this.anthropic.messages.create({
          model: this.anthropicModel,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: fullPrompt
            }
          ]
        });

        aiResponse = response.content[0].text;

      } else if (this.openai) {
        console.log('🟢 [AI-MATCH-ATTR] Using OpenAI GPT...');

        const model = modelManager.getModel('extract_params', 'openai');

        const response = await this.openai.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: dataPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        });

        aiResponse = response.choices[0].message.content;

      } else {
        throw new Error('No AI provider configured');
      }

      console.log('✅ [AI-MATCH-ATTR] AI matching complete');
      console.log('📄 [AI-MATCH-ATTR] Response length:', aiResponse.length);

      return aiResponse;

    } catch (error) {
      console.error('❌ [AI-MATCH-ATTR] Error:', error.message);
      logger.error('Error in AI attribute matching:', error);
      throw error;
    }
  }
}

module.exports = new AIAgent();

