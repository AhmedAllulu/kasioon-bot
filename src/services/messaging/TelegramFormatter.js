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
      ? '🔍 <b>نتائج البحث</b>\n\n'
      : '🔍 <b>Search Results</b>\n\n';

    if (query.parsed?.category) {
      const categoryName = language === 'ar' ? query.parsed.category.name_ar : query.parsed.category.name_en;
      header += `📂 ${categoryName}`;
    }

    if (query.parsed?.location) {
      const locationName = language === 'ar' ? query.parsed.location.name_ar : query.parsed.location.name_en;
      header += ` في ${locationName}`;
    }

    if (pagination.total > 0) {
      header += language === 'ar'
        ? `\n📊 <i>تم العثور على ${pagination.total} إعلان</i>\n\n`
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

      text += `🔗 <a href="${listing.url}">عرض التفاصيل</a>\n\n`;
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
        ? `<i>📄 يوجد ${remaining} إعلان إضافي</i>\n`
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
          text: language === 'ar' ? '📄 عرض المزيد على الموقع' : '📄 View More on Website',
          url: process.env.KASIOON_WEBSITE_URL || 'https://kasioon.com'
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
      ? `❌ <b>لم يتم العثور على نتائج</b>\n\nلم نجد أي إعلانات مطابقة لبحثك: "${this.escapeHtml(query)}"\n\n💡 <i>جرب البحث بكلمات مختلفة أو أقل تحديداً</i>`
      : `❌ <b>No Results Found</b>\n\nNo listings found matching: "${this.escapeHtml(query)}"\n\n💡 <i>Try searching with different or fewer keywords</i>`;

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
