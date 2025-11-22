const logger = require('../../utils/logger');
const MatchScorer = require('./matchScorer');
const arabicNormalizer = require('../../utils/arabicNormalizer');

/**
 * Professional Response Formatter
 * Formats search results, suggestions, and messages for Telegram bot
 * Supports bilingual formatting (Arabic/English)
 */
class ResponseFormatter {
  constructor() {
    this.websiteUrl = process.env.KASIOON_WEBSITE_URL || 'https://kasioon.com';

    // Greeting variations for more natural conversations
    this.greetingVariations = {
      ar: [
        'أهلاً وسهلاً {name}! 👋',
        'مرحباً {name}! كيف أقدر أساعدك؟ 😊',
        'هلا {name}! شو بتدور عليه اليوم؟',
        'يا هلا {name}! تحت أمرك 🙌',
        'مرحبتين {name}! جاهز لمساعدتك 💪'
      ],
      en: [
        'Hi {name}! How can I help? 👋',
        'Hello {name}! What are you looking for? 😊',
        'Hey {name}! Ready to help you find something great!',
        'Welcome {name}! How can I assist you today? 🙌',
        'Hi there {name}! Let\'s find what you need! 💪'
      ]
    };

    // No results variations
    this.noResultsVariations = {
      ar: [
        '😔 *ما لقيت شي يطابق بحثك*',
        '🔍 *للأسف، ما في نتائج حالياً*',
        '😕 *البحث ما جاب نتائج*',
        '🤷 *ما في إعلانات تطابق طلبك*'
      ],
      en: [
        '😔 *No matching results found*',
        '🔍 *Unfortunately, no results at the moment*',
        '😕 *Search didn\'t return any results*',
        '🤷 *No listings match your request*'
      ]
    };

    // Success variations for search results header
    this.successVariations = {
      ar: [
        '✨ *وجدت {count} نتيجة*',
        '🎯 *لقيت {count} إعلان*',
        '👍 *في {count} نتيجة متوفرة*',
        '🔥 *{count} إعلان مطابق لبحثك*'
      ],
      en: [
        '✨ *Found {count} results*',
        '🎯 *Got {count} listings*',
        '👍 *{count} results available*',
        '🔥 *{count} listings match your search*'
      ]
    };
  }

  /**
   * Get random variation from array
   * @param {Array} variations - Array of variations
   * @returns {string} Random variation
   */
  getRandomVariation(variations) {
    return variations[Math.floor(Math.random() * variations.length)];
  }

  /**
   * Format search results for Telegram
   * @param {Array} results - Search results from API
   * @param {string} language - Language code ('ar' or 'en')
   * @param {Object} pagination - Pagination info
   * @param {Object} searchParams - Original search parameters from user query
   * @returns {string} Formatted message
   */
  formatSearchResults(results, language = 'ar', pagination = null, searchParams = null) {
    if (!results || results.length === 0) {
      return this.getNoResultsMessage(language, searchParams);
    }

    const isArabic = language === 'ar';
    let message = '';

    // Header with variation
    const headerTemplate = this.getRandomVariation(this.successVariations[isArabic ? 'ar' : 'en']);
    message += headerTemplate.replace('{count}', results.length) + '\n\n';

    // Add search parameters summary
    if (searchParams) {
      message += this.formatSearchParametersSummary(searchParams, language) + '\n';
    }

    // Check for location mismatch
    if (searchParams && (searchParams.city || searchParams.province)) {
      const requestedLocation = searchParams.province || searchParams.city;
      const actualLocations = this.getUniqueResultLocations(results);

      // Check if any actual location matches requested location using proper matching
      const hasMatchingLocation = actualLocations.some(loc =>
        this.locationsMatch(requestedLocation, loc)
      );

      // Show warning if no matching location found
      if (!hasMatchingLocation && actualLocations.length > 0) {
        message += this.formatLocationMismatchWarning(requestedLocation, actualLocations, language) + '\n\n';
      }
    }

    // Check for validation warnings (from ResultValidator)
    if (results[0]?._validation?.warnings?.length > 0) {
      message += results[0]._validation.warnings.join('\n') + '\n\n';
    }

    // Format each result (max 10 to avoid too long messages)
    results.slice(0, 10).forEach((item, index) => {
      message += this.formatSingleListing(item, index + 1, isArabic);
    });

    // Pagination info
    if (pagination && pagination.totalPages > 1) {
      message += isArabic
        ? `\n📄 صفحة ${pagination.currentPage} من ${pagination.totalPages}`
        : `\n📄 Page ${pagination.currentPage} of ${pagination.totalPages}`;
    }

    // Footer with tips
    message += this.getFooterMessage(isArabic);

    return message;
  }

  /**
   * Format a single listing
   * @param {Object} item - Listing item
   * @param {number} number - Item number
   * @param {boolean} isArabic - Arabic language flag
   * @returns {string} Formatted listing
   */
  formatSingleListing(item, number, isArabic) {
    let listing = '';

    // Match score badge (if available)
    if (item.matchScore !== undefined) {
      const badge = MatchScorer.getMatchBadge(item.matchScore, isArabic ? 'ar' : 'en');
      listing += `${badge.emoji} *${item.matchScore}%* ${badge.text}\n`;
    }

    // Number and title
    const title = item.title || (isArabic ? 'بدون عنوان' : 'No title');
    listing += `${number}️⃣ *${this.escapeMarkdown(title)}*\n`;

    // Category with emoji
    if (item.category) {
      const categoryEmoji = this.getCategoryEmoji(item.category.slug);
      // API returns 'name' field which is already in the correct language
      // Fallback to name_ar/nameAr for Arabic, name_en/nameEn for English if name is not available
      const categoryName = item.category.name || 
        (isArabic 
          ? item.category.name_ar || item.category.nameAr
          : item.category.name_en || item.category.nameEn);
      if (categoryName) {
        listing += `   ${categoryEmoji} ${this.escapeMarkdown(categoryName)}\n`;
      }
    }

    // Price
    const price = item.attributes?.price || item.price;
    if (price) {
      const formattedPrice = this.formatPrice(price, isArabic);
      listing += isArabic
        ? `   💰 السعر: ${formattedPrice}\n`
        : `   💰 Price: ${formattedPrice}\n`;
    }

    // Location - handle different API response structures
    let location = null;
    if (item.location) {
      // Handle location object structure from API
      if (typeof item.location === 'string') {
        location = item.location;
      } else if (item.location.city) {
        // city can be string or object with name property
        location = typeof item.location.city === 'string' 
          ? item.location.city 
          : item.location.city.name;
        
        // Add province if different from city
        if (item.location.province && item.location.province !== location) {
          location = `${location}, ${item.location.province}`;
        }
      } else if (item.location.province) {
        location = item.location.province;
      } else if (item.location.address) {
        location = item.location.address;
      }
    } else if (item.city) {
      // Fallback for direct city property
      location = typeof item.city === 'string' ? item.city : item.city.name;
    }
    
    if (location) {
      listing += isArabic
        ? `   📍 الموقع: ${this.escapeMarkdown(location)}\n`
        : `   📍 Location: ${this.escapeMarkdown(location)}\n`;
    }

    // Key attributes based on category
    const attrText = this.formatKeyAttributes(item, isArabic);
    if (attrText) {
      listing += attrText;
    }

    // Listing URL
    const listingUrl = item.listingUrl || item.url || `${this.websiteUrl}/listing/${item.slug || item.id}`;
    listing += isArabic
      ? `   🔗 [عرض التفاصيل](${listingUrl})\n`
      : `   🔗 [View Details](${listingUrl})\n`;

    listing += '\n';
    return listing;
  }

  /**
   * Format key attributes based on category
   * @param {Object} item - Listing item
   * @param {boolean} isArabic - Arabic language flag
   * @returns {string} Formatted attributes
   */
  formatKeyAttributes(item, isArabic) {
    const attrs = item.attributes || {};
    let attrText = '';

    // Real estate attributes
    if (attrs.rooms || attrs.bedrooms) {
      const rooms = attrs.rooms || attrs.bedrooms;
      attrText += isArabic
        ? `   🛏 ${rooms} غرف`
        : `   🛏 ${rooms} rooms`;
    }
    if (attrs.area) {
      attrText += isArabic
        ? ` • ${attrs.area} م²`
        : ` • ${attrs.area} m²`;
    }
    if (attrs.bathrooms) {
      attrText += isArabic
        ? ` • ${attrs.bathrooms} حمام`
        : ` • ${attrs.bathrooms} bath`;
    }

    // Vehicle attributes
    if (attrs.brand || attrs.carBrand) {
      attrText += `   🚗 ${attrs.brand || attrs.carBrand}`;
      if (attrs.model || attrs.carModel) {
        attrText += ` ${attrs.model || attrs.carModel}`;
      }
    }
    if (attrs.year) {
      attrText += ` • ${attrs.year}`;
    }
    if (attrs.mileage) {
      attrText += isArabic
        ? ` • ${this.formatNumber(attrs.mileage)} كم`
        : ` • ${this.formatNumber(attrs.mileage)} km`;
    }
    if (attrs.fuelType) {
      attrText += ` • ${attrs.fuelType}`;
    }

    if (attrText) {
      attrText += '\n';
    }
    return attrText;
  }

  /**
   * Format search parameters summary for user transparency
   * Shows what the bot understood from the user's query
   * @param {Object} params - Extracted search parameters
   * @param {string} language - Language code ('ar' or 'en')
   * @returns {string} Formatted search parameters summary
   */
  formatSearchParametersSummary(params, language = 'ar') {
    if (!params) return '';

    const isArabic = language === 'ar';
    const labels = {
      ar: {
        title: '🔍 معاملات البحث:',
        type: '📦 النوع',
        province: '🏙️ المحافظة',
        city: '🏘️ المدينة',
        price: '💰 السعر',
        keywords: '🔑 كلمات',
        notSpecified: 'غير محدد',
        none: '-',
        moreThan: 'أكثر من',
        lessThan: 'أقل من'
      },
      en: {
        title: '🔍 Search Parameters:',
        type: '📦 Type',
        province: '🏙️ Province',
        city: '🏘️ City',
        price: '💰 Price',
        keywords: '🔑 Keywords',
        notSpecified: 'Not specified',
        none: '-',
        moreThan: 'More than',
        lessThan: 'Less than'
      }
    };

    const l = labels[isArabic ? 'ar' : 'en'];
    const lines = [l.title];

    // Category/Type - check multiple possible field names
    let category = l.notSpecified;
    if (params.category) {
      category = params.category.name || params.category;
    } else if (params.categorySlug) {
      category = params.categorySlug;
    }
    lines.push(`├─ ${l.type}: ${category}`);

    // Location (Province/City) - check multiple possible field names
    let location = l.notSpecified;
    if (params.province) {
      location = params.province;
    } else if (params.city) {
      location = params.city;
    }
    lines.push(`├─ ${l.province}: ${location}`);

    // Price range
    let priceStr = l.notSpecified;
    if (params.minPrice && params.maxPrice) {
      const minFormatted = this.formatNumber(params.minPrice, isArabic);
      const maxFormatted = this.formatNumber(params.maxPrice, isArabic);
      priceStr = `${minFormatted} - ${maxFormatted}`;
    } else if (params.minPrice) {
      const minFormatted = this.formatNumber(params.minPrice, isArabic);
      priceStr = `${l.moreThan} ${minFormatted}`;
    } else if (params.maxPrice) {
      const maxFormatted = this.formatNumber(params.maxPrice, isArabic);
      priceStr = `${l.lessThan} ${maxFormatted}`;
    }
    lines.push(`├─ ${l.price}: ${priceStr}`);

    // Keywords
    const keywords = params.keywords || params.query || l.none;
    lines.push(`└─ ${l.keywords}: ${keywords}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Extract unique locations from search results
   * Checks multiple location field structures to ensure compatibility
   * @param {Array} results - Search results array
   * @returns {Array} Array of unique location names
   */
  getUniqueResultLocations(results) {
    if (!results || results.length === 0) return [];

    const locations = new Set();

    for (const result of results) {
      let locationName = null;

      // Try different location field structures
      if (result.location) {
        if (typeof result.location === 'string') {
          locationName = result.location;
        } else if (result.location.city) {
          // city can be string or object with name property
          locationName = typeof result.location.city === 'string'
            ? result.location.city
            : result.location.city.name;
        } else if (result.location.province) {
          locationName = result.location.province;
        }
      } else if (result.city) {
        // Fallback for direct city property
        locationName = typeof result.city === 'string' ? result.city : result.city.name;
      } else if (result.province) {
        locationName = typeof result.province === 'string' ? result.province : result.province.name;
      }

      if (locationName) {
        locations.add(locationName);
      }
    }

    return Array.from(locations);
  }

  /**
   * Check if two locations match (handles Arabic/English variations and aliases)
   * Uses same logic as ResultValidator for consistency
   * @param {string} location1 - First location
   * @param {string} location2 - Second location
   * @returns {boolean} True if locations match
   */
  locationsMatch(location1, location2) {
    if (!location1 || !location2) return false;

    // Normalize both locations for comparison
    const normalized1 = arabicNormalizer.normalize(location1.toLowerCase());
    const normalized2 = arabicNormalizer.normalize(location2.toLowerCase());

    // Exact match
    if (normalized1 === normalized2) return true;

    // Partial match (one contains the other)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }

    // City aliases map (Arabic/English variations)
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

    // Check if both locations refer to the same city using aliases
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
   * Format warning when results are from different location than requested
   * Helps users understand why they're seeing results from other cities
   * @param {string} requestedLocation - Location user asked for
   * @param {Array} actualLocations - Locations of actual results
   * @param {string} language - Language code ('ar' or 'en')
   * @returns {string} Warning message
   */
  formatLocationMismatchWarning(requestedLocation, actualLocations, language = 'ar') {
    if (!requestedLocation || !actualLocations || actualLocations.length === 0) {
      return '';
    }

    const isArabic = language === 'ar';

    // Show up to 3 unique locations
    const uniqueLocations = [...new Set(actualLocations)].slice(0, 3);
    const locationsStr = uniqueLocations.join(isArabic ? '، ' : ', ');

    if (isArabic) {
      return `
⚠️ لم نجد نتائج في "${requestedLocation}"
📍 عرضنا لك نتائج من: ${locationsStr}
💡 جرب البحث بدون تحديد المحافظة لمزيد من النتائج

`.trim();
    } else {
      return `
⚠️ No results found in "${requestedLocation}"
📍 Showing results from: ${locationsStr}
💡 Try searching without specifying province for more results

`.trim();
    }
  }

  /**
   * Get emoji for category
   * @param {string} categorySlug - Category slug
   * @returns {string} Emoji
   */
  getCategoryEmoji(categorySlug) {
    const emojis = {
      'vehicles': '🚗',
      'cars': '🚗',
      'motorcycles': '🏍',
      'trucks': '🚚',
      'buses': '🚌',
      'real-estate': '🏠',
      'apartments': '🏢',
      'houses': '🏡',
      'villas': '🏰',
      'lands': '🌍',
      'commercial': '🏬',
      'electronics': '📱',
      'phones': '📱',
      'computers': '💻',
      'tablets': '📱',
      'tvs': '📺',
      'gaming': '🎮',
      'furniture': '🛋',
      'home-furniture': '🛋',
      'office-furniture': '🗄',
      'fashion': '👔',
      'clothing': '👕',
      'shoes': '👟',
      'accessories': '👜',
      'services': '🔧',
      'jobs': '💼',
      'jobs-employment': '💼'
    };
    return emojis[categorySlug] || '📦';
  }

  /**
   * Format price with proper unit display
   * Handles both single prices and range prices
   * @param {number|Object} priceAttribute - Price value or price object
   * @param {boolean} isArabic - Arabic language flag
   * @returns {string} Formatted price
   */
  formatPrice(priceAttribute, isArabic = true) {
    if (!priceAttribute) {
      return isArabic ? 'غير محدد' : 'Not specified';
    }

    // Handle price object with value and unit
    if (typeof priceAttribute === 'object') {
      const value = priceAttribute.value;
      const unit_ar = priceAttribute.unit_ar || 'دولار';
      const unit_en = priceAttribute.unit_en || 'USD';

      // Handle range prices
      if (typeof value === 'object' && value.min !== undefined) {
        const minFormatted = this.formatNumber(value.min, isArabic);
        const maxFormatted = this.formatNumber(value.max, isArabic);
        const unit = isArabic ? unit_ar : unit_en;
        return `${minFormatted} - ${maxFormatted} ${unit}`;
      }

      // Handle single price with unit
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const formatted = this.formatNumber(numValue, isArabic);
        const unit = isArabic ? unit_ar : unit_en;
        return `${formatted} ${unit}`;
      }
    }

    // Handle simple number (backward compatibility)
    const numValue = parseFloat(priceAttribute);
    if (isNaN(numValue) || numValue === 0) {
      return isArabic ? 'غير محدد' : 'Not specified';
    }

    const formatted = this.formatNumber(numValue, isArabic);
    return isArabic
      ? `${formatted} ل.س`  // Syrian Pounds
      : `SYP ${formatted}`;
  }

  /**
   * Format number with locale and fix float precision
   * @param {number} num - Number to format
   * @param {boolean} isArabic - Arabic language flag
   * @returns {string} Formatted number
   */
  formatNumber(num, isArabic = true) {
    if (num === null || num === undefined) return '';

    // Fix float precision issues (e.g., 3500.0000000000005 → 3500)
    const fixed = Math.round(num * 100) / 100;

    // Format with Arabic locale for large numbers
    if (fixed >= 1000000) {
      return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US').format(fixed);
    }

    return fixed.toLocaleString(isArabic ? 'ar-SA' : 'en-US');
  }

  /**
   * Get no results message with search parameters context
   * @param {string} language - Language code
   * @param {Object} searchParams - Original search parameters from user query
   * @returns {string} No results message
   */
  getNoResultsMessage(language, searchParams = null) {
    const isArabic = language === 'ar';

    // Get random no results header
    const header = this.getRandomVariation(this.noResultsVariations[isArabic ? 'ar' : 'en']);

    let message = `${header}\n\n`;

    // Show what was searched for if parameters available
    if (searchParams) {
      message += this.formatSearchParametersSummary(searchParams, language) + '\n';
    }

    // Build parameter-specific suggestions
    const suggestions = [];

    if (searchParams) {
      // Suggest removing price filter if set
      if (searchParams.minPrice || searchParams.maxPrice) {
        suggestions.push(isArabic
          ? '• جرب إزالة فلتر السعر'
          : '• Try removing the price filter'
        );
      }

      // Suggest removing location filter if set
      if (searchParams.city || searchParams.province) {
        suggestions.push(isArabic
          ? '• جرب البحث في محافظات أخرى'
          : '• Try searching in other provinces'
        );
      }

      // Suggest broader category if specific
      if (searchParams.category || searchParams.categorySlug) {
        suggestions.push(isArabic
          ? '• جرب فئة أوسع'
          : '• Try a broader category'
        );
      }

      // Suggest using fewer keywords
      if (searchParams.keywords || searchParams.query) {
        suggestions.push(isArabic
          ? '• استخدم كلمات أقل تحديداً'
          : '• Use less specific keywords'
        );
      }
    }

    // Add generic suggestions if no parameter-specific ones
    if (suggestions.length === 0) {
      if (isArabic) {
        suggestions.push(
          '• جرب توسيع نطاق البحث',
          '• استخدم كلمات أقل تحديداً',
          '• جرب البحث في مدينة مختلفة',
          '• تحقق من إملاء الكلمات'
        );
      } else {
        suggestions.push(
          '• Try broadening your search',
          '• Use less specific keywords',
          '• Try a different city',
          '• Check your spelling'
        );
      }
    }

    // Add suggestions section
    message += isArabic
      ? `💡 *اقتراحات:*\n${suggestions.join('\n')}\n\n`
      : `💡 *Suggestions:*\n${suggestions.join('\n')}\n\n`;

    // Add search examples
    if (isArabic) {
      message += `🔄 *أمثلة للبحث:*
"سيارات في دمشق"
"شقق للإيجار"
"موبايلات سامسونج"

🌐 ${this.websiteUrl}`;
    } else {
      message += `🔄 *Search examples:*
"Cars in Damascus"
"Apartments for rent"
"Samsung phones"

🌐 ${this.websiteUrl}`;
    }

    return message;
  }

  /**
   * Format suggestions when no exact results
   * @param {Array} suggestions - Suggestion objects
   * @param {string} language - Language code
   * @returns {string} Formatted suggestions
   */
  formatSuggestions(suggestions, language = 'ar') {
    if (!suggestions || suggestions.length === 0) return '';

    const isArabic = language === 'ar';
    let message = isArabic
      ? `\n\n💡 *اقتراحات مشابهة:*\n\n`
      : `\n\n💡 *Similar suggestions:*\n\n`;

    suggestions.forEach(suggestion => {
      if (suggestion.type === 'without_price_filter') {
        message += isArabic
          ? `• بدون فلتر السعر: ${suggestion.count} نتيجة\n`
          : `• Without price filter: ${suggestion.count} results\n`;
      }
      if (suggestion.type === 'parent_category') {
        // API returns 'name' field which is already in the correct language
        // Fallback to name_ar/nameAr for Arabic, name_en/nameEn for English if name is not available
        const catName = suggestion.category.name || 
          (isArabic
            ? suggestion.category.name_ar || suggestion.category.nameAr
            : suggestion.category.name_en || suggestion.category.nameEn);
        message += isArabic
          ? `• في ${catName}: ${suggestion.count} نتيجة\n`
          : `• In ${catName}: ${suggestion.count} results\n`;
      }
      if (suggestion.type === 'all_cities') {
        message += isArabic
          ? `• في جميع المدن: ${suggestion.count} نتيجة\n`
          : `• In all cities: ${suggestion.count} results\n`;
      }
    });

    return message;
  }

  /**
   * Get footer message with tips
   * @param {boolean} isArabic - Arabic language flag
   * @returns {string} Footer message
   */
  getFooterMessage(isArabic) {
    if (isArabic) {
      return `\n━━━━━━━━━━━━━━━━━━━━
💡 إضغط على عرض التفاصيل لرؤية كامل تفاصيل الإعلان
🎤 يمكنك إرسال رسالة صوتية أيضاً
🌐 ${this.websiteUrl}`;
    }
    return `\n━━━━━━━━━━━━━━━━━━━━
💡 Send listing number for more details
🎤 Voice messages are also supported
🌐 ${this.websiteUrl}`;
  }

  /**
   * Format error messages
   * @param {string} errorType - Type of error
   * @param {string} language - Language code
   * @returns {string} Error message
   */
  formatError(errorType, language = 'ar') {
    const isArabic = language === 'ar';

    const errors = {
      'api_error': {
        ar: '⚠️ عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
        en: '⚠️ Sorry, a connection error occurred. Please try again.'
      },
      'invalid_query': {
        ar: '🤔 لم أفهم طلبك. يرجى توضيح ما تبحث عنه.',
        en: '🤔 I didn\'t understand your request. Please clarify what you\'re looking for.'
      },
      'rate_limit': {
        ar: '⏳ يرجى الانتظار قليلاً قبل المحاولة مرة أخرى.',
        en: '⏳ Please wait a moment before trying again.'
      },
      'voice_error': {
        ar: '🎤 لم أتمكن من فهم الرسالة الصوتية. يرجى المحاولة مرة أخرى.',
        en: '🎤 Could not understand the voice message. Please try again.'
      },
      'search_error': {
        ar: '❌ حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى لاحقاً.',
        en: '❌ Search error occurred. Please try again later.'
      }
    };

    return errors[errorType]?.[isArabic ? 'ar' : 'en'] || errors['api_error'][isArabic ? 'ar' : 'en'];
  }

  /**
   * Escape markdown special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeMarkdown(text) {
    if (!text) return '';
    // Escape special Markdown characters
    return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }

  /**
   * Format greeting response
   * @param {string} firstName - User's first name
   * @param {string} language - Language code
   * @returns {string} Greeting message
   */
  formatGreeting(firstName, language = 'ar') {
    const isArabic = language === 'ar';
    const escapedName = this.escapeMarkdown(firstName);

    // Get random greeting variation
    const greetingTemplate = this.getRandomVariation(this.greetingVariations[isArabic ? 'ar' : 'en']);
    const greeting = greetingTemplate.replace('{name}', `*${escapedName}*`);

    if (isArabic) {
      return `${greeting}

💡 *جرب إرسال:*
• "أريد سيارة في دمشق"
• "شقة للإيجار في حلب"
• "موبايل آيفون"
• "أثاث مستعمل"

🎤 أو أرسل رسالة صوتية!`;
    }

    return `${greeting}

💡 *Try sending:*
• "I want a car in Damascus"
• "Apartment for rent in Aleppo"
• "iPhone mobile"
• "Used furniture"

🎤 Or send a voice message!`;
  }

  /**
   * Format welcome message
   * @param {string} firstName - User's first name
   * @param {string} language - Language code
   * @returns {string} Welcome message
   */
  formatWelcome(firstName, language = 'ar') {
    const isArabic = language === 'ar';

    if (isArabic) {
      return `مرحباً ${this.escapeMarkdown(firstName)}! 👋

🛒 أنا مساعد البحث في سوق *كسيون* - أكبر سوق إلكتروني في سوريا

*كيف أساعدك:*
📝 أرسل رسالة نصية بما تبحث عنه
🎤 أو أرسل رسالة صوتية

*أمثلة:*
• "أريد سيارة تويوتا في حلب"
• "شقة للإيجار في دمشق بسعر أقل من 500 ألف"
• "موبايل آيفون جديد"
• "أثاث مستعمل في حمص"

💡 كلما كنت أكثر تحديداً، كانت النتائج أفضل!`;
    }

    return `Welcome ${this.escapeMarkdown(firstName)}! 👋

🛒 I'm the *Kasioon* marketplace assistant - Syria's largest online marketplace

*How I can help:*
📝 Send a text message with what you're looking for
🎤 Or send a voice message

*Examples:*
• "I want a Toyota car in Aleppo"
• "Apartment for rent in Damascus under 500k"
• "New iPhone mobile"
• "Used furniture in Homs"

💡 The more specific you are, the better the results!`;
  }
}

module.exports = new ResponseFormatter();
