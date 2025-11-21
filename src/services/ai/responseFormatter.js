const logger = require('../../utils/logger');

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

    // Number and title
    const title = item.title || (isArabic ? 'بدون عنوان' : 'No title');
    listing += `${number}️⃣ *${this.escapeMarkdown(title)}*\n`;

    // Category with emoji
    if (item.category) {
      const categoryEmoji = this.getCategoryEmoji(item.category.slug);
      const categoryName = isArabic
        ? item.category.name_ar || item.category.name || item.category.nameAr
        : item.category.name_en || item.category.name || item.category.nameEn;
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

    // Location
    const location = item.location?.city?.name || item.city?.name || item.location;
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
   * Format price in Syrian Pounds
   * @param {number} price - Price value
   * @param {boolean} isArabic - Arabic language flag
   * @returns {string} Formatted price
   */
  formatPrice(price, isArabic = true) {
    if (!price || price === 0) {
      return isArabic ? 'غير محدد' : 'Not specified';
    }

    // Format with commas
    const formatted = new Intl.NumberFormat(isArabic ? 'ar-SY' : 'en-US').format(price);

    return isArabic
      ? `${formatted} ل.س`  // Syrian Pounds
      : `SYP ${formatted}`;
  }

  /**
   * Format number with locale
   * @param {number} num - Number to format
   * @param {boolean} isArabic - Arabic language flag
   * @returns {string} Formatted number
   */
  formatNumber(num, isArabic = true) {
    return new Intl.NumberFormat(isArabic ? 'ar' : 'en').format(num);
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
        const catName = isArabic
          ? suggestion.category.name_ar || suggestion.category.name
          : suggestion.category.name_en || suggestion.category.name;
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
💡 أرسل رقم الإعلان لمزيد من التفاصيل
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
