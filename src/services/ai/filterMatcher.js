const ArabicNormalizer = require('../../utils/arabicNormalizer');

/**
 * Filter Matcher Service
 * Extracts user-mentioned attributes and maps them to available filter options
 */
class FilterMatcher {
  /**
   * Extract attributes from user message and map to available filters
   * @param {string} userMessage - The user's search query
   * @param {Array} filters - Available filters from category API
   * @param {string} language - 'ar' or 'en'
   * @returns {Object} - Matched filters object
   */
  static matchFiltersFromMessage(userMessage, filters, language = 'ar') {
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return {};
    }

    const matchedFilters = {};
    const normalizedMessage = ArabicNormalizer.normalize(userMessage.toLowerCase());

    for (const filter of filters) {
      const filterType = filter.type;
      const filterName = filter.name;

      switch (filterType) {
        case 'select':
          const selectMatch = this.matchSelectFilter(normalizedMessage, filter, language);
          if (selectMatch) {
            matchedFilters[filterName] = selectMatch;
          }
          break;

        case 'multiselect':
          const multiselectMatches = this.matchMultiselectFilter(normalizedMessage, filter, language);
          if (multiselectMatches.length > 0) {
            matchedFilters[filterName] = multiselectMatches;
          }
          break;

        case 'number':
          const numberMatch = this.matchNumberFilter(userMessage, filter, language);
          if (numberMatch) {
            matchedFilters[filterName] = numberMatch;
          }
          break;
      }
    }

    return matchedFilters;
  }

  /**
   * Match select filter (single value)
   */
  static matchSelectFilter(normalizedMessage, filter, language) {
    if (!filter.options || !Array.isArray(filter.options)) {
      return null;
    }

    const isArabic = language === 'ar';

    for (const option of filter.options) {
      const labelKey = isArabic ? 'label_ar' : 'label_en';
      const label = option[labelKey] || option.label_ar;

      if (!label) continue;

      const normalizedLabel = ArabicNormalizer.normalize(label.toLowerCase());

      // Check for exact match or substring match
      if (normalizedMessage.includes(normalizedLabel) ||
          normalizedLabel.includes(normalizedMessage)) {
        return option.value;
      }

      // Check for high similarity score
      const similarityScore = ArabicNormalizer.matchScore(normalizedMessage, normalizedLabel);
      if (similarityScore > 0.7) {
        return option.value;
      }
    }

    return null;
  }

  /**
   * Match multiselect filter (multiple values)
   */
  static matchMultiselectFilter(normalizedMessage, filter, language) {
    if (!filter.options || !Array.isArray(filter.options)) {
      return [];
    }

    const isArabic = language === 'ar';
    const matched = [];

    for (const option of filter.options) {
      const labelKey = isArabic ? 'label_ar' : 'label_en';
      const label = option[labelKey] || option.label_ar;

      if (!label) continue;

      const normalizedLabel = ArabicNormalizer.normalize(label.toLowerCase());

      // Check for match
      if (normalizedMessage.includes(normalizedLabel)) {
        matched.push(option.value);
      } else {
        const similarityScore = ArabicNormalizer.matchScore(normalizedMessage, normalizedLabel);
        if (similarityScore > 0.7) {
          matched.push(option.value);
        }
      }
    }

    return matched;
  }

  /**
   * Match number filter (extract range from message)
   */
  static matchNumberFilter(userMessage, filter, language) {
    const filterName = filter.name;
    const label = filter.label;

    // Common number patterns
    const patterns = {
      // Price patterns
      price: {
        ar: /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:دولار|ليرة|ل\.س|$|USD|SYP|TRY)/gi,
        en: /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:dollar|lira|USD|SYP|TRY|\$)/gi,
        range_ar: /من\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:إلى|ل|الى|-)\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi,
        range_en: /from\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi
      },
      // Area patterns
      area: {
        ar: /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:متر|م²|متر مربع)/gi,
        en: /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:sqm|m²|square meter)/gi,
        range_ar: /من\s*(\d+)\s*(?:إلى|ل|الى|-)\s*(\d+)\s*(?:متر|م²)/gi,
        range_en: /from\s*(\d+)\s*(?:to|-)\s*(\d+)\s*(?:sqm|m²)/gi
      },
      // Generic number patterns
      generic: {
        ar: /(\d+)\s*(?:غرف|غرفة|حمام|طابق)/gi,
        en: /(\d+)\s*(?:rooms?|bedrooms?|bathrooms?|floors?)/gi
      }
    };

    const isArabic = language === 'ar';
    let result = null;

    // Check if it's a price filter
    if (filterName.includes('price')) {
      const rangePattern = isArabic ? patterns.price.range_ar : patterns.price.range_en;
      const singlePattern = isArabic ? patterns.price.ar : patterns.price.en;

      // Try range pattern first
      const rangeMatch = userMessage.match(rangePattern);
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1].replace(/,/g, ''));
        const max = parseFloat(rangeMatch[2].replace(/,/g, ''));
        result = { min, max };
      } else {
        // Try single value
        const singleMatch = userMessage.match(singlePattern);
        if (singleMatch) {
          const value = parseFloat(singleMatch[1].replace(/,/g, ''));
          result = { max: value };
        }
      }
    }
    // Check if it's an area filter
    else if (filterName.includes('area')) {
      const rangePattern = isArabic ? patterns.area.range_ar : patterns.area.range_en;
      const singlePattern = isArabic ? patterns.area.ar : patterns.area.en;

      const rangeMatch = userMessage.match(rangePattern);
      if (rangeMatch) {
        const min = parseFloat(rangeMatch[1].replace(/,/g, ''));
        const max = parseFloat(rangeMatch[2].replace(/,/g, ''));
        result = { min, max };
      } else {
        const singleMatch = userMessage.match(singlePattern);
        if (singleMatch) {
          const value = parseFloat(singleMatch[1].replace(/,/g, ''));
          result = { min: value };
        }
      }
    }
    // Generic number matching based on filter label
    else {
      const normalizedLabel = ArabicNormalizer.normalize(label.toLowerCase());

      // Look for numbers near the filter label in the message
      const words = userMessage.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const normalizedWord = ArabicNormalizer.normalize(word.toLowerCase());

        if (normalizedWord.includes(normalizedLabel) || normalizedLabel.includes(normalizedWord)) {
          // Check previous and next words for numbers
          const prevWord = i > 0 ? words[i - 1] : '';
          const nextWord = i < words.length - 1 ? words[i + 1] : '';

          const numberMatch = prevWord.match(/\d+/) || nextWord.match(/\d+/);
          if (numberMatch) {
            const value = parseInt(numberMatch[0]);
            result = { value };
            break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Build filter query parameters for API
   * @param {Object} matchedFilters - Matched filters object
   * @returns {Object} - Query parameters object
   */
  static buildFilterQueryParams(matchedFilters) {
    const params = {};

    for (const [filterName, filterValue] of Object.entries(matchedFilters)) {
      if (Array.isArray(filterValue)) {
        // Multiselect - join with comma
        params[`filters[${filterName}]`] = filterValue.join(',');
      } else if (typeof filterValue === 'object' && filterValue !== null) {
        // Number range
        if (filterValue.min !== undefined) {
          params[`filters[${filterName}][min]`] = filterValue.min;
        }
        if (filterValue.max !== undefined) {
          params[`filters[${filterName}][max]`] = filterValue.max;
        }
        if (filterValue.value !== undefined) {
          params[`filters[${filterName}]`] = filterValue.value;
        }
      } else {
        // Single select
        params[`filters[${filterName}]`] = filterValue;
      }
    }

    return params;
  }

  /**
   * Get user-friendly description of matched filters
   * @param {Object} matchedFilters - Matched filters object
   * @param {Array} availableFilters - Available filters from API
   * @param {string} language - 'ar' or 'en'
   * @returns {string} - Human-readable description
   */
  static describeMatchedFilters(matchedFilters, availableFilters, language = 'ar') {
    const descriptions = [];
    const isArabic = language === 'ar';

    for (const [filterName, filterValue] of Object.entries(matchedFilters)) {
      const filter = availableFilters.find(f => f.name === filterName);
      if (!filter) continue;

      const filterLabel = filter.label;

      if (Array.isArray(filterValue)) {
        const labels = filterValue.map(val => {
          const option = filter.options.find(opt => opt.value === val);
          if (!option) return val;
          return isArabic ? option.label_ar : option.label_en;
        });
        descriptions.push(`${filterLabel}: ${labels.join(', ')}`);
      } else if (typeof filterValue === 'object') {
        if (filterValue.min !== undefined && filterValue.max !== undefined) {
          descriptions.push(`${filterLabel}: ${filterValue.min} - ${filterValue.max}`);
        } else if (filterValue.min !== undefined) {
          descriptions.push(`${filterLabel}: ${isArabic ? 'من' : 'from'} ${filterValue.min}`);
        } else if (filterValue.max !== undefined) {
          descriptions.push(`${filterLabel}: ${isArabic ? 'حتى' : 'up to'} ${filterValue.max}`);
        } else if (filterValue.value !== undefined) {
          descriptions.push(`${filterLabel}: ${filterValue.value}`);
        }
      } else {
        const option = filter.options?.find(opt => opt.value === filterValue);
        const valueLabel = option ? (isArabic ? option.label_ar : option.label_en) : filterValue;
        descriptions.push(`${filterLabel}: ${valueLabel}`);
      }
    }

    return descriptions.join(' | ');
  }
}

module.exports = FilterMatcher;
