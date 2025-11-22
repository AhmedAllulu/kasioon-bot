/**
 * Search Parameters Builder
 * Converts analysis result to valid API parameters
 */
class SearchParamsBuilder {
  /**
   * Build search parameters from analysis result
   * @param {Object} analysisResult - Analysis result
   * @param {Object} options - Additional options
   * @returns {Object} Search parameters
   */
  build(analysisResult, options = {}) {
    const params = {
      language: analysisResult.raw?.language || options.language || 'ar',
      page: options.page || 1,
      limit: options.limit || 7 // ⚠️ أقصى 7 نتائج
    };

    // Category
    if (analysisResult.category?.slug) {
      params.categorySlug = analysisResult.category.slug;
    }

    // Transaction type
    if (analysisResult.transactionType) {
      params.transactionTypeSlug = analysisResult.transactionType;
    }

    // Location
    if (analysisResult.location) {
      if (analysisResult.location.type === 'city') {
        params.cityId = analysisResult.location.id;
      } else if (analysisResult.location.type === 'province') {
        params.province = analysisResult.location.name;
      } else if (analysisResult.location.type === 'neighborhood') {
        params.neighborhoodId = analysisResult.location.id;
      }
    }

    // Filters
    for (const [key, value] of Object.entries(analysisResult.attributes)) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && (value.min !== undefined || value.max !== undefined)) {
        // Range
        if (value.min !== undefined) params[`attributes.${key}.min`] = value.min;
        if (value.max !== undefined) params[`attributes.${key}.max`] = value.max;
        if (value.value !== undefined) params[`attributes.${key}`] = value.value;
      } else if (Array.isArray(value)) {
        // Multiple values
        params[`attributes.${key}`] = value.join(',');
      } else {
        // Single value
        params[`attributes.${key}`] = value;
      }
    }

    // Keywords
    if (analysisResult.keywords?.length > 0) {
      params.keywords = analysisResult.keywords.join(' ');
    }

    return params;
  }

  /**
   * Describe search parameters (for display to user)
   * @param {Object} params - Search parameters
   * @param {string} language - Language
   * @returns {string} Description
   */
  describe(params, language = 'ar') {
    const parts = [];
    const isArabic = language === 'ar';

    if (params.categorySlug) {
      parts.push(params.categorySlug);
    }

    if (params.transactionTypeSlug) {
      parts.push(params.transactionTypeSlug === 'for-sale'
        ? (isArabic ? 'للبيع' : 'For Sale')
        : (isArabic ? 'للإيجار' : 'For Rent'));
    }

    // Search for price parameters
    const priceMin = params['attributes.price.min'];
    const priceMax = params['attributes.price.max'];
    if (priceMin || priceMax) {
      if (priceMin && priceMax) {
        parts.push(isArabic ? `${priceMin} - ${priceMax}` : `${priceMin} - ${priceMax}`);
      } else if (priceMax) {
        parts.push(isArabic ? `حتى ${priceMax}` : `Up to ${priceMax}`);
      } else if (priceMin) {
        parts.push(isArabic ? `من ${priceMin}` : `From ${priceMin}`);
      }
    }

    return parts.join(' • ');
  }
}

module.exports = new SearchParamsBuilder();
