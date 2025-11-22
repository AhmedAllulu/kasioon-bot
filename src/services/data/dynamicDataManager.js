const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Dynamic Data Manager
 * Fetches all data from API and caches it temporarily
 * Contains NO static data - everything is fetched dynamically
 */
class DynamicDataManager {
  constructor() {
    this.apiUrl = process.env.KASIOON_API_URL;
    this.apiKey = process.env.KASIOON_API_KEY;

    // Cache storage
    this.cache = {
      structure: null,
      categories: null,
      categoryFilters: new Map(),
      lastUpdate: {}
    };

    // Cache TTL (30 minutes)
    this.cacheTTL = 30 * 60 * 1000;

    // Search indexes for fast lookup
    this.searchIndex = null;
    this.categoryMaps = null;
  }

  /**
   * Load complete structure (categories + locations + transactionTypes)
   * Called on bot startup and refreshed every 30 minutes
   */
  async loadStructure(language = 'ar') {
    const cacheKey = `structure_${language}`;

    // Check cache validity
    if (this.cache.structure && this.isCacheValid(cacheKey)) {
      console.log('📦 [DATA] Using cached structure');
      return this.cache.structure;
    }

    try {
      console.log('🔄 [DATA] Loading structure from API...');

      const response = await axios.get(`${this.apiUrl}/api/search/structure`, {
        params: { language },
        headers: this.getHeaders(),
        timeout: 15000
      });

      if (response.data?.success && response.data?.data) {
        this.cache.structure = response.data.data;
        this.cache.lastUpdate[cacheKey] = Date.now();

        // Build search indexes for fast lookup
        this.buildSearchIndexes();

        console.log('✅ [DATA] Structure loaded successfully');
        console.log(`   📁 Categories: ${this.cache.structure.categories?.length || 0}`);
        console.log(`   📍 Locations: ${this.cache.structure.locations?.length || 0}`);

        return this.cache.structure;
      }

      throw new Error('Invalid structure response');
    } catch (error) {
      console.error('❌ [DATA] Error loading structure:', error.message);

      // Return stale cache if available
      if (this.cache.structure) {
        console.log('⚠️  [DATA] Using stale cache');
        return this.cache.structure;
      }

      throw error;
    }
  }

  /**
   * Get categories tree
   */
  async getCategories(language = 'ar') {
    const cacheKey = `categories_${language}`;

    if (this.cache.categories && this.isCacheValid(cacheKey)) {
      return this.cache.categories;
    }

    try {
      const response = await axios.get(`${this.apiUrl}/api/categories`, {
        params: { type: 'tree', language },
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (response.data?.success && response.data?.data?.categories) {
        this.cache.categories = response.data.data.categories;
        this.cache.lastUpdate[cacheKey] = Date.now();

        // Build category lookup maps
        this.buildCategoryMaps(this.cache.categories);

        return this.cache.categories;
      }

      throw new Error('Invalid categories response');
    } catch (error) {
      console.error('❌ [DATA] Error loading categories:', error.message);
      if (this.cache.categories) return this.cache.categories;
      throw error;
    }
  }

  /**
   * Get filters for specific category
   */
  async getCategoryFilters(categorySlug, language = 'ar') {
    const cacheKey = `filters_${categorySlug}_${language}`;

    if (this.cache.categoryFilters.has(cacheKey)) {
      const cached = this.cache.categoryFilters.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    try {
      console.log(`🔄 [DATA] Loading filters for: ${categorySlug}`);

      const response = await axios.get(
        `${this.apiUrl}/api/search/filters/${categorySlug}`,
        {
          params: { language, includeValueRanges: true, includePopularValues: true },
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      if (response.data?.success && response.data?.data) {
        const filterData = response.data.data;

        this.cache.categoryFilters.set(cacheKey, {
          data: filterData,
          timestamp: Date.now()
        });

        console.log(`✅ [DATA] Loaded ${filterData.filters?.attributes?.length || 0} filters for ${categorySlug}`);
        return filterData;
      }

      throw new Error('Invalid filters response');
    } catch (error) {
      console.error(`❌ [DATA] Error loading filters for ${categorySlug}:`, error.message);
      return null;
    }
  }

  /**
   * Search categories by name (directly from API)
   */
  async searchCategories(searchTerm, language = 'ar') {
    try {
      const response = await axios.get(
        `${this.apiUrl}/api/categories/search/${encodeURIComponent(searchTerm)}`,
        {
          params: { language },
          headers: this.getHeaders(),
          timeout: 5000
        }
      );

      if (response.data?.success && response.data?.data?.categories) {
        return response.data.data.categories;
      }

      return [];
    } catch (error) {
      console.error('❌ [DATA] Error searching categories:', error.message);
      return [];
    }
  }

  /**
   * Build category lookup maps from fetched data
   */
  buildCategoryMaps(categories, parent = null) {
    if (!this.categoryMaps) {
      this.categoryMaps = {
        bySlug: new Map(),
        byId: new Map(),
        byNameAr: new Map(),
        byNameEn: new Map(),
        allNames: []
      };
    }

    for (const cat of categories) {
      const entry = { ...cat, parent };

      this.categoryMaps.bySlug.set(cat.slug, entry);
      this.categoryMaps.byId.set(cat.id, entry);

      if (cat.name_ar) {
        this.categoryMaps.byNameAr.set(cat.name_ar.toLowerCase(), entry);
        this.categoryMaps.allNames.push({
          name: cat.name_ar.toLowerCase(),
          slug: cat.slug,
          lang: 'ar'
        });
      }

      if (cat.name_en) {
        this.categoryMaps.byNameEn.set(cat.name_en.toLowerCase(), entry);
        this.categoryMaps.allNames.push({
          name: cat.name_en.toLowerCase(),
          slug: cat.slug,
          lang: 'en'
        });
      }

      // Handle localized name field
      if (cat.name && cat.name !== cat.name_ar && cat.name !== cat.name_en) {
        this.categoryMaps.allNames.push({
          name: cat.name.toLowerCase(),
          slug: cat.slug
        });
      }

      if (cat.children?.length > 0) {
        this.buildCategoryMaps(cat.children, entry);
      }
    }
  }

  /**
   * Build search indexes for fast lookup
   */
  buildSearchIndexes() {
    if (!this.cache.structure) return;

    this.searchIndex = {
      categories: [],
      locations: [],
      transactionTypes: []
    };

    // Index categories
    const indexCategories = (cats, parent = null) => {
      for (const cat of cats) {
        this.searchIndex.categories.push({
          id: cat.id,
          slug: cat.slug,
          names: [cat.name, cat.name_ar, cat.name_en].filter(Boolean).map(n => n.toLowerCase()),
          level: cat.level,
          parent: parent?.slug
        });

        if (cat.children?.length) {
          indexCategories(cat.children, cat);
        }
      }
    };

    if (this.cache.structure.categories) {
      indexCategories(this.cache.structure.categories);
    }

    // Index locations
    if (this.cache.structure.locations) {
      for (const loc of this.cache.structure.locations) {
        this.searchIndex.locations.push({
          id: loc.id,
          names: [loc.name, loc.name_ar, loc.name_en].filter(Boolean).map(n => n.toLowerCase()),
          type: loc.type
        });
      }
    }

    console.log(`📇 [DATA] Built search indexes: ${this.searchIndex.categories.length} categories, ${this.searchIndex.locations.length} locations`);
  }

  /**
   * Find category locally (from cache)
   */
  findCategoryLocally(searchTerm) {
    if (!this.searchIndex?.categories) return null;

    const term = searchTerm.toLowerCase().trim();

    // Exact match first
    for (const cat of this.searchIndex.categories) {
      if (cat.names.includes(term) || cat.slug === term) {
        return this.categoryMaps?.bySlug.get(cat.slug);
      }
    }

    // Partial match
    for (const cat of this.searchIndex.categories) {
      if (cat.names.some(name => name.includes(term) || term.includes(name))) {
        return this.categoryMaps?.bySlug.get(cat.slug);
      }
    }

    return null;
  }

  /**
   * Find location locally (from cache)
   */
  findLocationLocally(searchTerm) {
    if (!this.searchIndex?.locations) return null;

    const term = searchTerm.toLowerCase().trim();

    // Exact match
    for (const loc of this.searchIndex.locations) {
      if (loc.names.includes(term)) {
        return loc;
      }
    }

    // Partial match
    for (const loc of this.searchIndex.locations) {
      if (loc.names.some(name => name.includes(term) || term.includes(name))) {
        return loc;
      }
    }

    return null;
  }

  /**
   * Check cache validity
   */
  isCacheValid(cacheKey) {
    const lastUpdate = this.cache.lastUpdate[cacheKey];
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate) < this.cacheTTL;
  }

  /**
   * Get headers for API requests
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Refresh cache (can be called periodically)
   */
  async refreshCache(language = 'ar') {
    console.log('🔄 [DATA] Refreshing cache...');

    // Clear cache timestamps
    this.cache.lastUpdate = {};

    // Reload data
    await this.loadStructure(language);
    await this.getCategories(language);

    console.log('✅ [DATA] Cache refreshed');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      hasStructure: !!this.cache.structure,
      hasCategories: !!this.cache.categories,
      filtersCount: this.cache.categoryFilters.size,
      categoriesIndexed: this.searchIndex?.categories?.length || 0,
      locationsIndexed: this.searchIndex?.locations?.length || 0,
      lastUpdates: this.cache.lastUpdate
    };
  }
}

module.exports = new DynamicDataManager();
