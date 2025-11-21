const ArabicNormalizer = require('../../utils/arabicNormalizer');

/**
 * Match Scorer Service
 * Calculates how well a listing matches user's search criteria (0-100%)
 */
class MatchScorer {
  /**
   * Calculate comprehensive match score for a listing
   * @param {Object} listing - The listing to score
   * @param {Object} userParams - User's search parameters
   * @param {string} userMessage - Original user message
   * @param {Object} requestedFilters - Filters extracted from user message
   * @returns {Object} - Score and detailed breakdown
   */
  static calculateMatchScore(listing, userParams, userMessage, requestedFilters = {}) {
    const scores = {
      categoryMatch: 0,
      locationMatch: 0,       // NEW: Location matching
      filterMatch: 0,
      attributeMatch: 0,
      keywordRelevance: 0,
      completeness: 0
    };

    const weights = {
      categoryMatch: 25,      // Decreased from 30% to make room for location
      locationMatch: 20,      // NEW: 20% for location - critical for local searches
      filterMatch: 15,        // Decreased from 20%
      attributeMatch: 10,     // Decreased from 15%
      keywordRelevance: 20,   // Decreased from 25%
      completeness: 10        // Kept at 10%
    };

    // 1. Category Match (25%)
    scores.categoryMatch = this.calculateCategoryMatch(listing, userParams);

    // 2. Location Match (20%) - NEW!
    scores.locationMatch = this.calculateLocationMatch(listing, userParams, userMessage);

    // 3. Filter Match (15%)
    scores.filterMatch = this.calculateFilterMatch(listing, requestedFilters);

    // 4. Attribute Match (10%)
    scores.attributeMatch = this.calculateAttributeMatch(listing, userParams);

    // 5. Keyword Relevance (20%)
    scores.keywordRelevance = this.calculateKeywordRelevance(listing, userMessage, userParams);

    // 6. Completeness (10%)
    scores.completeness = this.calculateCompleteness(listing);

    // Calculate weighted total score
    const totalScore = Math.round(
      (scores.categoryMatch * weights.categoryMatch +
       scores.locationMatch * weights.locationMatch +
       scores.filterMatch * weights.filterMatch +
       scores.attributeMatch * weights.attributeMatch +
       scores.keywordRelevance * weights.keywordRelevance +
       scores.completeness * weights.completeness) / 100
    );

    return {
      matchScore: totalScore,
      matchDetails: {
        categoryMatch: Math.round(scores.categoryMatch),
        locationMatch: Math.round(scores.locationMatch),
        filterMatch: Math.round(scores.filterMatch),
        attributeMatch: Math.round(scores.attributeMatch),
        keywordRelevance: Math.round(scores.keywordRelevance),
        completeness: Math.round(scores.completeness)
      }
    };
  }

  /**
   * Calculate category match score
   */
  static calculateCategoryMatch(listing, userParams) {
    // If no category extracted from user query, use neutral score
    // This lets other criteria (keywords, etc.) determine relevance
    if (!userParams.category) {
      return 50; // Neutral score - not perfect, not terrible
    }

    const listingCategory = listing.category_slug || listing.category?.slug || '';
    const requestedCategory = userParams.category;

    // Exact match
    if (listingCategory === requestedCategory) {
      return 100;
    }

    // Check if listing category is a subcategory of requested category
    const listingPath = listing.category?.path || listingCategory;
    if (listingPath && listingPath.includes(requestedCategory)) {
      return 80;
    }

    // Check if requested category is in listing's path (parent category match)
    const requestedInPath = listingPath && listingPath.includes(requestedCategory);
    if (requestedInPath) {
      return 70;
    }

    // Partial match
    const normalizedListing = ArabicNormalizer.normalize(listingCategory);
    const normalizedRequested = ArabicNormalizer.normalize(requestedCategory);

    if (normalizedListing.includes(normalizedRequested) ||
        normalizedRequested.includes(normalizedListing)) {
      return 60;
    }

    // No match - heavily penalize
    return 0;
  }

  /**
   * Calculate location match score
   */
  static calculateLocationMatch(listing, userParams, userMessage) {
    // Check if user specified a location
    const requestedCity = userParams.city;

    // If no location specified, return neutral score
    if (!requestedCity) {
      return 80; // Neutral - location not a concern
    }

    // Check if user emphasized location with "فقط" (only) or similar words
    const isStrict = /\b(فقط|بس|only)\b/i.test(userMessage);

    // Get listing location
    const listingLocation = listing.location || {};
    const listingCity = listingLocation.city || '';
    const listingProvince = listingLocation.province || '';

    // Normalize both for comparison
    const normalizedRequested = ArabicNormalizer.normalize(requestedCity.toLowerCase());
    const normalizedCity = ArabicNormalizer.normalize(listingCity.toLowerCase());
    const normalizedProvince = ArabicNormalizer.normalize(listingProvince.toLowerCase());

    // Exact city match
    if (normalizedCity === normalizedRequested || normalizedCity.includes(normalizedRequested)) {
      return 100; // Perfect location match
    }

    // Province match (user asked for province, or city is in that province)
    if (normalizedProvince === normalizedRequested || normalizedProvince.includes(normalizedRequested)) {
      return 90; // Province match is very good
    }

    // Check if requested location is in city name or vice versa
    if (normalizedRequested.includes(normalizedCity) && normalizedCity.length > 2) {
      return 80; // Partial match
    }

    // If user was strict about location ("فقط في دمشق"), heavily penalize mismatches
    if (isStrict) {
      return 0; // Hard requirement not met - fail completely
    }

    // Different location but not strict - moderate penalty
    return 30; // Wrong location, but maybe user is flexible
  }

  /**
   * Calculate filter match score
   */
  static calculateFilterMatch(listing, requestedFilters) {
    const filterKeys = Object.keys(requestedFilters);

    // If no filters requested, return neutral score
    // This makes keyword relevance more important
    if (filterKeys.length === 0) {
      return 80; // Neutral-positive - no filters to fail
    }

    let matchedFilters = 0;
    let totalFilters = filterKeys.length;
    const listingAttributes = listing.attributes || {};

    for (const [filterName, filterValue] of Object.entries(requestedFilters)) {
      const listingValue = listingAttributes[filterName];

      if (!listingValue) {
        continue; // Filter not present in listing
      }

      // Handle different filter types
      if (Array.isArray(filterValue)) {
        // Multiselect - check if any requested value is present
        const listingArray = Array.isArray(listingValue) ? listingValue : [listingValue];
        const hasMatch = filterValue.some(val => listingArray.includes(val));
        if (hasMatch) {
          matchedFilters++;
        }
      } else if (typeof filterValue === 'object' && filterValue !== null) {
        // Number range
        const numValue = parseFloat(listingValue);
        if (!isNaN(numValue)) {
          const inRange =
            (filterValue.min === undefined || numValue >= filterValue.min) &&
            (filterValue.max === undefined || numValue <= filterValue.max) &&
            (filterValue.value === undefined || numValue === filterValue.value);

          if (inRange) {
            matchedFilters++;
          }
        }
      } else {
        // Single select - exact match
        const normalizedListingValue = ArabicNormalizer.normalize(String(listingValue).toLowerCase());
        const normalizedFilterValue = ArabicNormalizer.normalize(String(filterValue).toLowerCase());

        if (normalizedListingValue === normalizedFilterValue) {
          matchedFilters++;
        }
      }
    }

    return (matchedFilters / totalFilters) * 100;
  }

  /**
   * Calculate attribute match score
   */
  static calculateAttributeMatch(listing, userParams) {
    const attributes = listing.attributes || {};
    let matchedAttributes = 0;
    let totalAttributes = 0;

    // Vehicle attributes
    const vehicleAttributes = ['carBrand', 'carModel', 'minYear', 'maxYear', 'fuelType', 'transmission'];
    vehicleAttributes.forEach(attr => {
      if (userParams[attr] !== undefined) {
        totalAttributes++;
        const attrKey = attr.replace('car', '').replace('min', '').replace('max', '').toLowerCase();
        const listingValue = attributes[attrKey] || attributes[attr];

        if (listingValue) {
          const normalizedListing = ArabicNormalizer.normalize(String(listingValue).toLowerCase());
          const normalizedParam = ArabicNormalizer.normalize(String(userParams[attr]).toLowerCase());

          if (attr.includes('min') || attr.includes('max')) {
            // Range comparison for year
            const listingNum = parseInt(listingValue);
            const paramNum = parseInt(userParams[attr]);
            if (!isNaN(listingNum) && !isNaN(paramNum)) {
              if (attr.includes('min') && listingNum >= paramNum) {
                matchedAttributes++;
              } else if (attr.includes('max') && listingNum <= paramNum) {
                matchedAttributes++;
              }
            }
          } else {
            // Exact match
            if (normalizedListing === normalizedParam || normalizedListing.includes(normalizedParam)) {
              matchedAttributes++;
            }
          }
        }
      }
    });

    // Real estate attributes
    const realEstateAttributes = ['rooms', 'bathrooms', 'floor', 'furnished'];
    realEstateAttributes.forEach(attr => {
      if (userParams[attr] !== undefined) {
        totalAttributes++;
        const listingValue = attributes[attr];

        if (listingValue !== undefined) {
          if (typeof userParams[attr] === 'boolean') {
            if (listingValue === userParams[attr]) {
              matchedAttributes++;
            }
          } else {
            const listingNum = parseInt(listingValue);
            const paramNum = parseInt(userParams[attr]);
            if (!isNaN(listingNum) && !isNaN(paramNum) && listingNum === paramNum) {
              matchedAttributes++;
            }
          }
        }
      }
    });

    if (totalAttributes === 0) {
      return 80; // No specific attributes requested - neutral score
    }

    return (matchedAttributes / totalAttributes) * 100;
  }

  /**
   * Calculate keyword relevance score
   */
  static calculateKeywordRelevance(listing, userMessage, userParams) {
    const titleText = listing.title || '';
    const descriptionText = listing.description || '';
    const categoryText = listing.category?.name || '';
    const combinedText = `${titleText} ${descriptionText} ${categoryText}`;

    // Remove common filter/location words to focus on core keywords
    let cleanedMessage = userMessage;
    const commonWords = [
      'سعر', 'price', 'متر', 'sqm', 'غرف', 'rooms', 'حمام', 'bathroom',
      'دولار', 'dollar', 'ليرة', 'lira', 'في', 'بدي', 'أريد', 'ابحث'
    ];
    commonWords.forEach(word => {
      cleanedMessage = cleanedMessage.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });

    // Extract important keywords (nouns, meaningful words)
    const importantKeywords = cleanedMessage.trim().split(/\s+/).filter(w => w.length > 2);

    if (importantKeywords.length === 0) {
      return 50; // No keywords to match
    }

    // Calculate base match score
    const baseScore = ArabicNormalizer.matchScore(combinedText, cleanedMessage);

    // Check for keyword presence in title (higher weight)
    const titleScore = ArabicNormalizer.matchScore(titleText, cleanedMessage);

    // Check for keyword presence in category (medium weight)
    const categoryScore = ArabicNormalizer.matchScore(categoryText, cleanedMessage);

    // Weighted combination: title most important, then category, then description
    const weightedScore = (titleScore * 0.5) + (categoryScore * 0.3) + (baseScore * 0.2);

    return Math.min(weightedScore * 100, 100);
  }

  /**
   * Calculate listing completeness score
   */
  static calculateCompleteness(listing) {
    let score = 0;

    // Has images (30 points)
    if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
      score += 30;
      // Bonus for multiple images
      if (listing.images.length >= 3) {
        score += 10;
      }
    }

    // Has price (30 points)
    if (listing.price !== null && listing.price !== undefined && listing.price > 0) {
      score += 30;
    }

    // Has description (20 points)
    if (listing.description && listing.description.length > 50) {
      score += 20;
      // Bonus for detailed description
      if (listing.description.length > 200) {
        score += 10;
      }
    }

    // Has attributes (10 points)
    if (listing.attributes && Object.keys(listing.attributes).length > 0) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Get match quality badge
   * @param {number} score - Match score (0-100)
   * @returns {Object} - Badge emoji and text
   */
  static getMatchBadge(score, language = 'ar') {
    if (score >= 90) {
      return {
        emoji: '🟢',
        text: language === 'ar' ? 'مطابقة ممتازة' : 'Perfect Match'
      };
    } else if (score >= 70) {
      return {
        emoji: '🟡',
        text: language === 'ar' ? 'مطابقة جيدة' : 'Good Match'
      };
    } else if (score >= 50) {
      return {
        emoji: '🟠',
        text: language === 'ar' ? 'مطابقة جزئية' : 'Partial Match'
      };
    } else {
      return {
        emoji: '🔴',
        text: language === 'ar' ? 'مطابقة ضعيفة' : 'Weak Match'
      };
    }
  }

  /**
   * Sort listings by match score (descending)
   * @param {Array} listings - Array of listings with match scores
   * @returns {Array} - Sorted listings
   */
  static sortByMatchScore(listings) {
    return listings.sort((a, b) => {
      const scoreA = a.matchScore || 0;
      const scoreB = b.matchScore || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Filter out low-scoring listings
   * @param {Array} listings - Array of listings with match scores
   * @param {number} threshold - Minimum score (default 30)
   * @returns {Array} - Filtered listings
   */
  static filterByThreshold(listings, threshold = 30) {
    return listings.filter(listing => (listing.matchScore || 0) >= threshold);
  }
}

module.exports = MatchScorer;
