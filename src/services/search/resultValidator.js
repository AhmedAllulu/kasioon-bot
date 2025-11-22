/**
 * Result Validator
 * مدقق صحة النتائج - يتحقق من جودة نتائج البحث ومطابقتها لطلب المستخدم
 *
 * @module resultValidator
 */

const arabicNormalizer = require('../../utils/arabicNormalizer');
const logger = require('../../utils/logger');

/**
 * مدقق صحة النتائج
 * Validates search results quality and relevance
 */
class ResultValidator {
  constructor() {
    // الحد الأدنى لنسبة التطابق المقبولة
    this.MIN_ACCEPTABLE_SCORE = 70;

    // الحد الأدنى لنسبة التطابق الجيدة
    this.GOOD_SCORE_THRESHOLD = 85;
  }

  /**
   * التحقق من صحة النتائج
   * Validate search results
   *
   * @param {Array} results - نتائج البحث
   * @param {Object} searchParams - معاملات البحث الأصلية
   * @param {string} originalQuery - الاستعلام الأصلي
   * @param {string} language - اللغة
   * @returns {Object} - نتائج التحقق
   */
  validate(results, searchParams, originalQuery = '', language = 'ar') {
    if (!results || results.length === 0) {
      return {
        isValid: false,
        validResults: [],
        warnings: [],
        suggestions: this.getNoResultsSuggestions(searchParams, language),
        qualityScore: 0
      };
    }

    logger.info(`[ResultValidator] Validating ${results.length} results`);

    // 🚫 Filter out results belonging to other categories (strict requirement)
    if (searchParams && searchParams.category) {
      const beforeCount = results.length;
      results = results.filter(r => {
        const resultCategory = r.category?.slug || r.category?.name || '';
        return this.categoriesMatch(resultCategory, searchParams.category);
      });

      // If nothing matches after filtering, treat as no valid results
      if (results.length === 0) {
        logger.warn('[ResultValidator] No results remain after category filtering');
        return {
          isValid: false,
          validResults: [],
          warnings: [],
          suggestions: this.getNoResultsSuggestions(searchParams, language),
          qualityScore: 0
        };
      }

      if (beforeCount !== results.length) {
        logger.info(`[ResultValidator] Removed ${beforeCount - results.length} results from non-matching categories`);
      }
    }

    // فصل النتائج حسب جودة التطابق
    const categorizedResults = this.categorizeResults(results);
    const validationResult = {
      isValid: categorizedResults.excellent.length > 0 || categorizedResults.good.length > 0,
      excellentResults: categorizedResults.excellent,
      goodResults: categorizedResults.good,
      partialResults: categorizedResults.partial,
      poorResults: categorizedResults.poor,
      warnings: [],
      suggestions: [],
      qualityScore: this.calculateOverallQuality(results)
    };

    // تحقق من تطابق الموقع
    const locationValidation = this.validateLocationMatch(results, searchParams, language);
    if (!locationValidation.allMatch) {
      validationResult.warnings.push(locationValidation.warning);
      validationResult.suggestions.push(...locationValidation.suggestions);
    }

    // تحقق من تطابق الفئة
    const categoryValidation = this.validateCategoryMatch(results, searchParams, language);
    if (!categoryValidation.allMatch) {
      validationResult.warnings.push(categoryValidation.warning);
    }

    // تحقق من نطاق السعر
    if (searchParams.price) {
      const priceValidation = this.validatePriceRange(results, searchParams.price, language);
      if (priceValidation.warning) {
        validationResult.warnings.push(priceValidation.warning);
      }
    }

    // إضافة اقتراحات بناءً على الجودة
    if (validationResult.qualityScore < this.MIN_ACCEPTABLE_SCORE) {
      validationResult.suggestions.push(...this.getLowQualitySuggestions(searchParams, language));
    }

    logger.info(`[ResultValidator] Validation complete. Quality score: ${validationResult.qualityScore}%`);

    return validationResult;
  }

  /**
   * تصنيف النتائج حسب جودة التطابق
   * Categorize results by match quality
   */
  categorizeResults(results) {
    const categorized = {
      excellent: [], // 85+
      good: [],      // 70-84
      partial: [],   // 50-69
      poor: []       // < 50
    };

    for (const result of results) {
      const score = result.matchScore || 100; // إذا لم يكن هناك matchScore، اعتبرها 100

      if (score >= this.GOOD_SCORE_THRESHOLD) {
        categorized.excellent.push(result);
      } else if (score >= this.MIN_ACCEPTABLE_SCORE) {
        categorized.good.push(result);
      } else if (score >= 50) {
        categorized.partial.push(result);
      } else {
        categorized.poor.push(result);
      }
    }

    return categorized;
  }

  /**
   * حساب الجودة الإجمالية
   * Calculate overall quality score
   */
  calculateOverallQuality(results) {
    if (results.length === 0) return 0;

    const totalScore = results.reduce((sum, result) => {
      return sum + (result.matchScore || 100);
    }, 0);

    return Math.round(totalScore / results.length);
  }

  /**
   * التحقق من تطابق الموقع
   * Validate location match
   */
  validateLocationMatch(results, searchParams, language) {
    const requestedCity = searchParams.city;
    const requestedProvince = searchParams.province;

    if (!requestedCity && !requestedProvince) {
      return { allMatch: true };
    }

    let matchingResults = 0;
    let totalResults = results.length;

    for (const result of results) {
      const resultCity = result.city?.name || result.location || '';
      const resultProvince = result.province?.name || '';

      if (requestedCity && this.locationsMatch(resultCity, requestedCity)) {
        matchingResults++;
      } else if (requestedProvince && this.locationsMatch(resultProvince, requestedProvince)) {
        matchingResults++;
      }
    }

    const matchPercentage = (matchingResults / totalResults) * 100;

    if (matchPercentage < 50) {
      const warning = language === 'ar'
        ? `⚠️ معظم النتائج من مدن أخرى (${requestedCity || requestedProvince} غير متوفر بكثرة)`
        : `⚠️ Most results are from other cities (${requestedCity || requestedProvince} limited availability)`;

      const suggestions = language === 'ar'
        ? [
            '💡 جرب البحث في مدن قريبة',
            '💡 وسّع نطاق البحث لتشمل المحافظة كاملة',
            '💡 غيّر معايير البحث الأخرى'
          ]
        : [
            '💡 Try searching in nearby cities',
            '💡 Broaden search to include the whole province',
            '💡 Modify other search criteria'
          ];

      return {
        allMatch: false,
        matchPercentage,
        warning,
        suggestions
      };
    }

    return {
      allMatch: matchPercentage >= 80,
      matchPercentage
    };
  }

  /**
   * التحقق من تطابق الفئة
   * Validate category match
   */
  validateCategoryMatch(results, searchParams, language) {
    const requestedCategory = searchParams.category;

    if (!requestedCategory) {
      return { allMatch: true };
    }

    let matchingResults = 0;

    for (const result of results) {
      const resultCategory = result.category?.slug || result.category?.name || '';

      if (this.categoriesMatch(resultCategory, requestedCategory)) {
        matchingResults++;
      }
    }

    const matchPercentage = (matchingResults / results.length) * 100;

    if (matchPercentage < 80) {
      const warning = language === 'ar'
        ? `⚠️ بعض النتائج من فئات مختلفة`
        : `⚠️ Some results are from different categories`;

      return {
        allMatch: false,
        matchPercentage,
        warning
      };
    }

    return {
      allMatch: true,
      matchPercentage
    };
  }

  /**
   * التحقق من نطاق السعر
   * Validate price range
   */
  validatePriceRange(results, requestedPrice, language) {
    if (!requestedPrice.min && !requestedPrice.max) {
      return { isValid: true };
    }

    let withinRange = 0;
    let outOfRange = 0;

    for (const result of results) {
      const price = result.price?.amount || result.price || 0;

      if (price === 0) continue; // تجاهل النتائج بدون سعر

      let inRange = true;
      if (requestedPrice.min && price < requestedPrice.min) {
        inRange = false;
      }
      if (requestedPrice.max && price > requestedPrice.max) {
        inRange = false;
      }

      if (inRange) {
        withinRange++;
      } else {
        outOfRange++;
      }
    }

    if (outOfRange > withinRange) {
      const warning = language === 'ar'
        ? `⚠️ بعض النتائج خارج نطاق السعر المطلوب`
        : `⚠️ Some results are outside the requested price range`;

      return {
        isValid: false,
        withinRange,
        outOfRange,
        warning
      };
    }

    return {
      isValid: true,
      withinRange,
      outOfRange
    };
  }

  /**
   * مقارنة المواقع
   * Compare locations
   */
  // Safely compare two location values that may be strings, numbers or objects.
  locationsMatch(location1, location2) {
    // Guard against null / undefined
    if (!location1 || !location2) return false;

    // Helper to extract a comparable string from a value
    const toComparableString = (loc) => {
      if (typeof loc === 'string') return loc;
      if (typeof loc === 'number') return loc.toString();
      // Handle objects that might have a name or label property
      if (typeof loc === 'object') {
        if (loc.name && typeof loc.name === 'string') return loc.name;
        if (loc.label && typeof loc.label === 'string') return loc.label;
      }
      return '';
    };

    const normalized1 = arabicNormalizer.normalize(toComparableString(location1).toLowerCase());
    const normalized2 = arabicNormalizer.normalize(toComparableString(location2).toLowerCase());

    // مطابقة تامة
    if (normalized1 === normalized2) return true;

    // مطابقة جزئية (أحدهما يحتوي على الآخر)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }

    // خريطة المدن المترادفة
    const cityAliases = {
      'damascus': ['دمشق', 'dimashq', 'الشام', 'Damascus', 'Damascus Syria'],
      'aleppo': ['حلب', 'halab', 'haleb', 'Aleppo', 'Aleppo Syria'],
      'homs': ['حمص', 'hims', 'Homs', 'Homs Syria', 'Homs, Syria'],
      'latakia': ['اللاذقية', 'lattakia', 'ladhiqiyah', 'Latakia', 'Latakia Syria', 'Latakia, Syria'],
      'hama': ['حماه', 'حماة', 'hamah', 'Hama', 'Hama Syria', 'Hama, Syria'],
      'tartus': ['طرطوس', 'tartous', 'Tartus', 'Tartus Syria', 'Tartus, Syria'],
      'idlib': ['إدلب', 'ادلب', 'Idlib', 'Idlib Syria', 'Idlib, Syria'],
      'deir ez-zor': ['دير الزور', 'ديرالزور', 'deir ezzor', 'Deir ez-Zor Syria', 'Deir ez-Zor, Syria'],
      'raqqa': ['الرقة', 'رقة', 'Raqqa', 'Raqqa Syria', 'Raqqa, Syria'  , 'Raqqa, Syria'],
      'daraa': ['درعا', 'دارا', 'Daraa', 'Daraa Syria', 'Daraa, Syria'],
      'quneitra': ['القنيطرة', 'قنيطرة', 'Quneitra', 'Quneitra Syria', 'Quneitra, Syria'  ],
      'sweida': ['السويداء', 'سويداء', 'Suwayda', 'Suwayda Syria', 'Suwayda, Syria' ],
      'hasakah': ['الحسكة', 'حسكة', 'Hasakah', 'Hasakah Syria', 'Hasakah, Syria' ],
    };

    for (const [key, aliases] of Object.entries(cityAliases)) {
      const allVariations = [key, ...aliases];

      if (allVariations.some(v => normalized1.includes(v)) &&
          allVariations.some(v => normalized2.includes(v))) {
        return true;
      }
    }

    return false;
  }

  /**
   * مقارنة الفئات
   * Compare categories
   */
  categoriesMatch(category1, category2) {
    if (!category1 || !category2) return false;

    const normalized1 = arabicNormalizer.normalize(category1.toLowerCase());
    const normalized2 = arabicNormalizer.normalize(category2.toLowerCase());

    return normalized1 === normalized2 ||
           normalized1.includes(normalized2) ||
           normalized2.includes(normalized1);
  }

  /**
   * الحصول على اقتراحات عند عدم وجود نتائج
   * Get suggestions when no results found
   */
  getNoResultsSuggestions(searchParams, language) {
    const suggestions = [];

    if (language === 'ar') {
      suggestions.push('💡 جرب كلمات مفتاحية مختلفة');

      if (searchParams.city) {
        suggestions.push('💡 ابحث في مدن أخرى أو وسّع النطاق');
      }

      if (searchParams.price && (searchParams.price.min || searchParams.price.max)) {
        suggestions.push('💡 اضبط نطاق السعر');
      }

      suggestions.push('💡 قلل من عدد الفلاتر المطبقة');
    } else {
      suggestions.push('💡 Try different keywords');

      if (searchParams.city) {
        suggestions.push('💡 Search in other cities or broaden the area');
      }

      if (searchParams.price && (searchParams.price.min || searchParams.price.max)) {
        suggestions.push('💡 Adjust the price range');
      }

      suggestions.push('💡 Reduce the number of filters applied');
    }

    return suggestions;
  }

  /**
   * الحصول على اقتراحات عند انخفاض الجودة
   * Get suggestions for low quality results
   */
  getLowQualitySuggestions(searchParams, language) {
    const suggestions = [];

    if (language === 'ar') {
      suggestions.push('💡 النتائج قد لا تطابق بحثك تماماً. جرب:');
      suggestions.push('  • كن أكثر تحديداً في وصف ما تبحث عنه');
      suggestions.push('  • استخدم كلمات مفتاحية أوضح');
      suggestions.push('  • تحقق من الفلاتر المطبقة');
    } else {
      suggestions.push('💡 Results may not fully match your search. Try:');
      suggestions.push('  • Be more specific in describing what you want');
      suggestions.push('  • Use clearer keywords');
      suggestions.push('  • Check applied filters');
    }

    return suggestions;
  }

  /**
   * تنسيق النتائج المصنفة للعرض
   * Format categorized results for display
   */
  formatValidatedResults(validationResult, language = 'ar') {
    const { excellentResults, goodResults, partialResults, warnings, suggestions } = validationResult;

    let message = '';

    // عرض النتائج الممتازة والجيدة أولاً
    const primaryResults = [...excellentResults, ...goodResults];

    if (primaryResults.length === 0 && partialResults.length > 0) {
      // لا توجد نتائج جيدة، اعرض التحذير
      message = language === 'ar'
        ? '⚠️ *لم نجد نتائج مطابقة تماماً*\n\nهذه بعض النتائج المشابهة:\n\n'
        : '⚠️ *No exact matches found*\n\nHere are some similar results:\n\n';
    }

    // إضافة التحذيرات
    if (warnings.length > 0) {
      message += warnings.join('\n') + '\n\n';
    }

    // إضافة الاقتراحات
    if (suggestions.length > 0 && primaryResults.length === 0) {
      message += (language === 'ar' ? '\n\n*اقتراحات:*\n' : '\n\n*Suggestions:*\n');
      message += suggestions.join('\n');
    }

    return {
      message,
      resultsToShow: primaryResults.length > 0 ? primaryResults : partialResults,
      showPartialWarning: primaryResults.length === 0 && partialResults.length > 0
    };
  }
}

// Export singleton instance
module.exports = new ResultValidator();

