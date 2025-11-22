const dynamicDataManager = require('../data/dynamicDataManager');
const logger = require('../../utils/logger');

/**
 * Dynamic Message Analyzer
 * Uses data fetched from API to analyze user messages
 * NO static data - everything is dynamic
 */
class MessageAnalyzer {
  constructor() {
    // ============================================================================
    // LEAF CATEGORY KEYWORDS
    // Maps Arabic/English keywords to SPECIFIC leaf category slugs
    // These help identify specific categories even when API data is incomplete
    // ============================================================================
    this.leafCategoryKeywords = {
      // Real Estate - LEAF categories (not "real-estate")
      'houses': ['بيت', 'بيوت', 'منزل', 'منازل', 'دار', 'house', 'houses', 'home', 'homes'],
      'apartments': ['شقة', 'شقق', 'apartment', 'apartments', 'flat', 'flats'],
      'villas': ['فيلا', 'فيلات', 'villa', 'villas'],
      'lands': ['أرض', 'ارض', 'أراضي', 'اراضي', 'land', 'lands', 'plot'],
      'agricultural-lands': ['أرض زراعية', 'ارض زراعية', 'زراعي', 'زراعية', 'agricultural'],
      'commercial-lands': ['أرض تجارية', 'ارض تجارية', 'تجاري', 'تجارية'],
      'offices': ['مكتب', 'مكاتب', 'office', 'offices'],
      'shops': ['محل', 'محلات', 'دكان', 'دكاكين', 'shop', 'shops', 'store', 'stores'],
      'warehouses': ['مستودع', 'مستودعات', 'مخزن', 'مخازن', 'warehouse', 'warehouses'],

      // Vehicles - LEAF categories (not "vehicles")
      'cars': ['سيارة', 'سيارات', 'car', 'cars', 'automobile'],
      'motorcycles': ['دراجة نارية', 'دراجات نارية', 'موتور', 'موتوسيكل', 'motorcycle', 'motorcycles', 'motorbike'],
      'trucks': ['شاحنة', 'شاحنات', 'تريلا', 'truck', 'trucks', 'lorry'],
      'buses': ['باص', 'باصات', 'حافلة', 'حافلات', 'bus', 'buses'],

      // Electronics
      'mobiles': ['موبايل', 'موبايلات', 'جوال', 'هاتف', 'mobile', 'phone', 'smartphone'],
      'laptops': ['لابتوب', 'لابتوبات', 'حاسوب محمول', 'laptop', 'laptops', 'notebook'],
      'tablets': ['تابلت', 'آيباد', 'tablet', 'ipad'],
      'computers': ['كمبيوتر', 'حاسوب', 'computer', 'desktop', 'pc'],

      // Furniture
      'furniture': ['أثاث', 'اثاث', 'موبيليا', 'furniture']
    };

    // Build reverse lookup: keyword -> category
    this.keywordToCategory = {};
    for (const [category, keywords] of Object.entries(this.leafCategoryKeywords)) {
      for (const keyword of keywords) {
        this.keywordToCategory[keyword.toLowerCase()] = category;
      }
    }

    // Number patterns (these are regex patterns, not static data)
    this.numberPatterns = {
      // Price with unit
      priceWithUnit: /(\d+(?:[,،]\d{3})*(?:\.\d+)?)\s*(ليرة|ل\.س|مليون|ألف|دولار|\$|USD|SYP)/gi,
      // Price with keyword
      priceWithKeyword: /(?:سعر[هـ]?[ا]?|بـ?سعر|price)\s*(\d+(?:[,،]\d{3})*)/gi,
      // Area
      area: /(\d+)\s*(?:متر|م2|م²|sqm|square|meter)/gi,
      // Year
      year: /(?:موديل|سنة|model|year)\s*(\d{4})/gi,
      // Rooms
      rooms: /(\d+)\s*(?:غرف|غرفة|rooms?|bedroom)/gi,
      // Bathrooms
      bathrooms: /(\d+)\s*(?:حمام|حمامات|bathroom|wc)/gi,
      // Mileage
      mileage: /(\d+(?:[,،]\d{3})*)\s*(?:كم|كيلو|km|kilometer)/gi,
      // Floor
      floor: /(?:طابق|دور|floor)\s*(\d+)/gi,
      // Range: from X to Y
      range: /(?:من|between)\s*(\d+(?:[,،]\d{3})*)\s*(?:إلى|الى|لـ?|to|-)\s*(\d+(?:[,،]\d{3})*)/gi,
      // Less than
      lessThan: /(?:أقل من|تحت|under|less than|max)\s*(\d+(?:[,،]\d{3})*)/gi,
      // More than
      moreThan: /(?:أكثر من|فوق|over|more than|min)\s*(\d+(?:[,،]\d{3})*)/gi
    };

    // Transaction type patterns
    this.transactionPatterns = {
      sale: /(?:للبيع|بيع|for\s*sale|sell)/i,
      rent: /(?:للإيجار|للايجار|إيجار|ايجار|أجار|for\s*rent|rent)/i
    };

    // Condition patterns
    this.conditionPatterns = {
      new: /(?:جديد[ة]?|new)/i,
      used: /(?:مستعمل[ة]?|used)/i,
      excellent: /(?:ممتاز[ة]?|excellent)/i
    };

    // Boolean patterns
    this.booleanPatterns = {
      furnished: { positive: /مفروش[ة]?|furnished/i, negative: /غير مفروش|فارغ[ة]?|unfurnished/i },
      parking: { positive: /موقف|كراج|parking|garage/i },
      garden: { positive: /حديقة|garden/i },
      pool: { positive: /مسبح|pool/i },
      elevator: { positive: /مصعد|elevator|lift/i },
      balcony: { positive: /بلكون[ة]?|شرفة|balcony/i },
      ac: { positive: /تكييف|مكيف|ac|air\s*condition/i }
    };
  }

  /**
   * Analyze user message
   * @param {string} message - User message
   * @param {string} language - Language
   * @returns {Object} Analysis result
   */
  async analyze(message, language = 'ar') {
    console.log('🔍 [ANALYZER] Starting analysis:', message.substring(0, 50));

    // Ensure data is loaded
    await dynamicDataManager.loadStructure(language);

    const result = {
      category: null,
      transactionType: null,
      location: null,
      attributes: {},
      keywords: [],
      confidence: 0,
      raw: { message, language }
    };

    // 1. Extract category
    result.category = await this.extractCategory(message, language);

    // 2. Extract transaction type
    result.transactionType = this.extractTransactionType(message);

    // 3. Extract location
    result.location = this.extractLocation(message);

    // 4. Extract numbers and basic filters
    const basicFilters = this.extractBasicFilters(message);
    Object.assign(result.attributes, basicFilters);

    // 5. If category found, get its filters and extract values
    if (result.category?.slug) {
      const categoryFilters = await this.extractCategorySpecificFilters(
        message,
        result.category.slug,
        language
      );
      Object.assign(result.attributes, categoryFilters);
    }

    // 6. Extract remaining keywords
    result.keywords = this.extractKeywords(message, result);

    // 7. Calculate confidence
    result.confidence = this.calculateConfidence(result);

    console.log('📊 [ANALYZER] Analysis result:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Find all categories matching the search term
   * Instead of stopping at first match, collect ALL matches for ranking
   * @param {string} searchTerm - Term to search for
   * @returns {Array} Array of matching categories with match type
   */
  findAllCategoryMatches(searchTerm) {
    const results = [];
    const lowerSearch = searchTerm.toLowerCase().trim();

    // 1. FIRST: Check our keyword mappings for LEAF categories
    // This ensures we always prefer specific categories like "houses" over "real-estate"
    if (this.keywordToCategory[lowerSearch]) {
      const leafCategorySlug = this.keywordToCategory[lowerSearch];
      console.log(`🎯 [ANALYZER] Keyword "${lowerSearch}" maps to LEAF category: ${leafCategorySlug}`);

      results.push({
        slug: leafCategorySlug,
        names: [lowerSearch],
        name: lowerSearch,
        level: 2, // Assume leaf categories are at level 2
        hasChildren: false, // This is a LEAF category
        matchType: 'keyword_mapping',
        matchScore: 25 // High priority for keyword mappings
      });
    }

    if (!dynamicDataManager.searchIndex?.categories) {
      console.log('⚠️ [ANALYZER] No search index available');
      return results;
    }

    // Search in indexed categories
    for (const cat of dynamicDataManager.searchIndex.categories) {
      let matchType = null;
      let matchScore = 0;

      // Exact match on names (highest priority)
      if (cat.names.includes(lowerSearch)) {
        matchType = 'exact_name';
        matchScore = 20;
      }
      // Exact match on slug
      else if (cat.slug === lowerSearch) {
        matchType = 'exact_slug';
        matchScore = 18;
      }
      // Partial match - name contains search term
      else if (cat.names.some(name => name.includes(lowerSearch))) {
        matchType = 'partial_name';
        matchScore = 12;
      }
      // Partial match - search term contains name
      else if (cat.names.some(name => lowerSearch.includes(name) && name.length > 2)) {
        matchType = 'reverse_partial';
        matchScore = 10;
      }
      // Slug contains search term
      else if (cat.slug.includes(lowerSearch)) {
        matchType = 'partial_slug';
        matchScore = 8;
      }

      if (matchType) {
        // Get full category data from categoryMaps
        const fullCat = dynamicDataManager.categoryMaps?.bySlug.get(cat.slug);

        // Determine if leaf category (no children)
        const hasChildren = fullCat?.children?.length > 0 || false;

        results.push({
          slug: cat.slug,
          names: cat.names,
          name: cat.names[0],
          name_ar: fullCat?.name_ar,
          name_en: fullCat?.name_en,
          level: cat.level || 0,
          parent: cat.parent ? { slug: cat.parent } : fullCat?.parent,
          hasChildren: hasChildren,
          listingCount: fullCat?.listingCount || 0,
          matchType: matchType,
          matchScore: matchScore
        });
      }
    }

    return results;
  }

  /**
   * Rank categories by relevance and specificity
   * Prioritizes LEAF categories (most specific) over root/parent categories
   * @param {Array} categories - Categories to rank
   * @returns {Array} Sorted categories with confidence scores
   */
  rankCategories(categories) {
    if (!categories || categories.length === 0) return [];

    // Remove duplicates (same slug)
    const uniqueCategories = categories.filter((cat, index, self) =>
      index === self.findIndex(c => c.slug === cat.slug)
    );

    console.log(`📊 [RANK] Ranking ${uniqueCategories.length} unique categories...`);

    // Calculate confidence for each category
    const ranked = uniqueCategories.map(cat => {
      let confidence = 40; // Base confidence

      // 1. CRITICAL: Leaf categories get HIGHEST priority (NO children = most specific)
      if (!cat.hasChildren) {
        confidence += 35; // Big bonus for leaf categories
        console.log(`  ✅ [RANK] ${cat.slug} is LEAF category +35`);
      } else {
        console.log(`  ⚠️ [RANK] ${cat.slug} has children (NOT leaf)`);
      }

      // 2. Level bonus (deeper = more specific)
      const levelBonus = (cat.level || 0) * 10;
      confidence += levelBonus;

      // 3. Match type bonus
      if (cat.matchScore) {
        confidence += cat.matchScore;
      }

      // 4. Listing count bonus (active categories)
      if (cat.listingCount && cat.listingCount > 0) {
        const listingBonus = Math.min(cat.listingCount / 100, 10);
        confidence += listingBonus;
      }

      return { ...cat, confidence: Math.round(confidence) };
    });

    // Sort by confidence (highest first)
    const sorted = ranked.sort((a, b) => b.confidence - a.confidence);

    // Log top 5 for debugging
    console.log('🏆 [RANK] Top ranked categories:');
    sorted.slice(0, 5).forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat.slug} (${cat.confidence}% conf, level: ${cat.level}, leaf: ${!cat.hasChildren})`);
    });

    return sorted;
  }

  /**
   * Extract category from message
   * NEW: Collects ALL matches and ranks them, preferring LEAF categories
   */
  async extractCategory(message, language) {
    const words = message.toLowerCase().split(/\s+/);
    const matches = [];

    console.log('🔍 [EXTRACT-CAT] Analyzing message for categories...');

    // 1. Local search - collect ALL matches from single words
    for (const word of words) {
      if (word.length < 2) continue;

      const found = this.findAllCategoryMatches(word);
      if (found.length > 0) {
        console.log(`  📝 Found ${found.length} matches for "${word}"`);
        matches.push(...found);
      }
    }

    // 2. Compound search (two words together) - often more specific
    for (let i = 0; i < words.length - 1; i++) {
      const compound = `${words[i]} ${words[i + 1]}`;
      const found = this.findAllCategoryMatches(compound);
      if (found.length > 0) {
        console.log(`  📝 Found ${found.length} matches for compound "${compound}"`);
        // Compound matches get extra score
        found.forEach(f => { f.matchScore += 5; });
        matches.push(...found);
      }
    }

    // 3. Rank all collected matches
    if (matches.length > 0) {
      console.log(`📊 [EXTRACT-CAT] Ranking ${matches.length} total matches...`);
      const ranked = this.rankCategories(matches);

      if (ranked.length > 0) {
        const best = ranked[0];

        console.log(`✅ [EXTRACT-CAT] Selected: ${best.slug} (${best.confidence}% confidence)`);
        console.log(`   └─ isLeaf: ${!best.hasChildren}, level: ${best.level}`);

        return {
          slug: best.slug,
          name: best.name || best.name_ar || best.name_en,
          level: best.level || 0,
          parent: best.parent?.slug || null,
          isLeaf: !best.hasChildren,
          hasChildren: best.hasChildren,
          confidence: best.confidence,
          allMatches: ranked.slice(0, 5) // Keep top 5 alternatives
        };
      }
    }

    // 4. API search as fallback (if not found locally)
    console.log('🌐 [EXTRACT-CAT] No local matches, trying API search...');
    for (const word of words) {
      if (word.length < 3) continue;

      try {
        const apiResults = await dynamicDataManager.searchCategories(word, language);
        if (apiResults && apiResults.length > 0) {
          console.log(`  ✅ API returned ${apiResults.length} results for "${word}"`);

          // Enhance API results with hasChildren info and rank them
          const enhancedResults = apiResults.map(cat => ({
            ...cat,
            hasChildren: cat.children?.length > 0 || cat.hasChildren || false,
            matchType: 'api_search',
            matchScore: 10
          }));

          const ranked = this.rankCategories(enhancedResults);

          if (ranked.length > 0) {
            const best = ranked[0];
            console.log(`✅ [EXTRACT-CAT] Selected from API: ${best.slug} (${best.confidence}% confidence)`);

            return {
              slug: best.slug,
              name: best.name,
              level: best.level || 0,
              parent: best.parent?.slug || null,
              isLeaf: !best.hasChildren,
              hasChildren: best.hasChildren,
              confidence: best.confidence,
              allMatches: ranked.slice(0, 5)
            };
          }
        }
      } catch (error) {
        console.error(`❌ [EXTRACT-CAT] API search error for "${word}":`, error.message);
      }
    }

    console.log('❌ [EXTRACT-CAT] No category found');
    return null;
  }

  /**
   * Extract transaction type
   */
  extractTransactionType(message) {
    if (this.transactionPatterns.sale.test(message)) {
      return 'for-sale';
    }
    if (this.transactionPatterns.rent.test(message)) {
      return 'for-rent';
    }
    return null;
  }

  /**
   * Extract location
   */
  extractLocation(message) {
    const words = message.toLowerCase().split(/\s+/);

    for (const word of words) {
      if (word.length < 2) continue;

      const found = dynamicDataManager.findLocationLocally(word);
      if (found) {
        return {
          name: found.names[0],
          type: found.type,
          id: found.id
        };
      }
    }

    return null;
  }

  /**
   * Extract basic filters (numbers)
   */
  extractBasicFilters(message) {
    const filters = {};

    // Price with unit
    let match = this.numberPatterns.priceWithUnit.exec(message);
    if (match) {
      let value = parseFloat(match[1].replace(/[,،]/g, ''));
      const unit = match[2].toLowerCase();

      if (unit.includes('مليون')) value *= 1000000;
      else if (unit.includes('ألف')) value *= 1000;

      filters.price = { value };
    }

    // Price with keyword
    this.numberPatterns.priceWithKeyword.lastIndex = 0;
    match = this.numberPatterns.priceWithKeyword.exec(message);
    if (match && !filters.price) {
      filters.price = { value: parseFloat(match[1].replace(/[,،]/g, '')) };
    }

    // Area
    this.numberPatterns.area.lastIndex = 0;
    match = this.numberPatterns.area.exec(message);
    if (match) {
      filters.area = { value: parseInt(match[1]) };
    }

    // Rooms
    this.numberPatterns.rooms.lastIndex = 0;
    match = this.numberPatterns.rooms.exec(message);
    if (match) {
      filters.rooms = parseInt(match[1]);
    }

    // Bathrooms
    this.numberPatterns.bathrooms.lastIndex = 0;
    match = this.numberPatterns.bathrooms.exec(message);
    if (match) {
      filters.bathrooms = parseInt(match[1]);
    }

    // Year
    this.numberPatterns.year.lastIndex = 0;
    match = this.numberPatterns.year.exec(message);
    if (match) {
      filters.year = parseInt(match[1]);
    }

    // Mileage
    this.numberPatterns.mileage.lastIndex = 0;
    match = this.numberPatterns.mileage.exec(message);
    if (match) {
      filters.mileage = parseInt(match[1].replace(/[,،]/g, ''));
    }

    // Ranges
    this.numberPatterns.range.lastIndex = 0;
    match = this.numberPatterns.range.exec(message);
    if (match) {
      const min = parseFloat(match[1].replace(/[,،]/g, ''));
      const max = parseFloat(match[2].replace(/[,،]/g, ''));

      // Determine if price or area
      if (max > 10000) {
        filters.price = { min, max };
      } else {
        filters.area = { min, max };
      }
    }

    // Less than
    this.numberPatterns.lessThan.lastIndex = 0;
    match = this.numberPatterns.lessThan.exec(message);
    if (match) {
      const value = parseFloat(match[1].replace(/[,،]/g, ''));
      if (value > 10000) {
        if (!filters.price) filters.price = {};
        filters.price.max = value;
      }
    }

    // More than
    this.numberPatterns.moreThan.lastIndex = 0;
    match = this.numberPatterns.moreThan.exec(message);
    if (match) {
      const value = parseFloat(match[1].replace(/[,،]/g, ''));
      if (value > 10000) {
        if (!filters.price) filters.price = {};
        filters.price.min = value;
      }
    }

    // Condition
    for (const [condition, pattern] of Object.entries(this.conditionPatterns)) {
      if (pattern.test(message)) {
        filters.condition = condition;
        break;
      }
    }

    // Boolean filters
    for (const [attr, patterns] of Object.entries(this.booleanPatterns)) {
      if (patterns.negative?.test(message)) {
        filters[attr] = false;
      } else if (patterns.positive.test(message)) {
        filters[attr] = true;
      }
    }

    return filters;
  }

  /**
   * Extract category-specific filters (from API)
   */
  async extractCategorySpecificFilters(message, categorySlug, language) {
    const filters = {};

    // Get category filters
    const filterData = await dynamicDataManager.getCategoryFilters(categorySlug, language);
    if (!filterData?.filters?.attributes) return filters;

    const lowerMessage = message.toLowerCase();

    for (const attr of filterData.filters.attributes) {
      // Skip already extracted filters
      if (['price', 'area', 'rooms', 'bathrooms', 'year', 'mileage'].includes(attr.slug)) {
        continue;
      }

      // Search for filter name in message
      const attrNames = [attr.name, attr.slug].filter(Boolean).map(n => n.toLowerCase());
      const mentioned = attrNames.some(name => lowerMessage.includes(name));

      if (!mentioned && attr.type !== 'select') continue;

      // Extract value based on type
      switch (attr.type) {
        case 'select':
          // Search in options
          if (attr.options?.length) {
            for (const option of attr.options) {
              const optionLabel = (option.label || option.value || option).toLowerCase();
              if (lowerMessage.includes(optionLabel)) {
                filters[attr.slug] = option.value || option;
                break;
              }
            }
          }
          break;

        case 'multiselect':
          if (attr.options?.length) {
            const matched = [];
            for (const option of attr.options) {
              const optionLabel = (option.label || option.value || option).toLowerCase();
              if (lowerMessage.includes(optionLabel)) {
                matched.push(option.value || option);
              }
            }
            if (matched.length > 0) {
              filters[attr.slug] = matched;
            }
          }
          break;

        case 'number':
          // Try to extract number near filter name
          for (const name of attrNames) {
            const pattern = new RegExp(`${name}\\s*(\\d+)|(\\d+)\\s*${name}`, 'gi');
            const match = pattern.exec(message);
            if (match) {
              filters[attr.slug] = parseInt(match[1] || match[2]);
              break;
            }
          }
          break;

        case 'boolean':
          if (mentioned) {
            filters[attr.slug] = true;
          }
          break;
      }
    }

    return filters;
  }

  /**
   * Extract remaining keywords
   */
  extractKeywords(message, result) {
    // Remove extracted words
    let remaining = message.toLowerCase();

    // Remove numbers
    remaining = remaining.replace(/\d+/g, '');

    // Remove filter words
    const wordsToRemove = [
      'غرف', 'غرفة', 'حمام', 'متر', 'سنة', 'موديل',
      'للبيع', 'للإيجار', 'مفروش', 'جديد', 'مستعمل',
      'في', 'من', 'إلى', 'أقل', 'أكثر', 'تحت', 'فوق'
    ];

    for (const word of wordsToRemove) {
      remaining = remaining.replace(new RegExp(word, 'gi'), '');
    }

    // Remove category name
    if (result.category?.name) {
      remaining = remaining.replace(new RegExp(result.category.name, 'gi'), '');
    }

    // Remove location name
    if (result.location?.name) {
      remaining = remaining.replace(new RegExp(result.location.name, 'gi'), '');
    }

    // Extract remaining words
    const keywords = remaining
      .split(/\s+/)
      .filter(w => w.length > 2)
      .filter(w => !['و', 'أو', 'the', 'and', 'or'].includes(w));

    return [...new Set(keywords)];
  }

  /**
   * Calculate confidence level
   */
  calculateConfidence(result) {
    let score = 0;

    if (result.category) score += 30;
    if (result.transactionType) score += 15;
    if (result.location) score += 20;
    if (Object.keys(result.attributes).length > 0) {
      score += Math.min(Object.keys(result.attributes).length * 5, 25);
    }
    if (result.keywords.length > 0) score += 10;

    return Math.min(score, 100);
  }
}

module.exports = new MessageAnalyzer();
