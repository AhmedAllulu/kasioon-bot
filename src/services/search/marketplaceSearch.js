const axios = require('axios');
const logger = require('../../utils/logger');
const cache = require('../cache');

/**
 * Kasioon Marketplace Search Service
 * Searches across all categories on kasioon.com marketplace
 * 
 * API Documentation: Based on Kasioon Search Listings API v1.0
 * Base URL: /api
 */

class MarketplaceSearchService {
  constructor() {
    // Get base URL from environment, default to localhost with port 3850
    let baseUrl = process.env.KASIOON_API_URL || 'http://localhost:3850';
    
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Remove any /api paths from the URL (we'll add them correctly)
    // This prevents double /api/search/api/search/listings
    baseUrl = baseUrl.replace(/\/api\/?.*$/, '');
    
    // If no protocol specified, add http://
    if (!baseUrl.match(/^https?:\/\//)) {
      baseUrl = `http://${baseUrl}`;
    }
    
    // Only add default port if URL doesn't already have a port specified
    // Don't force port 3850 if a full URL with port is provided
    if (!baseUrl.match(/:\d+(\/|$)/)) {
      // No port specified, add default port 3850 only for localhost
      if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        baseUrl = baseUrl.replace(/:\d+$/, '') + ':3850';
      }
    }
    
    this.apiUrl = baseUrl;
    this.apiKey = process.env.KASIOON_API_KEY;
    this.language = process.env.KASIOON_API_LANGUAGE || 'ar'; // Default to Arabic
    
    // Get protocol safely
    let protocol = 'unknown';
    try {
      protocol = new URL(this.apiUrl).protocol;
    } catch (e) {
      console.warn('⚠️  [SEARCH] Could not parse API URL:', e.message);
    }
    
    console.log('🔧 [SEARCH] MarketplaceSearchService initialized:', {
      apiUrl: this.apiUrl,
      hasApiKey: !!this.apiKey,
      language: this.language,
      protocol: protocol
    });
    
    // Warn if using placeholder URL
    if (this.apiUrl.includes('your-kasioon-api-url') || this.apiUrl.includes('example.com')) {
      console.warn('⚠️  [SEARCH] WARNING: Using placeholder API URL!');
      console.warn('⚠️  [SEARCH] Please set KASIOON_API_URL in .env file');
      console.warn('⚠️  [SEARCH] Example: KASIOON_API_URL=https://chato-app.com:3850');
    }
    
    // Warn if API key is not set but URL is configured
    if (!this.apiKey && !this.apiUrl.includes('localhost') && !this.apiUrl.includes('127.0.0.1')) {
      console.warn('⚠️  [SEARCH] WARNING: API URL is configured but KASIOON_API_KEY is not set!');
      console.warn('⚠️  [SEARCH] Some features may be limited without authentication.');
    }
  }

  /**
   * Search for listings across all marketplace categories
   * Uses GET /api/search/listings endpoint
   * 
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Search results (listings array)
   */
  async search(params) {
    try {
      console.log('🔍 [SEARCH] Starting marketplace search...');
      console.log('📋 [SEARCH] Input parameters:', JSON.stringify(params, null, 2));
      
      // Check cache first
      const cacheKey = `search:${JSON.stringify(params)}`;
      console.log('💾 [SEARCH] Checking cache with key:', cacheKey.substring(0, 50) + '...');
      
      const cachedResults = await cache.get(cacheKey);
      
      if (cachedResults) {
        logger.info('Returning cached search results');
        const parsed = JSON.parse(cachedResults);
        return parsed;
      }
      
      console.log('❌ [SEARCH] Cache miss, proceeding with API call');

      // Normalize parameters for API
      console.log('🔄 [SEARCH] Normalizing parameters...');
      const searchParams = this.normalizeParams(params);
      console.log('📋 [SEARCH] Normalized parameters:', JSON.stringify(searchParams, null, 2));

      // Check if API URL is configured
      if (!this.apiUrl) {
        console.error('❌ [SEARCH] API URL not configured!');
        throw new Error('Kasioon API URL not configured. Please set KASIOON_API_URL in .env');
      }

      // Build query string
      const queryParams = new URLSearchParams();
      
      // Add all search parameters
      Object.keys(searchParams).forEach(key => {
        const value = searchParams[key];
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object') {
            // For nested objects like attributes, stringify them
            queryParams.append(key, JSON.stringify(value));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      // Add language
      queryParams.append('language', this.language);

      // Build endpoint - API base URL + /api/search/listings
      const endpoint = `${this.apiUrl}/api/search/listings`;
      const fullUrl = `${endpoint}?${queryParams.toString()}`;
      
      console.log('🔗 [SEARCH] Constructed endpoint:', endpoint);

      console.log('🌐 [SEARCH] Making API request...');
      console.log('📍 [SEARCH] Endpoint:', endpoint);
      console.log('🔗 [SEARCH] Full URL:', fullUrl.substring(0, 150) + '...');
      
      // Prepare headers (authentication is optional per API docs)
      const headers = {
        'Accept': 'application/json'
      };
      
      // Check if API key is actually set (not empty, not placeholder)
      const hasValidApiKey = this.apiKey && 
                              this.apiKey.trim() !== '' &&
                              this.apiKey !== 'your_api_key_here' &&
                              !this.apiKey.includes('your_') &&
                              !this.apiKey.includes('your-api-key');
      
      // Add authorization ONLY if valid API key is provided (optional auth)
      if (hasValidApiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        console.log('🔑 [SEARCH] Using API key authentication');
      } else {
        console.log('ℹ️  [SEARCH] No API key - using unauthenticated access (OK - auth is optional per API docs)');
      }

      // Debug: Log full request configuration
      console.log('🔧 [SEARCH] Request configuration:', {
        method: 'GET',
        url: fullUrl,
        headers: headers,
        timeout: 15000,
        baseURL: this.apiUrl,
        validateStatus: 'default'
      });
      
      // Debug: Log axios instance details
      console.log('🔧 [SEARCH] Axios defaults:', {
        timeout: axios.defaults.timeout,
        baseURL: axios.defaults.baseURL,
        headers: axios.defaults.headers
      });
      
      // Debug: Check if URL is valid
      try {
        const urlObj = new URL(fullUrl);
        console.log('🔍 [SEARCH] URL parsed successfully:', {
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          port: urlObj.port,
          pathname: urlObj.pathname,
          search: urlObj.search.substring(0, 100) + '...'
        });
      } catch (urlError) {
        console.error('❌ [SEARCH] Invalid URL format:', urlError.message);
      }
      
      const startTime = Date.now();
      console.log('⏱️  [SEARCH] Request start time:', new Date(startTime).toISOString());
      
      let response;
      try {
        response = await axios.get(fullUrl, {
          headers: headers,
          timeout: 15000
        });
      } catch (axiosError) {
        const requestDuration = Date.now() - startTime;
        console.error('❌ [SEARCH] Axios request failed:', {
          message: axiosError.message,
          code: axiosError.code,
          errno: axiosError.errno,
          syscall: axiosError.syscall,
          address: axiosError.address,
          port: axiosError.port,
          config: {
            url: axiosError.config?.url,
            method: axiosError.config?.method,
            headers: axiosError.config?.headers,
            timeout: axiosError.config?.timeout
          },
          requestDuration: requestDuration + 'ms',
          stack: axiosError.stack?.split('\n').slice(0, 5).join('\n')
        });
        throw axiosError;
      }
      
      const duration = Date.now() - startTime;

      console.log('✅ [SEARCH] API response received!');
      console.log('⏱️  [SEARCH] Request duration:', duration + 'ms');
      console.log('📊 [SEARCH] Response status:', response.status);
      console.log('📦 [SEARCH] Response structure:', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        hasListings: !!response.data?.data?.listings,
        listingsCount: response.data?.data?.listings?.length || 0
      });

      // DEBUG: Log full API response for analysis
      console.log('\n🔍 [DEBUG] ========== FULL API RESPONSE ==========');
      console.log('📦 [DEBUG] Full response.data:', JSON.stringify(response.data, null, 2));
      console.log('🔍 [DEBUG] =========================================\n');

      // Extract listings from response
      // Response format: { success: true, data: { listings: [...], pagination: {...} } }
      const listings = response.data?.data?.listings || [];
      const pagination = response.data?.data?.pagination || {};

      // Cache results for 5 minutes
      await cache.set(cacheKey, JSON.stringify(listings), 300);

      logger.info(`Found ${listings.length} listings`);
      console.log('✅ [SEARCH] Search complete!');
      return listings;

    } catch (error) {
      // Enhanced error debugging
      const errorDetails = {
        message: error.message,
        code: error.code,
        name: error.name,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        params: params,
        timestamp: new Date().toISOString()
      };
      
      // Add connection-specific error details
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        errorDetails.connectionError = {
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          address: error.address || error.hostname,
          port: error.port,
          targetUrl: this.apiUrl,
          endpoint: `${this.apiUrl}/api/search/listings`
        };
        
        console.error('🔌 [SEARCH] Connection error details:', errorDetails.connectionError);
        console.error('💡 [SEARCH] Troubleshooting tips:');
        console.error('   1. Check if API server is running on', this.apiUrl);
        console.error('   2. Verify KASIOON_API_URL environment variable');
        console.error('   3. Check firewall/network connectivity');
        console.error('   4. Ensure the API service is listening on the correct port');
      }
      
      // Add request configuration details
      if (error.config) {
        errorDetails.requestConfig = {
          url: error.config.url,
          method: error.config.method,
          baseURL: error.config.baseURL,
          headers: error.config.headers,
          timeout: error.config.timeout,
          params: error.config.params
        };
        console.error('📤 [SEARCH] Failed request config:', errorDetails.requestConfig);
      }
      
      // Add stack trace for debugging
      if (error.stack) {
        console.error('📚 [SEARCH] Error stack trace:', error.stack.split('\n').slice(0, 10).join('\n'));
      }
      
      console.error('❌ [SEARCH] Error searching marketplace:', errorDetails);
      
      if (error.response) {
        console.error('📄 [SEARCH] Error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        });
      } else if (!error.response && error.request) {
        console.error('📡 [SEARCH] Request was made but no response received:', {
          requestMade: true,
          responseReceived: false,
          timeout: error.code === 'ETIMEDOUT'
        });
      }
      
      logger.error('Error searching marketplace:', {
        message: error.message,
        code: error.code,
        params,
        response: error.response?.data
      });
      throw new Error('Failed to search marketplace. Please try again later.');
    }
  }

  /**
   * Normalize search parameters to match Kasioon API format
   * 
   * @param {Object} params - Raw parameters from AI analysis
   * @returns {Object} Normalized parameters for API
   */
  normalizeParams(params) {
    console.log('🔄 [NORMALIZE] Starting parameter normalization...');
    console.log('📥 [NORMALIZE] Input:', JSON.stringify(params, null, 2));

    const normalized = {};

    // Category filtering - support both 'category' and 'categorySlug' field names
    const categoryInput = params.category || params.categorySlug;
    if (categoryInput) {
      const categoryMap = {
        'vehicles': 'vehicles',
        'real-estate': 'real-estate',
        'electronics': 'electronics',
        'furniture': 'furniture',
        'fashion': 'fashion',
        'services': 'services',
        'cars': 'vehicles',
        'apartments': 'apartments',
        'houses': 'houses',
        'villas': 'villas'
      };
      normalized.categorySlug = categoryMap[categoryInput.toLowerCase()] || categoryInput;
      console.log(`📂 [NORMALIZE] Category detected: "${categoryInput}" → "${normalized.categorySlug}"`);
    }

    // ============================================================================
    // FIXED LOCATION FILTERING
    // ============================================================================
    if (params.city) {
      // Province mapping (Arabic & English → English)
      const provinceMap = {
        'Aleppo': 'Aleppo',
        'Damascus': 'Damascus',
        'Rif Dimashq': 'Rif Dimashq',
        'Homs': 'Homs',
        'Hama': 'Hama',
        'Latakia': 'Latakia',
        'Idlib': 'Idlib',
        'Tartus': 'Tartus',
        'Daraa': 'Daraa',
        'As-Suwayda': 'As-Suwayda',
        'Deir ez-Zor': 'Deir ez-Zor',
        'Hasakah': 'Hasakah',
        'Al-Hasakah': 'Hasakah',
        'Raqqa': 'Raqqa',
        'Ar-Raqqah': 'Raqqa',
        'Quneitra': 'Quneitra',

        // Arabic names
        'حلب': 'Aleppo',
        'دمشق': 'Damascus',
        'ريف دمشق': 'Rif Dimashq',
        'حمص': 'Homs',
        'حماة': 'Hama',
        'حماه': 'Hama',
        'اللاذقية': 'Latakia',
        'إدلب': 'Idlib',
        'ادلب': 'Idlib',
        'طرطوس': 'Tartus',
        'درعا': 'Daraa',
        'السويداء': 'As-Suwayda',
        'دير الزور': 'Deir ez-Zor',
        'ديرالزور': 'Deir ez-Zor',
        'الحسكة': 'Hasakah',
        'الرقة': 'Raqqa',
        'القنيطرة': 'Quneitra',

        // Common aliases
        'الشام': 'Damascus',
        'dimashq': 'Damascus',
        'halab': 'Aleppo',
        'haleb': 'Aleppo',
        'hims': 'Homs',
        'lattakia': 'Latakia',
        'ladhiqiyah': 'Latakia',
        'hamah': 'Hama',
        'tartous': 'Tartus',
        'deir ezzor': 'Deir ez-Zor',

        // Lowercase English
        'aleppo': 'Aleppo',
        'damascus': 'Damascus',
        'rif dimashq': 'Rif Dimashq',
        'homs': 'Homs',
        'hama': 'Hama',
        'latakia': 'Latakia',
        'idlib': 'Idlib',
        'tartus': 'Tartus',
        'daraa': 'Daraa',
        'as-suwayda': 'As-Suwayda',
        'deir ez-zor': 'Deir ez-Zor',
        'hasakah': 'Hasakah',
        'raqqa': 'Raqqa',
        'quneitra': 'Quneitra'
      };

      const cityInput = params.city.trim();
      const cityLower = cityInput.toLowerCase();
      let matchedProvince = null;

      if (provinceMap[cityInput]) matchedProvince = provinceMap[cityInput];
      else if (provinceMap[cityLower]) matchedProvince = provinceMap[cityLower];
      else {
        for (const [key, eng] of Object.entries(provinceMap)) {
          if (key.toLowerCase() === cityLower || cityInput.includes(key) || key.includes(cityInput)) {
            matchedProvince = eng;
            break;
          }
        }
      }

      if (matchedProvince) {
        normalized.province = matchedProvince;
        console.log(`🌍 [NORMALIZE] Province detected: "${cityInput}" → English: "${matchedProvince}" (province-level search)`);
      } else {
        normalized.cityName = cityInput;
        console.log(`🏙️  [NORMALIZE] City search: "${cityInput}"`);

        if (cityInput.includes(' ')) {
          const words = cityInput.split(' ').filter(w => w.trim().length);
          console.log(`🔤 [NORMALIZE] Multi-word location detected: "${cityInput}" → ${words.join(', ')}`);
          const locKeywords = words.join(' ');
          normalized.keywords = params.keywords ? `${params.keywords} ${locKeywords}` : locKeywords;
          console.log(`🔍 [NORMALIZE] Added location words to keywords: "${normalized.keywords}"`);
        }
      }
    }
    // ============================================================================
    // END LOCATION FIX
    // ============================================================================

    // Transaction type - support both field names
    const transactionInput = params.transactionType || params.transactionTypeSlug;
    if (transactionInput) {
      normalized.transactionTypeSlug = transactionInput.toLowerCase();
      console.log(`💱 [NORMALIZE] Transaction type: "${transactionInput}"`);
    }

    // Price filtering
    if (params.minPrice || params.maxPrice) {
      normalized['price.min'] = params.minPrice ? parseFloat(params.minPrice) : undefined;
      normalized['price.max'] = params.maxPrice ? parseFloat(params.maxPrice) : undefined;
    }

    // Area
    if (params.minArea || params.maxArea) {
      normalized['area.min'] = params.minArea ? parseFloat(params.minArea) : undefined;
      normalized['area.max'] = params.maxArea ? parseFloat(params.maxArea) : undefined;
    }

    // Keywords
    if (params.keywords || params.query) {
      const searchKw = params.keywords || params.query;
      normalized.keywords = normalized.keywords ? `${searchKw} ${normalized.keywords}`.substring(0, 200) : searchKw.substring(0, 200);
    }

    // Vehicle attributes
    const catForVehicleCheck = params.category || params.categorySlug;
    if (catForVehicleCheck && ['vehicles', 'cars'].includes(catForVehicleCheck.toLowerCase())) {
      const attr = {};
      if (params.carBrand) attr.brand = params.carBrand;
      if (params.carModel) attr.model = params.carModel;
      if (params.minYear || params.maxYear) {
        attr.year = {};
        if (params.minYear) attr.year.min = parseInt(params.minYear);
        if (params.maxYear) attr.year.max = parseInt(params.maxYear);
      }
      if (params.fuelType) attr.fuelType = params.fuelType;
      if (params.transmission) attr.transmission = params.transmission;
      if (Object.keys(attr).length) normalized.attributes = JSON.stringify(attr);
    }

    // Pagination
    normalized.page = params.page || 1;
    normalized.limit = params.limit || 20;

    // Sorting
    if (params.sortBy) {
      normalized.sortBy = params.sortBy;
      normalized.sortOrder = params.sortOrder || 'DESC';
    }

    // Additional filters
    if (params.featured) normalized.featured = true;
    if (params.hasImages) normalized.hasImages = true;
    if (params.hasVideo) normalized.hasVideo = true;
    if (params.condition && !normalized.attributes) {
      normalized.attributes = JSON.stringify({ condition: params.condition });
    }

    console.log('✅ [NORMALIZE] Normalization complete!');
    console.log('📤 [NORMALIZE] Output:', JSON.stringify(normalized, null, 2));
    return normalized;
  }

  /**
   * Get listing details by ID
   * Uses GET /api/listings/:listing_id endpoint
   * 
   * @param {string} listingId - Listing ID (UUID)
   * @returns {Promise<Object>} Listing details
   */
  async getListingDetails(listingId) {
    try {
      console.log('📄 [SEARCH] Fetching listing details for ID:', listingId);
      
      const cacheKey = `listing:${listingId}`;
      const cachedListing = await cache.get(cacheKey);

      if (cachedListing) {
        console.log('✅ [SEARCH] Cache hit for listing details');
        return JSON.parse(cachedListing);
      }

      // Build endpoint - API base URL + /api/listings/:id
      const endpoint = `${this.apiUrl}/api/listings/${listingId}`;
      const headers = {
        'Accept': 'application/json'
      };
      
      // Check if API key is actually valid (not empty, not placeholder)
      const hasValidApiKey = this.apiKey && 
                              typeof this.apiKey === 'string' &&
                              this.apiKey.trim() !== '' &&
                              this.apiKey !== 'your_api_key_here' &&
                              !this.apiKey.includes('your_api_key') &&
                              !this.apiKey.includes('your-api-key');
      
      // Add authorization ONLY if valid API key exists (optional auth per API docs)
      if (hasValidApiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        console.log('🔑 [SEARCH] Using API key authentication for listing details');
      } else {
        console.log('ℹ️  [SEARCH] Using unauthenticated access for listing details (OK - auth is optional)');
      }

      console.log('🌐 [SEARCH] Fetching listing from:', endpoint);
      const response = await axios.get(endpoint, { headers });

      // Response format: { success: true, data: { listing: {...} } }
      const listing = response.data?.data?.listing || response.data;
      
      await cache.set(cacheKey, JSON.stringify(listing), 600); // Cache for 10 minutes
      console.log('✅ [SEARCH] Listing details fetched and cached');

      return listing;

    } catch (error) {
      console.error('❌ [SEARCH] Error fetching listing details:', {
        message: error.message,
        status: error.response?.status,
        listingId: listingId
      });
      logger.error('Error fetching listing details:', error);
      throw new Error('Failed to fetch listing details');
    }
  }

  /**
   * Get available root categories
   * Uses GET /api/categories/root endpoint
   * 
   * @returns {Promise<Array>} List of root categories
   */
  async getCategories() {
    try {
      console.log('📂 [SEARCH] Fetching root categories...');
      
      const cacheKey = `marketplace:categories:${this.language}`;
      const cachedCategories = await cache.get(cacheKey);

      if (cachedCategories) {
        console.log('✅ [SEARCH] Cache hit for categories');
        return JSON.parse(cachedCategories);
      }

      const endpoint = `${this.apiUrl}/api/categories/root`;
      console.log('🔗 [SEARCH] Categories endpoint:', endpoint);
      console.log('🌐 [SEARCH] Language parameter:', this.language);
      
      const response = await axios.get(endpoint, {
        params: {
          language: this.language
        },
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('📦 [SEARCH] Categories API response structure:', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        hasCategories: !!response.data?.data?.categories,
        categoriesCount: response.data?.data?.categories?.length || 0
      });

      // Response format: { success: true, data: { categories: [...] } }
      const categories = response.data?.data?.categories || [];

      if (categories.length === 0) {
        console.warn('⚠️  [SEARCH] No categories returned from API');
      }

      await cache.set(cacheKey, JSON.stringify(categories), 3600); // Cache for 1 hour
      console.log('✅ [SEARCH] Categories fetched:', categories.length, 'root categories');
      console.log('📋 [SEARCH] Category slugs:', categories.map(c => c.slug).join(', '));

      return categories;

    } catch (error) {
      console.error('❌ [SEARCH] Error fetching categories:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data
      });
      logger.error('Error fetching categories:', error);
      
      // Fallback to common categories if API fails
      const fallbackCategories = [
        { slug: 'real-estate', name: 'عقار', nameAr: 'عقار', nameEn: 'Real Estate' },
        { slug: 'vehicles', name: 'مركبة', nameAr: 'مركبة', nameEn: 'Vehicles' },
        { slug: 'services', name: 'خدمة', nameAr: 'خدمة', nameEn: 'Services' },
        { slug: 'furniture-home-decor', name: 'أثاث وديكور المنزل', nameAr: 'أثاث وديكور المنزل', nameEn: 'Furniture & Home Decor' },
        { slug: 'fashion-clothing', name: 'أزياء وملابس', nameAr: 'أزياء وملابس', nameEn: 'Fashion & Clothing' },
        { slug: 'generators-power', name: 'مولدات وطاقة', nameAr: 'مولدات وطاقة', nameEn: 'Generators & Power' }
      ];
      
      console.log('⚠️  [SEARCH] Using fallback categories');
      return fallbackCategories;
    }
  }

  /**
   * Load complete search structure (categories, locations, transaction types)
   * This gives the AI full context about available options
   * @returns {Promise<Object|null>} Search structure or null
   */
  async loadSearchStructure() {
    try {
      // Check cache first
      const cacheKey = `structure:${this.language}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const endpoint = `${this.apiUrl}/api/search/structure`;
      const response = await axios.get(endpoint, {
        params: { language: this.language },
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        timeout: 15000
      });

      if (response.data?.data?.structure) {
        const structure = response.data.data.structure;
        // Cache for 30 minutes
        await cache.setex(cacheKey, 1800, JSON.stringify(structure));
        logger.info('Search structure loaded and cached');
        return structure;
      }

      return null;
    } catch (error) {
      logger.error('Failed to load search structure:', error.message);
      return null;
    }
  }

  /**
   * Get provinces list
   * @returns {Promise<Array>} List of provinces
   */
  async getProvinces() {
    try {
      const cacheKey = `provinces:${this.language}`;
      const cached = await cache.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const response = await axios.get(`${this.apiUrl}/api/cities/provinces`, {
        params: { language: this.language },
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        timeout: 10000
      });

      if (response.data?.data?.provinces) {
        await cache.setex(cacheKey, 3600, JSON.stringify(response.data.data.provinces));
        return response.data.data.provinces;
      }
      return [];
    } catch (error) {
      logger.error('Failed to load provinces:', error.message);
      return [];
    }
  }

  /**
   * Get cities by province
   * @param {string} province - Province name
   * @returns {Promise<Array>} List of cities
   */
  async getCitiesByProvince(province) {
    try {
      const cacheKey = `cities:${province}:${this.language}`;
      const cached = await cache.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const response = await axios.get(
        `${this.apiUrl}/api/cities/provinces/${encodeURIComponent(province)}/cities`,
        {
          params: { language: this.language },
          headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
          timeout: 10000
        }
      );

      if (response.data?.data?.cities) {
        await cache.setex(cacheKey, 3600, JSON.stringify(response.data.data.cities));
        return response.data.data.cities;
      }
      return [];
    } catch (error) {
      logger.error(`Failed to load cities for ${province}:`, error.message);
      return [];
    }
  }

  /**
   * Get category filters/attributes
   * @param {string} categorySlug - Category slug
   * @returns {Promise<Object|null>} Category filters or null
   */
  async getCategoryFilters(categorySlug) {
    try {
      const cacheKey = `filters:${categorySlug}:${this.language}`;
      const cached = await cache.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const response = await axios.get(
        `${this.apiUrl}/api/search/filters/${encodeURIComponent(categorySlug)}`,
        {
          params: { language: this.language },
          headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
          timeout: 10000
        }
      );

      if (response.data?.data) {
        await cache.setex(cacheKey, 1800, JSON.stringify(response.data.data));
        return response.data.data;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to load filters for ${categorySlug}:`, error.message);
      return null;
    }
  }

  /**
   * Enhanced search with suggestions fallback
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results with suggestions
   */
  async searchWithSuggestions(params) {
    // Primary search
    const results = await this.search(params);

    // If no results, try broader search for suggestions
    if (results.length === 0) {
      const suggestions = await this.getSuggestions(params);
      return {
        listings: [],
        suggestions,
        message: 'no_results_with_suggestions'
      };
    }

    return {
      listings: results,
      suggestions: [],
      message: 'success'
    };
  }

  /**
   * Get search suggestions when exact match not found
   * IMPROVED: Uses sibling categories instead of parent categories
   * @param {Object} originalParams - Original search parameters
   * @returns {Promise<Array>} Array of suggestions
   */
  async getSuggestions(originalParams) {
    const suggestions = [];

    try {
      console.log('💡 [SUGGESTIONS] Building suggestions for:', originalParams.category);

      // Suggestion 1: Same category, remove location filter (expand to other provinces)
      if (originalParams.province || originalParams.city) {
        const withoutLocation = { ...originalParams };
        delete withoutLocation.province;
        delete withoutLocation.city;
        delete withoutLocation.cityName;
        const results = await this.search(withoutLocation);
        if (results.length > 0) {
          suggestions.push({
            type: 'same_category_all_locations',
            message_ar: `لم نجد نتائج في "${originalParams.province || originalParams.city}"، عرضنا نتائج من محافظات أخرى`,
            message_en: `No results in "${originalParams.province || originalParams.city}", showing results from other provinces`,
            count: results.length,
            listings: results.slice(0, 5)
          });
        }
      }

      // Suggestion 2: Try SIBLING categories + same location
      if (originalParams.category) {
        // Import dynamicDataManager for sibling lookup
        const dynamicDataManager = require('../data/dynamicDataManager');
        const siblings = dynamicDataManager.getSiblingCategories(originalParams.category);

        if (siblings.length > 0) {
          console.log(`🔍 [SUGGESTIONS] Trying ${siblings.length} sibling categories...`);

          for (const sibling of siblings.slice(0, 3)) { // Try top 3 siblings
            const withSibling = { ...originalParams, category: sibling.slug };
            // Normalize the category parameter
            if (withSibling.categorySlug) {
              withSibling.categorySlug = sibling.slug;
            }
            const results = await this.search(withSibling);

            if (results.length > 0) {
              suggestions.push({
                type: 'sibling_category',
                originalCategory: originalParams.category,
                siblingCategory: sibling.slug,
                siblingName: sibling.name || sibling.name_ar || sibling.name_en,
                message_ar: `لم نجد نتائج في "${originalParams.category}"، عرضنا نتائج من فئة مشابهة: "${sibling.name_ar || sibling.name}"`,
                message_en: `No results in "${originalParams.category}", showing results from similar category: "${sibling.name_en || sibling.name}"`,
                count: results.length,
                listings: results.slice(0, 5)
              });
              break; // Found results, stop trying siblings
            }
          }
        }
      }

      // Suggestion 3: Try removing price constraints
      if (originalParams.minPrice || originalParams.maxPrice) {
        const withoutPrice = { ...originalParams };
        delete withoutPrice.minPrice;
        delete withoutPrice.maxPrice;
        delete withoutPrice['price.min'];
        delete withoutPrice['price.max'];
        const results = await this.search(withoutPrice);
        if (results.length > 0) {
          suggestions.push({
            type: 'without_price_filter',
            message_ar: 'لم نجد نتائج ضمن نطاق السعر المحدد، عرضنا نتائج بدون تصفية السعر',
            message_en: 'No results in specified price range, showing results without price filter',
            count: results.length,
            listings: results.slice(0, 3)
          });
        }
      }

      // Suggestion 4: Sibling categories + no location (last resort, but NOT parent category)
      if (suggestions.length === 0 && originalParams.category) {
        const dynamicDataManager = require('../data/dynamicDataManager');
        const siblings = dynamicDataManager.getSiblingCategories(originalParams.category);

        if (siblings.length > 0) {
          for (const sibling of siblings.slice(0, 3)) {
            const withSiblingNoLocation = {
              category: sibling.slug,
              categorySlug: sibling.slug
            };

            const results = await this.search(withSiblingNoLocation);

            if (results.length > 0) {
              suggestions.push({
                type: 'sibling_category_all_locations',
                originalCategory: originalParams.category,
                siblingCategory: sibling.slug,
                siblingName: sibling.name || sibling.name_ar || sibling.name_en,
                message_ar: `لم نجد نتائج، عرضنا لك إعلانات من فئة "${sibling.name_ar || sibling.name}" من كل المحافظات`,
                message_en: `No results found, showing listings from "${sibling.name_en || sibling.name}" category from all provinces`,
                count: results.length,
                listings: results.slice(0, 5)
              });
              break;
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ [SUGGESTIONS] Error getting suggestions:', error.message);
      logger.error('Error getting suggestions:', error);
    }

    console.log(`💡 [SUGGESTIONS] Generated ${suggestions.length} suggestions`);
    return suggestions;
  }

  /**
   * Smart search with fallback strategies
   * IMPROVED: Never falls back to parent category, uses sibling categories instead
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results with metadata
   */
  async smartSearch(params) {
    console.log('🧠 [SMART-SEARCH] Starting intelligent search...');
    console.log('📋 [SMART-SEARCH] Original params:', JSON.stringify(params, null, 2));

    const strategies = this.buildSearchStrategies(params);
    let allResults = [];
    let usedStrategy = null;
    let fallbackMessage = null;

    for (const strategy of strategies) {
      console.log(`🔍 [SMART-SEARCH] Trying strategy: ${strategy.name}`);
      console.log(`📋 [SMART-SEARCH] Strategy params:`, JSON.stringify(strategy.params, null, 2));

      try {
        const results = await this.search(strategy.params);

        if (results && results.length > 0) {
          allResults = results;
          usedStrategy = strategy.name;
          fallbackMessage = strategy.fallbackMessage || null;
          break; // Found results, stop trying
        }
      } catch (error) {
        console.error(`❌ [SMART-SEARCH] Strategy "${strategy.name}" failed:`, error.message);
      }
    }

    // If all strategies failed, return empty with metadata
    return {
      results: allResults,
      usedStrategy: usedStrategy || 'none',
      totalStrategiesTried: strategies.length,
      fallbackMessage: fallbackMessage
    };
  }

  /**
   * Build search strategies from most specific to broadest
   * IMPROVED: Respects category hierarchy - NEVER uses parent category
   * Order:
   * 1. Exact match (same category + same location)
   * 2. Same category + other locations
   * 3. Sibling categories + same location
   * 4. Sibling categories + other locations
   *
   * @param {Object} params - Original search parameters
   * @returns {Array} Array of search strategies
   */
  buildSearchStrategies(params) {
    const strategies = [];
    const categorySlug = params.category || params.categorySlug;
    const hasLocation = params.province || params.city || params.cityName;

    console.log('🔨 [STRATEGIES] Building search strategies...');
    console.log(`   Category: ${categorySlug}, Has Location: ${!!hasLocation}`);

    // Strategy 1: EXACT match - category + location + all filters (most specific)
    strategies.push({
      name: 'exact_match',
      params: { ...params },
      fallbackMessage: null
    });

    // Strategy 2: Same category, remove keywords (might be too specific)
    if (params.keywords) {
      const withoutKeywords = { ...params };
      delete withoutKeywords.keywords;
      strategies.push({
        name: 'category_location_only',
        params: withoutKeywords,
        fallbackMessage: null
      });
    }

    // Strategy 3: Same category, ALL locations (expand location)
    if (hasLocation) {
      const sameCategory = { ...params };
      delete sameCategory.province;
      delete sameCategory.city;
      delete sameCategory.cityName;
      strategies.push({
        name: 'same_category_all_locations',
        params: sameCategory,
        fallbackMessage: {
          ar: `⚠️ لم نجد نتائج في "${params.province || params.city}"، عرضنا نتائج من محافظات أخرى`,
          en: `⚠️ No results in "${params.province || params.city}", showing results from other provinces`
        }
      });
    }

    // Strategy 4-6: SIBLING categories (NOT parent!) + same location
    // ⚠️ CRITICAL: We NEVER fall back to parent category (real-estate, vehicles, etc.)
    if (categorySlug) {
      const dynamicDataManager = require('../data/dynamicDataManager');
      const siblings = dynamicDataManager.getSiblingCategories(categorySlug);

      if (siblings.length > 0) {
        console.log(`   Found ${siblings.length} sibling categories to try`);

        // Try each sibling with original location
        siblings.slice(0, 3).forEach((sibling, index) => {
          const siblingParams = { ...params };
          siblingParams.category = sibling.slug;
          siblingParams.categorySlug = sibling.slug;

          strategies.push({
            name: `sibling_${sibling.slug}_with_location`,
            params: siblingParams,
            fallbackMessage: {
              ar: `⚠️ لم نجد "${categorySlug}"، عرضنا لك نتائج من فئة "${sibling.name_ar || sibling.name}"`,
              en: `⚠️ No "${categorySlug}" found, showing results from "${sibling.name_en || sibling.name}" category`
            }
          });

          // Also try sibling without location constraint
          if (hasLocation) {
            const siblingNoLocation = { ...siblingParams };
            delete siblingNoLocation.province;
            delete siblingNoLocation.city;
            delete siblingNoLocation.cityName;

            strategies.push({
              name: `sibling_${sibling.slug}_all_locations`,
              params: siblingNoLocation,
              fallbackMessage: {
                ar: `⚠️ لم نجد نتائج، عرضنا "${sibling.name_ar || sibling.name}" من كل المحافظات`,
                en: `⚠️ No results found, showing "${sibling.name_en || sibling.name}" from all provinces`
              }
            });
          }
        });
      }
    }

    console.log(`🔨 [STRATEGIES] Built ${strategies.length} strategies`);
    return strategies;
  }

  // ==================== NEW DYNAMIC API METHODS ====================

  /**
   * Get lightweight search structure (root categories only)
   * Endpoint: GET /api/search/structure/lightweight
   */
  async getLightweightStructure(includeIcon = true) {
    try {
      const cacheKey = `structure:lightweight:${this.language}:${includeIcon}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log('✅ [SEARCH] Using cached lightweight structure');
        return JSON.parse(cached);
      }

      const response = await axios.get(`${this.apiUrl}/api/search/structure/lightweight`, {
        params: { language: this.language, icon: includeIcon },
        headers: this.getHeaders(),
        timeout: 15000
      });

      if (response.data?.success && response.data?.data?.structure) {
        const structure = response.data.data.structure;
        await cache.set(cacheKey, JSON.stringify(structure), 1800);
        console.log('✅ [SEARCH] Lightweight structure loaded');
        return structure;
      }
      return null;
    } catch (error) {
      console.error('❌ [SEARCH] Error loading lightweight structure:', error.message);
      return null;
    }
  }

  /**
   * Get child categories by parent ID
   * Endpoint: GET /api/search/categories/{categoryId}
   */
  async getChildCategories(categoryId, options = {}) {
    try {
      const { includeInactive = false, transactionTypeId = null } = options;
      const cacheKey = `children:${categoryId}:${this.language}:${includeInactive}:${transactionTypeId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log(`✅ [SEARCH] Using cached children for ${categoryId}`);
        return JSON.parse(cached);
      }

      const response = await axios.get(`${this.apiUrl}/api/search/categories/${categoryId}`, {
        params: { language: this.language, includeInactive, transactionTypeId },
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (response.data?.success && response.data?.data?.categories) {
        const categories = response.data.data.categories;
        await cache.set(cacheKey, JSON.stringify(categories), 3600);
        console.log(`✅ [SEARCH] Found ${categories.length} child categories`);
        return categories;
      }
      return [];
    } catch (error) {
      console.error(`❌ [SEARCH] Error loading children for ${categoryId}:`, error.message);
      return [];
    }
  }

  /**
   * Search categories by name/slug
   * Endpoint: GET /api/categories/search/{searchTerm}
   */
  async searchCategories(searchTerm) {
    try {
      const cacheKey = `search:categories:${searchTerm}:${this.language}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log('✅ [SEARCH] Using cached category search');
        return JSON.parse(cached);
      }

      const response = await axios.get(
        `${this.apiUrl}/api/categories/search/${encodeURIComponent(searchTerm)}`,
        {
          params: { language: this.language },
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      if (response.data?.success && response.data?.data?.categories) {
        const categories = response.data.data.categories;
        await cache.set(cacheKey, JSON.stringify(categories), 300);
        console.log(`✅ [SEARCH] Found ${categories.length} matching categories`);
        return categories;
      }
      return [];
    } catch (error) {
      console.error('❌ [SEARCH] Error searching categories:', error.message);
      return [];
    }
  }

  /**
   * Get locations hierarchy
   * Endpoint: GET /api/search/locations/hierarchy
   */
  async getLocationsHierarchy() {
    try {
      const cacheKey = `locations:hierarchy:${this.language}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log('✅ [SEARCH] Using cached locations hierarchy');
        return JSON.parse(cached);
      }

      const response = await axios.get(`${this.apiUrl}/api/search/locations/hierarchy`, {
        params: { language: this.language },
        headers: this.getHeaders(),
        timeout: 10000
      });

      if (response.data?.success && response.data?.data?.hierarchy) {
        const hierarchy = response.data.data.hierarchy;
        await cache.set(cacheKey, JSON.stringify(hierarchy), 3600);
        console.log('✅ [SEARCH] Locations hierarchy loaded');
        return hierarchy;
      }
      return { provinces: [] };
    } catch (error) {
      console.error('❌ [SEARCH] Error loading locations:', error.message);
      return { provinces: [] };
    }
  }

  /**
   * Build dynamic AI context - THE MAIN METHOD
   * Collects all necessary data for AI from API endpoints
   */
  async buildDynamicAIContext(userMessage) {
    try {
      console.log('🔨 [SEARCH] Building dynamic AI context for:', userMessage);

      const context = { message: userMessage, language: this.language };

      // Step 1: Try to detect category from message
      const detected = await this.detectCategoryFromMessage(userMessage);
      context.detectedCategories = detected;

      if (detected.length > 0) {
        // Specific category detected - get its details
        const mainCat = detected[0];
        console.log(`📂 [SEARCH] Detected category: ${mainCat.slug} (${mainCat.name})`);

        // Get filters for this category
        const filterData = await this.getCategoryFilters(mainCat.slug);
        context.categoryFilters = filterData?.filters || [];
        context.categoryDetails = filterData?.category;

        // Get children if parent category
        if (mainCat.hasChildren) {
          context.childCategories = await this.getChildCategories(mainCat.id);
        }
      } else {
        // No specific category - load lightweight structure
        console.log('📂 [SEARCH] No category detected, loading lightweight structure');
        const structure = await this.getLightweightStructure(true);
        context.allCategories = structure?.categories || [];
        context.transactionTypes = structure?.transactionTypes || [];
      }

      // Step 2: Always include locations
      context.locations = await this.getLocationsHierarchy();

      console.log('✅ [SEARCH] Dynamic context built:', {
        detected: detected.length > 0,
        filters: context.categoryFilters?.length || 0,
        children: context.childCategories?.length || 0,
        allCats: context.allCategories?.length || 0,
        provinces: context.locations?.provinces?.length || 0
      });

      return context;
    } catch (error) {
      console.error('❌ [SEARCH] Error building context:', error);
      return { message: userMessage, language: this.language, error: error.message };
    }
  }

  /**
   * Detect category from user message using category search
   */
  async detectCategoryFromMessage(message) {
    try {
      // Extract keywords from message
      const stopWords = ['في', 'من', 'إلى', 'على', 'عن', 'مع', 'أن', 'هذا', 'ذلك', 'بدي', 'بدك', 'أريد', 'عايز', 'the', 'and', 'for', 'with'];
      const keywords = message
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.includes(w));

      const results = [];

      // Search for each keyword (limit to first 3 keywords)
      for (const keyword of keywords.slice(0, 3)) {
        const matches = await this.searchCategories(keyword);
        results.push(...matches);
      }

      // Remove duplicates based on ID
      const unique = [...new Map(results.map(item => [item.id, item])).values()];

      return unique.slice(0, 3); // Return top 3 matches
    } catch (error) {
      console.error('❌ [SEARCH] Error detecting category:', error.message);
      return [];
    }
  }

  /**
   * Get request headers with optional authentication
   */
  getHeaders() {
    const headers = { 'Accept': 'application/json' };
    const hasValidKey = this.apiKey &&
                        this.apiKey.trim() !== '' &&
                        this.apiKey !== 'your_api_key_here' &&
                        !this.apiKey.includes('your_');
    if (hasValidKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  // ==================== END NEW METHODS ====================

  // ==================== INTELLIGENT SEARCH WITH KEYWORD EXPANSION ====================

  /**
   * 🆕 Intelligent search with keyword expansion and fallback
   * المنطق الرئيسي: البحث بالكلمات الموسعة أولاً، ثم النتائج المشابهة إذا لم نجد شيء
   *
   * @param {Object} aiResponse - AI response with expanded keywords
   * @returns {Promise<Object>} Search results with metadata
   */
  async intelligentSearch(aiResponse) {
    try {
      console.log('🧠 [INTELLIGENT-SEARCH] Starting intelligent search...');
      console.log('📥 [INTELLIGENT-SEARCH] AI Response:', JSON.stringify(aiResponse, null, 2));

      const {
        mainKeyword,
        expandedKeywords = [],
        suggestedCategories = [],
        location,
        city,
        transactionType
      } = aiResponse;

      // ✅ NEW LOGIC: Category search FIRST if categories are suggested
      // هذا يضمن أن البحث عن "سيارة" يجد سيارات وليس فيلات تذكر السيارة في الوصف!

      // Step 1: If categories are suggested, search by category FIRST (more precise)
      if (suggestedCategories && suggestedCategories.length > 0) {
        console.log('🎯 [INTELLIGENT-SEARCH] Step 1: Searching by CATEGORY first (more precise)...');
        console.log('📂 [INTELLIGENT-SEARCH] Suggested categories:', suggestedCategories);

        const categoryResults = await this.searchByCategories(
          suggestedCategories,
          location || city,
          transactionType
        );

        if (categoryResults && categoryResults.length > 0) {
          console.log(`✅ [INTELLIGENT-SEARCH] Found ${categoryResults.length} results by category!`);
          return {
            success: true,
            results: categoryResults,
            searchType: 'category',
            usedKeywords: expandedKeywords,
            matchedCategories: suggestedCategories
          };
        }

        console.log('⚠️ [INTELLIGENT-SEARCH] No results from category search, trying keyword search...');
      }

      // Step 2: Search with expanded keywords (fallback or when no categories)
      console.log('🔍 [INTELLIGENT-SEARCH] Step 2: Searching with expanded keywords...');
      const results = await this.searchWithExpandedKeywords(
        expandedKeywords,
        location || city,
        transactionType
      );

      // Step 3: If results found, filter by category if possible
      if (results && results.length > 0) {
        // If we have suggested categories, filter results to match
        if (suggestedCategories && suggestedCategories.length > 0) {
          const filteredResults = this.filterResultsByCategory(results, suggestedCategories);

          if (filteredResults.length > 0) {
            console.log(`✅ [INTELLIGENT-SEARCH] Filtered to ${filteredResults.length} results matching category`);
            return {
              success: true,
              results: filteredResults,
              searchType: 'keyword_filtered',
              usedKeywords: expandedKeywords,
              matchedCategories: suggestedCategories
            };
          }
        }

        // Return unfiltered results as last resort
        return {
          success: true,
          results: results,
          searchType: 'keyword',
          usedKeywords: expandedKeywords
        };
      }

      // Step 4: No results - Use fallback with category matching
      console.log('🔄 [INTELLIGENT-SEARCH] Step 3: Trying fallback search...');
      return await this.fallbackSearch(
        suggestedCategories,
        expandedKeywords,
        location || city
      );

    } catch (error) {
      console.error('❌ [INTELLIGENT-SEARCH] Error:', error.message);
      throw error;
    }
  }

  /**
   * 🆕 Search with expanded keywords (no category filter)
   * البحث باستخدام الكلمات الموسعة بدون تصفية الفئات
   *
   * ⚠️ ENHANCED: يبحث عن كل كلمة لوحدها ثم يدمج النتائج
   *
   * @param {Array} keywords - Array of expanded keywords
   * @param {string} location - Location filter
   * @param {string} transactionType - Transaction type filter
   * @returns {Promise<Array>} Search results
   */
  async searchWithExpandedKeywords(keywords, location, transactionType) {
    try {
      console.log('🔍 [KEYWORD-SEARCH] Searching with keywords:', keywords);

      if (!keywords || keywords.length === 0) {
        console.log('⚠️  [KEYWORD-SEARCH] No keywords provided');
        return [];
      }

      // ✅ جديد: نبحث عن كل كلمة لوحدها، مش كلهم مع بعض!
      const allResults = [];
      const seenIds = new Set(); // تجنب التكرار

      for (const keyword of keywords.slice(0, 3)) { // أول 3 كلمات فقط
        console.log(`🔍 [KEYWORD-SEARCH] Searching for: "${keyword}"`);

        const searchParams = {
          keywords: keyword, // ✅ كلمة واحدة فقط
          limit: 7 // ⚠️ أقصى 7 نتائج - للمزيد: kasioon.com أو التطبيق
        };

        // Add location if provided
        if (location) {
          searchParams.city = location;
        }

        // Add transaction type if provided
        if (transactionType) {
          searchParams.transactionType = transactionType;
        }

        try {
          const results = await this.search(searchParams);
          console.log(`   Found ${results.length} results for "${keyword}"`);

          // أضف النتائج الجديدة فقط (تجنب التكرار)
          for (const result of results) {
            if (!seenIds.has(result.id)) {
              seenIds.add(result.id);
              allResults.push(result);
            }
          }

          // إذا وصلنا لـ 20 نتيجة، نوقف
          if (allResults.length >= 20) {
            break;
          }
        } catch (error) {
          console.error(`   ❌ Error searching for "${keyword}":`, error.message);
        }
      }

      return allResults;

    } catch (error) {
      console.error('❌ [KEYWORD-SEARCH] Error:', error.message);
      return [];
    }
  }

  /**
   * 🆕 Fallback search using category matching with categoryKeywords.json
   * البحث الاحتياطي باستخدام مطابقة الفئات مع ملف الكلمات المفتاحية
   *
   * @param {Array} suggestedCategories - AI-suggested category slugs
   * @param {Array} keywords - Expanded keywords
   * @param {string} location - Location filter
   * @returns {Promise<Object>} Search results with metadata
   */
  async fallbackSearch(suggestedCategories, keywords, location) {
    try {
      console.log('🔄 [FALLBACK-SEARCH] Starting fallback search...');
      console.log('📂 [FALLBACK-SEARCH] Suggested categories:', suggestedCategories);
      console.log('🔑 [FALLBACK-SEARCH] Keywords:', keywords);

      // Load category data files
      const allCategories = require('../data/all-categories.json');
      const categoryKeywords = require('../data/categoryKeywords.json');

      console.log('✅ [FALLBACK-SEARCH] Loaded data files');

      // Match AI-suggested categories with keywords from categoryKeywords.json
      const matchedCategories = this.matchCategoriesIntelligently(
        suggestedCategories,
        keywords,
        categoryKeywords,
        allCategories
      );

      if (matchedCategories.length === 0) {
        console.log('⚠️  [FALLBACK-SEARCH] No categories matched');
        return {
          success: true,
          results: [],
          searchType: 'no_results',
          message: {
            ar: 'عذراً، لم نجد أي نتائج تطابق بحثك. حاول استخدام كلمات مفتاحية أخرى.',
            en: 'Sorry, no results found matching your search. Try using different keywords.'
          }
        };
      }

      console.log(`✅ [FALLBACK-SEARCH] Matched ${matchedCategories.length} categories`);

      // Search in matched categories
      const similarResults = await this.searchInCategories(
        matchedCategories,
        keywords,
        location
      );

      return {
        success: true,
        results: similarResults,
        searchType: 'similar',
        matchedCategories: matchedCategories.map(c => ({
          slug: c.slug,
          name: c.name
        }))
      };

    } catch (error) {
      console.error('❌ [FALLBACK-SEARCH] Error:', error.message);
      return {
        success: false,
        results: [],
        searchType: 'error',
        error: error.message
      };
    }
  }

  /**
   * 🆕 Match categories intelligently using categoryKeywords.json
   * مطابقة الفئات بذكاء باستخدام ملف الكلمات المفتاحية
   *
   * @param {Array} suggestedSlugs - AI-suggested category slugs
   * @param {Array} userKeywords - User's expanded keywords
   * @param {Object} keywordMap - categoryKeywords.json mapping
   * @param {Object} allCategories - all-categories.json data
   * @returns {Array} Matched categories with details
   */
  matchCategoriesIntelligently(suggestedSlugs, userKeywords, keywordMap, allCategories) {
    console.log('🎯 [CATEGORY-MATCH] Matching categories...');
    const matches = [];

    // Step 1: Match AI-suggested categories first
    for (const slug of suggestedSlugs) {
      if (keywordMap[slug]) {
        const category = this.findCategoryBySlug(slug, allCategories);
        if (category) {
          matches.push({
            slug: slug,
            name: category.name,
            keywords: keywordMap[slug],
            source: 'ai_suggested'
          });
          console.log(`✅ [CATEGORY-MATCH] Matched AI-suggested category: ${slug}`);
        }
      }
    }

    // Step 2: If no AI matches, try keyword-based matching
    if (matches.length === 0 && userKeywords && userKeywords.length > 0) {
      console.log('🔍 [CATEGORY-MATCH] No AI matches, trying keyword-based matching...');

      for (const [categorySlug, categoryKeywordList] of Object.entries(keywordMap)) {
        // Check if any user keyword matches category keywords
        const hasMatch = userKeywords.some(userKw =>
          categoryKeywordList.some(catKw =>
            catKw.toLowerCase().includes(userKw.toLowerCase()) ||
            userKw.toLowerCase().includes(catKw.toLowerCase())
          )
        );

        if (hasMatch) {
          const category = this.findCategoryBySlug(categorySlug, allCategories);
          if (category) {
            matches.push({
              slug: categorySlug,
              name: category.name,
              keywords: categoryKeywordList,
              source: 'keyword_match'
            });
            console.log(`✅ [CATEGORY-MATCH] Matched by keywords: ${categorySlug}`);

            // Limit to top 3 keyword matches
            if (matches.length >= 3) break;
          }
        }
      }
    }

    console.log(`🎯 [CATEGORY-MATCH] Total matches: ${matches.length}`);
    return matches;
  }

  /**
   * 🆕 Find category by slug in nested hierarchy
   * البحث عن فئة حسب الـ slug في التسلسل الهرمي
   *
   * @param {string} slug - Category slug to find
   * @param {Object} categoriesData - all-categories.json data
   * @returns {Object|null} Category object or null
   */
  findCategoryBySlug(slug, categoriesData) {
    // Navigate through the API response structure
    const categories = categoriesData?.data?.categories || categoriesData?.categories || [];

    const findRecursive = (cats, targetSlug) => {
      for (const cat of cats) {
        if (cat.slug === targetSlug) {
          return cat;
        }
        if (cat.children && cat.children.length > 0) {
          const found = findRecursive(cat.children, targetSlug);
          if (found) return found;
        }
      }
      return null;
    };

    return findRecursive(categories, slug);
  }

  /**
   * 🆕 Search in specific matched categories
   * البحث في الفئات المطابقة المحددة
   *
   * @param {Array} matchedCategories - Matched categories from intelligent matching
   * @param {Array} keywords - Search keywords
   * @param {string} location - Location filter
   * @returns {Promise<Array>} Combined search results
   */
  async searchInCategories(matchedCategories, keywords, location) {
    console.log('🔍 [CATEGORY-SEARCH] Searching in matched categories...');
    const allResults = [];

    for (const category of matchedCategories) {
      console.log(`📂 [CATEGORY-SEARCH] Searching in category: ${category.slug}`);

      // ✅ Build search params for this category
      // ⚠️ NO KEYWORDS! Category is already specific enough
      // لما تبحث عن طريق الفئات لا تضع الكلمات المفتاحية - الفئة كافية!
      const searchParams = {
        categorySlug: category.slug,
        // ❌ Don't include keywords - if category is "cars", all listings are already cars!
        limit: 7 // ⚠️ أقصى 7 نتائج - للمزيد: kasioon.com أو التطبيق
      };

      // Add location if provided
      if (location) {
        searchParams.city = location;
      }

      try {
        const results = await this.search(searchParams);

        // Tag results with category info for display
        const taggedResults = results.map(result => ({
          ...result,
          _matchedCategory: {
            slug: category.slug,
            name: category.name,
            source: category.source
          }
        }));

        allResults.push(...taggedResults);

        // Stop if we have enough results
        if (allResults.length >= 20) {
          break;
        }
      } catch (error) {
        console.error(`❌ [CATEGORY-SEARCH] Error searching in ${category.slug}:`, error.message);
      }
    }

    return allResults;
  }

  /**
   * 🆕 Search by categories (without keywords)
   * البحث عبر الفئات مباشرة - أكثر دقة من البحث بالكلمات
   *
   * @param {Array} categorySlugs - Array of category slugs
   * @param {string} location - Location filter
   * @param {string} transactionType - Transaction type filter
   * @returns {Promise<Array>} Search results
   */
  async searchByCategories(categorySlugs, location, transactionType) {
    try {
      console.log('🎯 [CATEGORY-SEARCH] Searching by categories:', categorySlugs);

      if (!categorySlugs || categorySlugs.length === 0) {
        console.log('⚠️ [CATEGORY-SEARCH] No categories provided');
        return [];
      }

      const allResults = [];
      const seenIds = new Set();

      for (const categorySlug of categorySlugs.slice(0, 2)) { // أول فئتين فقط
        console.log(`📂 [CATEGORY-SEARCH] Searching in: ${categorySlug}`);

        const searchParams = {
          categorySlug: categorySlug,
          limit: 7 // ⚠️ أقصى 7 نتائج
        };

        if (location) {
          searchParams.city = location;
        }

        if (transactionType) {
          if (transactionType.includes('بيع') || transactionType.toLowerCase().includes('sale')) {
            searchParams.transactionTypeSlug = 'for-sale';
          } else if (transactionType.includes('إيجار') || transactionType.includes('أجار') || transactionType.toLowerCase().includes('rent')) {
            searchParams.transactionTypeSlug = 'for-rent';
          }
        }

        try {
          const results = await this.search(searchParams);

          for (const result of results) {
            if (!seenIds.has(result.id)) {
              seenIds.add(result.id);
              allResults.push({
                ...result,
                _searchedByCategory: categorySlug
              });
            }
          }

          console.log(`✅ [CATEGORY-SEARCH] Found ${results.length} in ${categorySlug}`);

        } catch (error) {
          console.error(`❌ [CATEGORY-SEARCH] Error in ${categorySlug}:`, error.message);
        }
      }

      return allResults;

    } catch (error) {
      console.error('❌ [CATEGORY-SEARCH] Error:', error.message);
      return [];
    }
  }

  /**
   * 🆕 Filter results by category
   * تصفية نتائج البحث بالكلمات حسب الفئة المقترحة
   *
   * @param {Array} results - Search results
   * @param {Array} categorySlugs - Array of category slugs to filter by
   * @returns {Array} Filtered results
   */
  filterResultsByCategory(results, categorySlugs) {
    if (!results || results.length === 0) return [];
    if (!categorySlugs || categorySlugs.length === 0) return results;

    console.log(`🔍 [FILTER] Filtering ${results.length} results by categories:`, categorySlugs);

    const filtered = results.filter(result => {
      // Check if result's category matches any of the suggested categories
      const resultCategory = result.category?.slug || result.categorySlug || '';
      const resultCategoryName = result.category?.name || '';

      // Check for match
      for (const targetSlug of categorySlugs) {
        // Exact slug match
        if (resultCategory === targetSlug) return true;

        // Partial slug match (e.g., "cars" matches "cars-for-sale")
        if (resultCategory.includes(targetSlug) || targetSlug.includes(resultCategory)) return true;

        // Check parent category
        if (result.category?.parent?.slug === targetSlug) return true;

        // Check if target is a root category and result is a subcategory
        // vehicles → cars, motorcycles, etc.
        const categoryMappings = {
          'vehicles': ['cars', 'motorcycles', 'trucks', 'buses', 'boats', 'vehicle-parts'],
          'real-estate': ['apartments', 'houses', 'lands', 'commercial', 'farms', 'villas'],
          'electronics': ['phones', 'computers', 'laptops', 'tablets', 'gaming', 'tvs', 'cameras']
        };

        const subcategories = categoryMappings[targetSlug] || [];
        for (const sub of subcategories) {
          if (resultCategory.includes(sub)) return true;
        }
      }

      return false;
    });

    console.log(`✅ [FILTER] Filtered to ${filtered.length} results`);
    return filtered;
  }

  // ==================== END INTELLIGENT SEARCH ====================
}

module.exports = new MarketplaceSearchService();

