const logger = require('../../utils/logger');
const MatchScorer = require('./matchScorer');

/**
 * Professional Response Formatter
 * Formats search results, suggestions, and messages for Telegram bot
 * Supports bilingual formatting (Arabic/English)
 */
class ResponseFormatter {
  constructor() {
    this.websiteUrl = process.env.KASIOON_WEBSITE_URL || 'https://kasioon.com';
  }

  /**
   * Format search results for Telegram
   * @param {Array} results - Search results from API
   * @param {string} language - Language code ('ar' or 'en')
   * @param {Object} pagination - Pagination info
   * @returns {string} Formatted message
   */
  formatSearchResults(results, language = 'ar', pagination = null) {
    if (!results || results.length === 0) {
      return this.getNoResultsMessage(language);
    }

    const isArabic = language === 'ar';
    let message = '';

    // Header
    message += isArabic
      ? `✨ *وجدت ${results.length} نتيجة*\n\n`
      : `✨ *Found ${results.length} results*\n\n`;

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
   * Get no results message
   * @param {string} language - Language code
   * @returns {string} No results message
   */
  getNoResultsMessage(language) {
    const isArabic = language === 'ar';

    if (isArabic) {
      return `😔 *لم أجد نتائج مطابقة لبحثك*

💡 *نصائح للحصول على نتائج أفضل:*
• جرب توسيع نطاق البحث
• استخدم كلمات أقل تحديداً
• جرب البحث في مدينة مختلفة
• تحقق من إملاء الكلمات

🔄 *أمثلة للبحث:*
"سيارات في دمشق"
"شقق للإيجار"
"موبايلات سامسونج"

🌐 ${this.websiteUrl}`;
    }

    return `😔 *No matching results found*

💡 *Tips for better results:*
• Try broadening your search
• Use less specific keywords
• Try a different city
• Check your spelling

🔄 *Search examples:*
"Cars in Damascus"
"Apartments for rent"
"Samsung phones"

🌐 ${this.websiteUrl}`;
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

    if (isArabic) {
      return `مرحباً *${this.escapeMarkdown(firstName)}*! 👋

كيف أقدر أساعدك اليوم؟

💡 *جرب إرسال:*
• "أريد سيارة في دمشق"
• "شقة للإيجار في حلب"
• "موبايل آيفون"
• "أثاث مستعمل"

🎤 أو أرسل رسالة صوتية!`;
    }

    return `Hello *${this.escapeMarkdown(firstName)}*! 👋

How can I help you today?

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
