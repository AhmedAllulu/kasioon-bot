/**
 * WhatsApp Message Formatter
 * Formats search results for WhatsApp Business API
 */
class WhatsAppFormatter {
  /**
   * Format search results for WhatsApp
   * @param {Object} searchResults - Results from SearchService
   * @param {string} language - Language
   * @returns {Object} Formatted WhatsApp response
   */
  static formatSearchResults(searchResults, language = 'ar') {
    const { data, meta } = searchResults;
    const { query, listings, pagination } = data;

    if (listings.length === 0) {
      return this.formatNoResults(query.original, language);
    }

    let text = this.buildHeader(query, pagination, language);
    text += this.buildListings(listings, language);
    text += this.buildFooter(pagination, data.suggestions, language);

    return {
      text,
      type: 'text'
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
      ? '🔍 *نتائج البحث*\n\n'
      : '🔍 *Search Results*\n\n';

    if (query.parsed?.category) {
      header += `📂 ${query.parsed.category.name}`;
    }

    if (query.parsed?.location) {
      header += ` في ${query.parsed.location.name}`;
    }

    if (pagination.total > 0) {
      header += language === 'ar'
        ? `\n_تم العثور على ${pagination.total} إعلان_\n\n`
        : `\n_Found ${pagination.total} listings_\n\n`;
    }

    header += '━━━━━━━━━━━━━━━━\n\n';

    return header;
  }

  /**
   * Build listings section
   * @param {Array} listings - Listings array
   * @param {string} language - Language
   * @returns {string} Listings text
   */
  static buildListings(listings, language) {
    const maxListings = Math.min(listings.length, 3); // WhatsApp: show fewer results
    let text = '';

    for (let i = 0; i < maxListings; i++) {
      const listing = listings[i];
      const index = i + 1;

      text += `*${index}. ${listing.title}*\n`;

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

      text += `🔗 ${listing.url}\n`;
      text += '\n━━━━━━━━━━━━━━━━\n\n';
    }

    return text;
  }

  /**
   * Build footer section
   * @param {Object} pagination - Pagination info
   * @param {Array} suggestions - Search suggestions
   * @param {string} language - Language
   * @returns {string} Footer text
   */
  static buildFooter(pagination, suggestions, language) {
    let footer = '';

    if (pagination.total > 3) {
      const websiteUrl = process.env.KASIOON_WEBSITE_URL || 'https://kasioon.com';
      footer += language === 'ar'
        ? `_لعرض جميع النتائج (${pagination.total} إعلان)، زر موقعنا:_\n${websiteUrl}\n\n`
        : `_To view all ${pagination.total} results, visit our website:_\n${websiteUrl}\n\n`;
    }

    // Add suggestions
    if (suggestions && suggestions.length > 0) {
      footer += language === 'ar'
        ? '*💡 اقتراحات بحث:*\n'
        : '*💡 Search Suggestions:*\n';

      const maxSuggestions = Math.min(2, suggestions.length);
      for (let i = 0; i < maxSuggestions; i++) {
        footer += `• ${suggestions[i]}\n`;
      }
    }

    return footer;
  }

  /**
   * Format no results message
   * @param {string} query - Original query
   * @param {string} language - Language
   * @returns {Object} WhatsApp response
   */
  static formatNoResults(query, language) {
    const text = language === 'ar'
      ? `❌ *لم يتم العثور على نتائج*\n\nلم نجد أي إعلانات مطابقة لبحثك:\n"${query}"\n\n💡 _جرب البحث بكلمات مختلفة أو أقل تحديداً_`
      : `❌ *No Results Found*\n\nNo listings found matching:\n"${query}"\n\n💡 _Try searching with different or fewer keywords_`;

    return {
      text,
      type: 'text'
    };
  }

  /**
   * Format error message
   * @param {string} error - Error message
   * @param {string} language - Language
   * @returns {Object} WhatsApp response
   */
  static formatError(error, language = 'ar') {
    const text = language === 'ar'
      ? `⚠️ *حدث خطأ*\n\n${error}\n\nالرجاء المحاولة مرة أخرى.`
      : `⚠️ *Error*\n\n${error}\n\nPlease try again.`;

    return {
      text,
      type: 'text'
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
   * Format voice transcription confirmation
   * @param {string} transcription - Transcribed text
   * @param {string} language - Language
   * @returns {Object} WhatsApp response
   */
  static formatVoiceConfirmation(transcription, language) {
    const text = language === 'ar'
      ? `🎤 *تم تحويل الرسالة الصوتية إلى نص:*\n\n"${transcription}"\n\n_جاري البحث..._`
      : `🎤 *Voice message transcribed:*\n\n"${transcription}"\n\n_Searching..._`;

    return {
      text,
      type: 'text'
    };
  }
}

module.exports = WhatsAppFormatter;
