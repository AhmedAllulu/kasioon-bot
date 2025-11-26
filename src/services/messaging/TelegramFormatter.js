/**
 * Telegram Message Formatter
 * Formats search results for Telegram Bot
 */
class TelegramFormatter {
  /**
   * Format search results for Telegram
   * @param {Object} searchResults - Results from SearchService
   * @param {string} language - Language
   * @returns {Object} Formatted Telegram response
   */
  static formatSearchResults(searchResults, language = 'ar') {
    const { data, meta } = searchResults;
    const { query, listings, pagination } = data;

    if (listings.length === 0) {
      return this.formatNoResults(query.original, language);
    }

    let text = this.buildHeader(query, pagination, language);
    text += this.buildListings(listings, language);
    text += this.buildFooter(pagination, meta, language);

    return {
      text,
      parseMode: 'HTML',
      buttons: this.buildButtons(pagination, data.suggestions, language),
      disableWebPagePreview: false
    };
  }

  /**
   * Build message header
   * @param {Object} query - Query info
   * @param {Object} pagination - Pagination info
   * @param {string} language - Language
   * @returns {string} Header text
   */
  static buildHeader(query, pagination, language) {
    let header = language === 'ar'
      ? '✨ <b>لقيتلك هالإعلانات</b>\n\n'
      : '✨ <b>Found These Listings</b>\n\n';

    // Check if category exists and is an object (not "none" string)
    if (query.parsed?.category && typeof query.parsed.category === 'object') {
      const categoryName = language === 'ar' ? query.parsed.category.name_ar : query.parsed.category.name_en;
      if (categoryName) {
        header += `📂 ${categoryName}`;
      }
    }

    // Check if location exists and is an object (not "none" string)
    if (query.parsed?.location && typeof query.parsed.location === 'object') {
      const locationName = language === 'ar' ? query.parsed.location.name_ar : query.parsed.location.name_en;
      if (locationName) {
        header += ` في ${locationName}`;
      }
    }

    if (pagination.total > 0) {
      header += language === 'ar'
        ? `\n📊 <i>في عنا ${pagination.total} إعلان</i>\n\n`
        : `\n📊 <i>Found ${pagination.total} listings</i>\n\n`;
    }

    return header;
  }

  /**
   * Build listings section
   * @param {Array} listings - Listings array
   * @param {string} language - Language
   * @returns {string} Listings text
   */
  static buildListings(listings, language) {
    const maxListings = Math.min(listings.length, 5);
    let text = '';

    for (let i = 0; i < maxListings; i++) {
      const listing = listings[i];
      const index = i + 1;

      text += `${this.getNumberEmoji(index)} <b>${this.escapeHtml(listing.title)}</b>\n`;

      if (listing.priceFormatted && listing.priceFormatted !== 'غير محدد') {
        text += `💰 ${listing.priceFormatted}\n`;
      }

      text += `📍 ${listing.location.city}`;
      if (listing.location.neighborhood) {
        text += ` - ${listing.location.neighborhood}`;
      }
      text += '\n';

      // Add key attributes
      if (listing.attributes) {
        const attrs = this.formatKeyAttributes(listing.attributes, language);
        if (attrs) {
          text += `${attrs}\n`;
        }
      }

      // Ensure URL uses www.kasioon.com
      const listingUrl = listing.url || `https://www.kasioon.com/listing/${listing.id}`;
      text += `🔗 <a href="${listingUrl}">عرض التفاصيل</a>\n\n`;
    }

    return text;
  }

  /**
   * Build footer section
   * @param {Object} pagination - Pagination info
   * @param {Object} meta - Metadata
   * @param {string} language - Language
   * @returns {string} Footer text
   */
  static buildFooter(pagination, meta, language) {
    let footer = '';

    if (pagination.total > 5) {
      const remaining = pagination.total - 5;
      footer += language === 'ar'
        ? `<i>📄 وفي كمان ${remaining} إعلان تاني</i>\n`
        : `<i>📄 ${remaining} more listings available</i>\n`;
    }

    // footer += `\n⚡ ${meta.responseTime}ms`;

    return footer;
  }

  /**
   * Build inline keyboard buttons
   * @param {Object} pagination - Pagination info
   * @param {Array} suggestions - Search suggestions
   * @param {string} language - Language
   * @returns {Array} Buttons array
   */
  static buildButtons(pagination, suggestions, language) {
    const buttons = [];

    // More results button
    if (pagination.total > 5) {
      buttons.push([
        {
          text: language === 'ar' ? '🌐 شوف الكل على الموقع' : '🌐 View All on Website',
          url: 'https://www.kasioon.com'
        }
      ]);
    }

    // New search button
    buttons.push([
      {
        text: language === 'ar' ? '🔍 بحث جديد' : '🔍 New Search',
        callback_data: 'new_search'
      }
    ]);

    // Suggestion buttons (max 2)
    if (suggestions && suggestions.length > 0) {
      const maxSuggestions = Math.min(2, suggestions.length);
      for (let i = 0; i < maxSuggestions; i++) {
        buttons.push([
          {
            text: `💡 ${suggestions[i]}`,
            callback_data: `search:${suggestions[i]}`
          }
        ]);
      }
    }

    return buttons;
  }

  /**
   * Format no results message
   * @param {string} query - Original query
   * @param {string} language - Language
   * @returns {Object} Telegram response
   */
  static formatNoResults(query, language) {
    const text = language === 'ar'
      ? `😔 <b>ما لقيت شي للأسف</b>\n\nما في إعلانات متل: "${this.escapeHtml(query)}"\n\n💡 <i>جرب تبحث بكلمات تانية أو أقل تحديد</i>`
      : `😔 <b>No Results Found</b>\n\nNo listings found matching: "${this.escapeHtml(query)}"\n\n💡 <i>Try searching with different or fewer keywords</i>`;

    return {
      text,
      parseMode: 'HTML',
      buttons: [
        [{ text: language === 'ar' ? '🔍 بحث جديد' : '🔍 New Search', callback_data: 'new_search' }]
      ]
    };
  }

  /**
   * Format error message
   * @param {string} error - Error message
   * @param {string} language - Language
   * @returns {Object} Telegram response
   */
  static formatError(error, language = 'ar') {
    const text = language === 'ar'
      ? `⚠️ <b>حدث خطأ</b>\n\n${this.escapeHtml(error)}\n\nالرجاء المحاولة مرة أخرى.`
      : `⚠️ <b>Error</b>\n\n${this.escapeHtml(error)}\n\nPlease try again.`;

    return {
      text,
      parseMode: 'HTML',
      buttons: []
    };
  }

  /**
   * Format listings with a custom title
   * @param {Array} listings - Listings array
   * @param {string} language - Language
   * @param {string} title - Custom title
   * @returns {Object} Formatted Telegram response
   */
  static formatListings(listings, language = 'ar', title = null) {
    if (listings.length === 0) {
      return this.formatNoResults('', language);
    }

    let text = title ? `${title}\n\n` : '';
    text += this.buildListings(listings, language);

    return {
      text,
      parseMode: 'HTML',
      buttons: [
        [{ text: language === 'ar' ? '🔍 بحث جديد' : '🔍 New Search', callback_data: 'new_search' }]
      ],
      disableWebPagePreview: false
    };
  }

  /**
   * Format offices list
   * @param {Array} offices - Offices array
   * @param {string} language - Language
   * @returns {Object} Formatted Telegram response
   */
  static formatOffices(offices, language = 'ar') {
    if (offices.length === 0) {
      const text = language === 'ar'
        ? '😔 <b>لا توجد مكاتب</b>'
        : '😔 <b>No Offices Found</b>';

      return {
        text,
        parseMode: 'HTML',
        buttons: []
      };
    }

    let text = language === 'ar'
      ? '🏢 <b>المكاتب العقارية</b>\n\n'
      : '🏢 <b>Real Estate Offices</b>\n\n';

    const maxOffices = Math.min(offices.length, 10);
    for (let i = 0; i < maxOffices; i++) {
      const office = offices[i];
      const index = i + 1;

      text += `${this.getNumberEmoji(index)} <b>${this.escapeHtml(office.name)}</b>\n`;

      if (office.city) {
        text += `📍 ${office.city}`;
        if (office.province) {
          text += ` - ${office.province}`;
        }
        text += '\n';
      }

      if (office.rating) {
        const stars = '⭐'.repeat(Math.floor(office.rating));
        text += `${stars} ${office.rating.toFixed(1)}/5`;
        if (office.ratingCount) {
          text += ` (${office.ratingCount})`;
        }
        text += '\n';
      }

      if (office.isPremium) {
        text += '⭐ مكتب مميز\n';
      }

      if (office.activeListingsCount) {
        text += `📊 ${office.activeListingsCount} إعلان نشط\n`;
      }

      if (office.phone) {
        text += `📞 ${office.phone}\n`;
      }

      text += '\n';
    }

    return {
      text,
      parseMode: 'HTML',
      buttons: [
        [{ text: language === 'ar' ? '🔍 بحث جديد' : '🔍 New Search', callback_data: 'new_search' }]
      ],
      disableWebPagePreview: false
    };
  }

  /**
   * Format office details
   * @param {Object} office - Office object
   * @param {string} language - Language
   * @returns {Object} Formatted Telegram response
   */
  static formatOfficeDetails(office, language = 'ar') {
    let text = `🏢 <b>${this.escapeHtml(office.name)}</b>\n\n`;

    if (office.description) {
      text += `${this.escapeHtml(office.description)}\n\n`;
    }

    text += '<b>📋 معلومات التواصل:</b>\n';

    if (office.phone) {
      const cleanPhone = office.phone.replace(/[^0-9+]/g, '');
      text += `📞 <a href="tel:${cleanPhone}">${office.phone}</a>\n`;
      // Add WhatsApp link if phone exists
      if (cleanPhone) {
        text += `💬 <a href="https://wa.me/${cleanPhone}">واتساب</a>\n`;
      }
    }

    if (office.email) {
      text += `✉️ ${office.email}\n`;
    }

    if (office.website) {
      text += `🌐 <a href="${office.website}">الموقع الإلكتروني</a>\n`;
    }

    text += '\n<b>📍 الموقع:</b>\n';

    if (office.city) {
      text += `${office.city}`;
      if (office.province) {
        text += ` - ${office.province}`;
      }
      text += '\n';
    }

    if (office.address) {
      text += `${office.address}\n`;
    }

    text += '\n<b>📊 إحصائيات:</b>\n';

    if (office.rating) {
      const stars = '⭐'.repeat(Math.floor(office.rating));
      text += `التقييم: ${stars} ${office.rating.toFixed(1)}/5`;
      if (office.ratingCount) {
        text += ` (${office.ratingCount} تقييم)`;
      }
      text += '\n';
    }

    if (office.isPremium) {
      text += '⭐ مكتب مميز\n';
    }

    if (office.propertiesCount !== undefined) {
      text += `${office.propertiesCount} عقار مسجل\n`;
    }

    if (office.activeListingsCount !== undefined) {
      text += `${office.activeListingsCount} إعلان نشط\n`;
    }

    if (office.totalListingsCount !== undefined) {
      text += `${office.totalListingsCount} إعلان إجمالي\n`;
    }

    return {
      text,
      parseMode: 'HTML',
      buttons: [
        [{ text: language === 'ar' ? '🔍 بحث جديد' : '🔍 New Search', callback_data: 'new_search' }]
      ],
      disableWebPagePreview: false
    };
  }

  /**
   * Format key attributes
   * @param {Object} attributes - Attributes object
   * @param {string} language - Language
   * @returns {string} Formatted attributes
   */
  static formatKeyAttributes(attributes, language) {
    const parts = [];

    if (attributes.rooms) {
      parts.push(`🛏️ ${attributes.rooms} غرف`);
    }

    if (attributes.bathrooms) {
      parts.push(`🚿 ${attributes.bathrooms} حمام`);
    }

    if (attributes.area) {
      parts.push(`📐 ${attributes.area} م²`);
    }

    if (attributes.year) {
      parts.push(`📅 ${attributes.year}`);
    }

    if (attributes.brand) {
      parts.push(`🏷️ ${attributes.brand}`);
    }

    if (attributes.mileage) {
      parts.push(`🛣️ ${attributes.mileage} كم`);
    }

    return parts.length > 0 ? parts.join(' • ') : '';
  }

  /**
   * Get number emoji
   * @param {number} num - Number
   * @returns {string} Emoji
   */
  static getNumberEmoji(num) {
    const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    return emojis[num] || `${num}.`;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = TelegramFormatter;
