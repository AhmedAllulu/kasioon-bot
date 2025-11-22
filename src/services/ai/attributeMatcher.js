const logger = require('../../utils/logger');

/**
 * Attribute Matcher - نظام مطابقة الخصائص الذكي
 * يقوم بمطابقة الخصائص المطلوبة من المستخدم مع خصائص الإعلانات
 */
class AttributeMatcher {
  /**
   * استخراج كل الخصائص من نتائج البحث
   * Extract ALL attributes from search results (AI will match intelligently)
   *
   * ⚠️ IMPORTANT: نرسل كل الخصائص لأن أسماء الخصائص قد تختلف
   * (مثلاً: AI يستخرج "color" لكن DB يحتوي "vehicle_color")
   *
   * @param {Array} listings - نتائج البحث من API
   * @param {Object} requestedAttributes - الخصائص المطلوبة من المستخدم
   * @returns {Array} - مصفوفة من كل الخصائص لكل إعلان
   */
  static extractRelevantAttributes(listings, requestedAttributes) {
    if (!requestedAttributes || Object.keys(requestedAttributes).length === 0) {
      console.log('ℹ️ [ATTR-MATCHER] No requested attributes - skipping extraction');
      return [];
    }

    console.log('🔍 [ATTR-MATCHER] Extracting ALL attributes from listings...');
    console.log(`📋 [ATTR-MATCHER] Requested attributes:`, requestedAttributes);
    console.log(`⚠️ [ATTR-MATCHER] Sending ALL attributes to AI for intelligent matching`);

    const extractedData = [];

    for (const listing of listings) {
      if (!listing.attributes || typeof listing.attributes !== 'object') {
        // لا توجد خصائص في الإعلان
        extractedData.push({
          listingId: listing.id,
          title: listing.title,
          allAttributes: {},
          hasAttributes: false
        });
        continue;
      }

      // استخراج كل الخصائص (ليس فقط المطلوبة)
      const allAttributes = {};
      for (const [key, attrData] of Object.entries(listing.attributes)) {
        // Extract value from attribute object
        if (attrData && typeof attrData === 'object') {
          allAttributes[key] = {
            name: attrData.name || key,
            value: attrData.value || attrData,
            unit: attrData.unit_ar || attrData.unit_en || null
          };
        } else {
          allAttributes[key] = {
            name: key,
            value: attrData,
            unit: null
          };
        }
      }

      extractedData.push({
        listingId: listing.id,
        title: listing.title,
        allAttributes: allAttributes,
        hasAttributes: Object.keys(allAttributes).length > 0
      });
    }

    console.log(`✅ [ATTR-MATCHER] Extracted ALL attributes for ${extractedData.length} listings`);
    return extractedData;
  }

  /**
   * البحث عن مفتاح خاصية مشابه
   * Find similar attribute key (handle different naming conventions)
   *
   * @param {string} requestedKey - المفتاح المطلوب
   * @param {Object} attributes - كل الخصائص المتوفرة
   * @returns {string|null} - المفتاح المشابه أو null
   */
  static findSimilarAttributeKey(requestedKey, attributes) {
    const normalizedRequested = requestedKey.toLowerCase().replace(/[-_\s]/g, '');

    for (const key of Object.keys(attributes)) {
      const normalizedKey = key.toLowerCase().replace(/[-_\s]/g, '');

      // مطابقة تامة
      if (normalizedKey === normalizedRequested) {
        return key;
      }

      // مطابقة جزئية
      if (normalizedKey.includes(normalizedRequested) || normalizedRequested.includes(normalizedKey)) {
        return key;
      }

      // مطابقة بناءً على الاسم (للخصائص ذات الأسماء المختلفة)
      const attributeName = attributes[key].name || '';
      if (attributeName.toLowerCase().includes(requestedKey.toLowerCase()) ||
          requestedKey.toLowerCase().includes(attributeName.toLowerCase())) {
        return key;
      }
    }

    return null;
  }

  /**
   * مطابقة الخصائص باستخدام AI
   * Match attributes using AI (intelligent matching)
   *
   * @param {Object} requestedAttributes - الخصائص المطلوبة من المستخدم
   * @param {Array} extractedData - البيانات المستخرجة من النتائج
   * @param {Object} aiAgent - وكيل الـ AI
   * @param {string} language - اللغة (ar/en)
   * @returns {Promise<Array>} - النتائج مع درجة المطابقة
   */
  static async matchWithAI(requestedAttributes, extractedData, aiAgent, language = 'ar') {
    try {
      console.log('🤖 [ATTR-MATCHER] Starting AI-based attribute matching...');

      if (extractedData.length === 0) {
        console.log('⚠️ [ATTR-MATCHER] No data to match');
        return [];
      }

      // بناء الـ prompt للـ AI
      const prompt = this.buildMatchingPrompt(requestedAttributes, extractedData, language);

      console.log('📤 [ATTR-MATCHER] Sending to AI for matching...');
      console.log(`📊 [ATTR-MATCHER] Matching ${extractedData.length} listings`);

      // استدعاء الـ AI
      const aiResponse = await aiAgent.matchAttributes(prompt, language);

      // معالجة النتيجة
      const matchResults = this.processAIMatchResponse(aiResponse, extractedData);

      console.log('✅ [ATTR-MATCHER] AI matching complete');
      return matchResults;

    } catch (error) {
      console.error('❌ [ATTR-MATCHER] Error in AI matching:', error.message);
      logger.error('Error in AI attribute matching:', error);

      // Fallback: استخدام مطابقة بسيطة
      return this.simpleMatch(requestedAttributes, extractedData);
    }
  }

  /**
   * بناء prompt للـ AI لمطابقة الخصائص
   * Build AI prompt for attribute matching
   *
   * ⚠️ IMPORTANT: نرسل كل الخصائص للـ AI ليطابق بذكاء
   * (أسماء الخصائص قد تختلف بين ما يستخرجه AI وما في DB)
   */
  static buildMatchingPrompt(requestedAttributes, extractedData, language) {
    const isArabic = language === 'ar';

    // تحضير البيانات للـ AI - إرسال كل الخصائص
    const simplifiedData = extractedData.map(item => ({
      id: item.listingId,
      title: item.title,
      attributes: item.allAttributes // ✅ كل الخصائص وليس فقط المطلوبة
    }));

    const systemPrompt = isArabic ? `
أنت خبير في مطابقة الخصائص لمنصة قاسيون للإعلانات المبوبة.

🎯 **مهمتك:**
قارن الخصائص المطلوبة من المستخدم مع الخصائص الموجودة في كل إعلان وحدد:
- هل الإعلان **مطابق تماماً** (exact match)
- هل الإعلان **مطابق جزئياً** (partial match)
- هل الإعلان **غير مطابق** (no match)

⚠️ **مهم:**
- كن ذكياً في المطابقة (مثلاً: "أبيض" = "white" = "ابيض")
- السنوات: اقبل نطاق ±2 سنوات (مثلاً: طلب 2020 → اقبل 2018-2022)
- الأرقام: اقبل نطاق ±10% (مثلاً: طلب 200 متر → اقبل 180-220)

📋 **أرجع JSON فقط بالتنسيق التالي:**
[
  {
    "listingId": "id",
    "matchType": "exact" | "partial" | "no_match",
    "matchScore": 0-100,
    "matchedAttributes": ["attr1", "attr2"],
    "unmatchedAttributes": ["attr3"],
    "notes": "ملاحظات قصيرة عن المطابقة"
  }
]` : `
You are an expert in attribute matching for Qasioun marketplace platform.

🎯 **Your task:**
Compare requested attributes from the user with attributes in each listing and determine:
- Is the listing an **exact match**
- Is the listing a **partial match**
- Is the listing **no match**

⚠️ **Important:**
- Be intelligent in matching (e.g., "white" = "أبيض" = "ابيض")
- Years: Accept ±2 years range (e.g., requested 2020 → accept 2018-2022)
- Numbers: Accept ±10% range (e.g., requested 200 sqm → accept 180-220)

📋 **Return JSON only in this format:**
[
  {
    "listingId": "id",
    "matchType": "exact" | "partial" | "no_match",
    "matchScore": 0-100,
    "matchedAttributes": ["attr1", "attr2"],
    "unmatchedAttributes": ["attr3"],
    "notes": "Brief notes about the match"
  }
]`;

    const dataPrompt = isArabic ?
      `**الخصائص المطلوبة:**\n${JSON.stringify(requestedAttributes, null, 2)}\n\n**الإعلانات المتوفرة:**\n${JSON.stringify(simplifiedData, null, 2)}` :
      `**Requested attributes:**\n${JSON.stringify(requestedAttributes, null, 2)}\n\n**Available listings:**\n${JSON.stringify(simplifiedData, null, 2)}`;

    return {
      systemPrompt,
      dataPrompt
    };
  }

  /**
   * معالجة استجابة الـ AI
   * Process AI response
   */
  static processAIMatchResponse(aiResponse, extractedData) {
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      console.log('📝 [ATTR-MATCHER] Parsing AI response...');
      let parsed = JSON.parse(cleanedResponse);

      // Handle different AI response formats
      // AI might return: [...] or { results: [...] } or { matches: [...] } or { listings: [...] } etc.
      let matches;
      if (Array.isArray(parsed)) {
        matches = parsed;
        console.log('✅ [ATTR-MATCHER] Response is direct array');
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Try to find an array in the object
        const possibleKeys = ['results', 'matches', 'listings', 'data', 'matchResults', 'items'];
        for (const key of possibleKeys) {
          if (parsed[key] && Array.isArray(parsed[key])) {
            matches = parsed[key];
            console.log(`✅ [ATTR-MATCHER] Found matches in "${key}" key`);
            break;
          }
        }

        // If still not found, try to find any array in the object
        if (!matches) {
          for (const [key, value] of Object.entries(parsed)) {
            if (Array.isArray(value) && value.length > 0) {
              matches = value;
              console.log(`✅ [ATTR-MATCHER] Found matches in "${key}" key (auto-detected)`);
              break;
            }
          }
        }
      }

      if (!matches) {
        console.warn('⚠️ [ATTR-MATCHER] Could not find matches array in response');
        console.log('📄 [ATTR-MATCHER] Response structure:', JSON.stringify(parsed, null, 2).substring(0, 500));
        throw new Error('AI response does not contain a valid matches array');
      }

      console.log(`✅ [ATTR-MATCHER] Found ${matches.length} match results`);

      // دمج النتائج مع البيانات الأصلية
      const results = extractedData.map(item => {
        const aiMatch = matches.find(m => m.listingId === item.listingId || m.id === item.listingId);

        if (aiMatch) {
          return {
            ...item,
            matchType: aiMatch.matchType,
            matchScore: aiMatch.matchScore,
            matchedAttributes: aiMatch.matchedAttributes,
            unmatchedAttributes: aiMatch.unmatchedAttributes,
            notes: aiMatch.notes
          };
        } else {
          // fallback
          return {
            ...item,
            matchType: 'no_match',
            matchScore: 0,
            matchedAttributes: [],
            unmatchedAttributes: Object.keys(item.relevantAttributes),
            notes: 'No AI match data'
          };
        }
      });

      return results;

    } catch (error) {
      console.error('❌ [ATTR-MATCHER] Error processing AI response:', error.message);
      throw error;
    }
  }

  /**
   * مطابقة بسيطة (fallback عند فشل الـ AI)
   * Simple matching (fallback when AI fails)
   *
   * ⚠️ يحاول مطابقة الخصائص المطلوبة مع كل الخصائص المتوفرة
   */
  static simpleMatch(requestedAttributes, extractedData) {
    console.log('⚠️ [ATTR-MATCHER] Using simple matching (AI fallback)');

    const requestedKeys = Object.keys(requestedAttributes);

    return extractedData.map(item => {
      const matchedAttrs = [];
      const unmatchedAttrs = [];
      const allAttrs = item.allAttributes || {};

      for (const reqKey of requestedKeys) {
        const requestedValue = String(requestedAttributes[reqKey]).toLowerCase();
        let found = false;

        // البحث في كل الخصائص (بأسماء مختلفة)
        for (const [attrKey, attrData] of Object.entries(allAttrs)) {
          const attrValue = String(attrData.value || attrData).toLowerCase();
          const attrName = String(attrData.name || attrKey).toLowerCase();

          // مطابقة بالقيمة أو بالاسم
          if (
            attrValue.includes(requestedValue) ||
            requestedValue.includes(attrValue) ||
            attrName.includes(reqKey.toLowerCase()) ||
            reqKey.toLowerCase().includes(attrName)
          ) {
            matchedAttrs.push(reqKey);
            found = true;
            break;
          }
        }

        if (!found) {
          unmatchedAttrs.push(reqKey);
        }
      }

      const matchScore = requestedKeys.length > 0
        ? Math.round((matchedAttrs.length / requestedKeys.length) * 100)
        : 0;

      let matchType = 'no_match';
      if (matchScore === 100) matchType = 'exact';
      else if (matchScore >= 50) matchType = 'partial';

      return {
        ...item,
        matchType,
        matchScore,
        matchedAttributes: matchedAttrs,
        unmatchedAttributes: unmatchedAttrs,
        notes: `Simple match: ${matchedAttrs.length}/${requestedKeys.length} matched`
      };
    });
  }

  /**
   * إعادة ترتيب النتائج حسب درجة المطابقة
   * Reorder results by match score
   *
   * @param {Array} matchedResults - النتائج مع درجات المطابقة
   * @returns {Array} - النتائج المرتبة
   */
  static reorderByMatchScore(matchedResults) {
    console.log('📊 [ATTR-MATCHER] Reordering results by match score...');

    // ترتيب حسب matchScore (تنازلياً)
    const sorted = [...matchedResults].sort((a, b) => {
      // أولوية للتطابق التام
      if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
      if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;

      // ثم حسب الدرجة
      return b.matchScore - a.matchScore;
    });

    console.log(`✅ [ATTR-MATCHER] Reordered ${sorted.length} results`);
    console.log(`   Exact matches: ${sorted.filter(r => r.matchType === 'exact').length}`);
    console.log(`   Partial matches: ${sorted.filter(r => r.matchType === 'partial').length}`);
    console.log(`   No matches: ${sorted.filter(r => r.matchType === 'no_match').length}`);

    return sorted;
  }

  /**
   * تطبيق المطابقة على نتائج البحث الكاملة
   * Apply matching to full search results
   *
   * @param {Array} searchResults - نتائج البحث الكاملة
   * @param {Array} matchedResults - النتائج مع درجات المطابقة
   * @returns {Array} - نتائج البحث المرتبة والمعدلة
   */
  static applyMatchingToResults(searchResults, matchedResults) {
    console.log('🔄 [ATTR-MATCHER] Applying matching to search results...');

    const enhancedResults = searchResults.map(listing => {
      const matchData = matchedResults.find(m => m.listingId === listing.id);

      if (matchData) {
        return {
          ...listing,
          _attributeMatch: {
            type: matchData.matchType,
            score: matchData.matchScore,
            matched: matchData.matchedAttributes,
            unmatched: matchData.unmatchedAttributes,
            notes: matchData.notes
          }
        };
      }

      return listing;
    });

    // إعادة ترتيب حسب درجة المطابقة
    const reordered = enhancedResults.sort((a, b) => {
      const scoreA = a._attributeMatch?.score || 0;
      const scoreB = b._attributeMatch?.score || 0;
      return scoreB - scoreA;
    });

    console.log('✅ [ATTR-MATCHER] Applied matching to results');
    return reordered;
  }
}

module.exports = AttributeMatcher;
