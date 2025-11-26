/**
 * API Response Formatter
 * Standardizes API responses across all endpoints
 */

class ResponseFormatter {
  /**
   * Format successful response
   * @param {*} data - Response data
   * @param {Object} meta - Metadata (optional)
   * @returns {Object} Formatted response
   */
  static success(data, meta = {}) {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Format error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} details - Additional error details
   * @returns {Object} Formatted error response
   */
  static error(message, statusCode = 500, details = {}) {
    return {
      success: false,
      error: {
        message,
        statusCode,
        ...details,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Format validation error response
   * @param {Array} errors - Validation errors
   * @returns {Object} Formatted validation error
   */
  static validationError(errors) {
    return {
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        errors,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Format search results response
   * @param {Array} listings - Search results
   * @param {Object} query - Parsed query
   * @param {Object} pagination - Pagination info
   * @param {Array} suggestions - Search suggestions
   * @param {Object} meta - Additional metadata
   * @returns {Object} Formatted search response
   */
  static searchResults(listings, query, pagination, suggestions = [], meta = {}) {
    return this.success(
      {
        query,
        listings,
        pagination,
        suggestions
      },
      meta
    );
  }

  /**
   * Format pagination metadata
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total items
   * @returns {Object} Pagination metadata
   */
  static pagination(page, limit, total) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };
  }

  /**
   * Format listing for API response
   * @param {Object} listing - Raw listing from database
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Object} Formatted listing
   */
  static formatListing(listing, language = 'ar') {
    const formatted = {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      priceFormatted: this.formatPrice(listing.price, listing.currency || 'SYP'),
      category: {
        id: listing.category_id,
        name: language === 'ar' ? listing.category_name_ar : listing.category_name_en,
        slug: listing.category_slug
      },
      location: {
        city: language === 'ar' ? listing.city_name_ar : listing.city_name_en,
        cityId: listing.city_id
      },
      mainImage: listing.main_image_url,
      views: listing.views || 0,
      createdAt: listing.created_at,
      url: `https://www.kasioon.com/listing/${listing.id}`
    };

    // Add transaction type if available
    if (listing.transaction_type_slug) {
      formatted.transactionType = {
        id: listing.transaction_type_id,
        name: language === 'ar' ? listing.transaction_type_name_ar : listing.transaction_type_name_en,
        slug: listing.transaction_type_slug
      };
    }

    // Add neighborhood if available
    if (listing.neighborhood_name_ar || listing.neighborhood_name_en) {
      formatted.location.neighborhood = language === 'ar'
        ? listing.neighborhood_name_ar
        : listing.neighborhood_name_en;
      formatted.location.neighborhoodId = listing.neighborhood_id;
    }

    // Add attributes if available
    if (listing.attributes && typeof listing.attributes === 'object') {
      formatted.attributes = listing.attributes;
    }

    return formatted;
  }

  /**
   * Format price with currency
   * @param {number} price - Price value
   * @param {string} currency - Currency code
   * @returns {string} Formatted price
   */
  static formatPrice(price, currency = 'SYP') {
    if (!price) return 'غير محدد';

    const formatted = new Intl.NumberFormat('ar-SY').format(price);

    const currencySymbols = {
      SYP: 'ل.س',
      USD: '$',
      EUR: '€'
    };

    return `${formatted} ${currencySymbols[currency] || currency}`;
  }

  /**
   * Format query analysis response
   * @param {Object} parsed - Parsed query data
   * @returns {Object} Formatted analysis
   */
  static queryAnalysis(parsed) {
    return this.success({
      intent: parsed.intent || 'search',
      category: parsed.category,
      location: parsed.location,
      transactionType: parsed.transactionType,
      attributes: parsed.attributes,
      keywords: parsed.keywords,
      confidence: parsed.confidence
    });
  }
}

module.exports = ResponseFormatter;
