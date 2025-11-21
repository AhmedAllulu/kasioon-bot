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
        console.log('✅ [SEARCH] Cache hit! Returning cached results');
        logger.info('Returning cached search results');
        const parsed = JSON.parse(cachedResults);
        console.log('📊 [SEARCH] Cached results count:', parsed.length);
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

      // Extract listings from response
      // Response format: { success: true, data: { listings: [...], pagination: {...} } }
      const listings = response.data?.data?.listings || [];
      const pagination = response.data?.data?.pagination || {};
      
      console.log('📊 [SEARCH] Results extracted:', listings.length, 'listings');
      console.log('📄 [SEARCH] Pagination:', pagination);

      // Cache results for 5 minutes
      console.log('💾 [SEARCH] Caching results...');
      await cache.set(cacheKey, JSON.stringify(listings), 300);
      console.log('✅ [SEARCH] Results cached for 5 minutes');

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

    // Category filtering - use slug if available, otherwise try to map
    if (params.category) {
      // Map common category names to slugs
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
      
      normalized.categorySlug = categoryMap[params.category.toLowerCase()] || params.category;
    }

    // Location filtering - SMART STRATEGY with province-first approach
    if (params.city) {
      // Complete Syrian province mapping (all 14 governorates)
      const provinceMap = {
        // English names
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
        'Al-Hasakah': 'Al-Hasakah',
        'Ar-Raqqah': 'Ar-Raqqah',
        'Quneitra': 'Quneitra',
        // Arabic names
        'حلب': 'Aleppo',
        'دمشق': 'Damascus',
        'ريف دمشق': 'Rif Dimashq',
        'حمص': 'Homs',
        'حماة': 'Hama',
        'اللاذقية': 'Latakia',
        'إدلب': 'Idlib',
        'طرطوس': 'Tartus',
        'درعا': 'Daraa',
        'السويداء': 'As-Suwayda',
        'دير الزور': 'Deir ez-Zor',
        'الحسكة': 'Al-Hasakah',
        'الرقة': 'Ar-Raqqah',
        'القنيطرة': 'Quneitra'
      };

      // SMART LOGIC: Check if location is a province
      const isProvince = provinceMap.hasOwnProperty(params.city);

      if (isProvince) {
        // Province-first strategy: Send ONLY province for broader search
        normalized.province = provinceMap[params.city];
        console.log(`🌍 [NORMALIZE] Province detected: ${params.city} → ${normalized.province} (province-only search)`);
        // DO NOT set cityName for province-level searches
      } else {
        // Not a province - treat as specific city
        normalized.cityName = params.city;
        console.log(`🏙️  [NORMALIZE] City search: ${params.city}`);

        // Check if multi-word location (e.g., "مساكن برزة")
        if (params.city.includes(' ')) {
          const words = params.city.split(' ').filter(w => w.trim().length > 0);
          console.log(`🔤 [NORMALIZE] Multi-word location detected: "${params.city}" → words: ${words.join(', ')}`);

          // Add each word to keywords for better matching
          const locationKeywords = words.join(' ');
          if (params.keywords) {
            normalized.keywords = `${params.keywords} ${locationKeywords}`;
          } else {
            normalized.keywords = locationKeywords;
          }
          console.log(`🔍 [NORMALIZE] Added location words to keywords: "${normalized.keywords}"`);
        }
      }
    }

    // Transaction type (sale, rent, etc.)
    if (params.transactionType) {
      normalized.transactionTypeSlug = params.transactionType.toLowerCase();
    }

    // Price filtering - use new format (recommended)
    if (params.minPrice || params.maxPrice) {
      normalized['price.min'] = params.minPrice ? parseFloat(params.minPrice) : undefined;
      normalized['price.max'] = params.maxPrice ? parseFloat(params.maxPrice) : undefined;
    }

    // Area filtering
    if (params.minArea || params.maxArea) {
      normalized['area.min'] = params.minArea ? parseFloat(params.minArea) : undefined;
      normalized['area.max'] = params.maxArea ? parseFloat(params.maxArea) : undefined;
    }

    // Keywords/search query - merge with location keywords if set
    if (params.keywords || params.query) {
      const searchKeywords = params.keywords || params.query;
      // If location keywords were already added, merge them
      if (normalized.keywords) {
        // Location keywords already set, merge with search keywords
        normalized.keywords = `${searchKeywords} ${normalized.keywords}`.substring(0, 200);
      } else {
        // No location keywords, just use search keywords
        normalized.keywords = searchKeywords.substring(0, 200);
      }
    }

    // Dynamic attributes for vehicles (if category is vehicles)
    if (params.category && (params.category.toLowerCase() === 'vehicles' || params.category.toLowerCase() === 'cars')) {
      const attributes = {};
      
      if (params.carBrand) {
        attributes.brand = params.carBrand;
      }
      if (params.carModel) {
        attributes.model = params.carModel;
      }
      if (params.minYear || params.maxYear) {
        attributes.year = {};
        if (params.minYear) attributes.year.min = parseInt(params.minYear);
        if (params.maxYear) attributes.year.max = parseInt(params.maxYear);
      }
      if (params.fuelType) {
        attributes.fuelType = params.fuelType;
      }
      if (params.transmission) {
        attributes.transmission = params.transmission;
      }
      
      if (Object.keys(attributes).length > 0) {
        // Store as JSON string for query parameter
        normalized.attributes = JSON.stringify(attributes);
      }
    }

    // Dynamic attributes for real estate
    if (params.category && (params.category.toLowerCase().includes('real-estate') || 
        params.category.toLowerCase() === 'apartments' ||
        params.category.toLowerCase() === 'houses' ||
        params.category.toLowerCase() === 'villas')) {
      const attributes = {};
      
      if (params.rooms) {
        attributes.rooms = parseInt(params.rooms);
      }
      if (params.bathrooms) {
        attributes.bathrooms = parseInt(params.bathrooms);
      }
      if (params.floor) {
        attributes.floor = parseInt(params.floor);
      }
      if (params.furnished !== undefined) {
        attributes.furnished = params.furnished;
      }
      
      if (Object.keys(attributes).length > 0) {
        // Store as JSON string for query parameter
        normalized.attributes = JSON.stringify(attributes);
      }
    }

    // Sorting
    if (params.sortBy) {
      normalized.sortBy = params.sortBy; // price, area, date, priority, relevance, popularity
    } else {
      normalized.sortBy = 'relevance'; // Default to relevance for search
    }
    
    if (params.sortOrder) {
      normalized.sortOrder = params.sortOrder.toUpperCase(); // ASC or DESC
    }

    // Filters
    if (params.featured !== undefined) {
      normalized.featured = params.featured;
    }
    if (params.hasImages !== undefined) {
      normalized.hasImages = params.hasImages;
    }
    if (params.hasVideo !== undefined) {
      normalized.hasVideo = params.hasVideo;
    }

    // Pagination
    normalized.page = params.page || 1;
    normalized.limit = Math.min(params.limit || 20, 100); // Max 100 per API docs

    // Remove undefined values
    Object.keys(normalized).forEach(key => {
      if (normalized[key] === undefined || normalized[key] === null || normalized[key] === '') {
        delete normalized[key];
      }
    });

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
   * @param {Object} originalParams - Original search parameters
   * @returns {Promise<Array>} Array of suggestions
   */
  async getSuggestions(originalParams) {
    const suggestions = [];

    try {
      // Suggestion 1: Try removing price constraints
      if (originalParams.minPrice || originalParams.maxPrice) {
        const withoutPrice = { ...originalParams };
        delete withoutPrice.minPrice;
        delete withoutPrice.maxPrice;
        const results = await this.search(withoutPrice);
        if (results.length > 0) {
          suggestions.push({
            type: 'without_price_filter',
            count: results.length,
            listings: results.slice(0, 3)
          });
        }
      }

      // Suggestion 2: Try parent category
      if (originalParams.category) {
        const structure = await this.loadSearchStructure();
        if (structure?.categories) {
          const parentCategory = this.findParentCategory(originalParams.category, structure.categories);
          if (parentCategory) {
            const withParent = { ...originalParams, category: parentCategory.slug };
            const results = await this.search(withParent);
            if (results.length > 0) {
              suggestions.push({
                type: 'parent_category',
                category: parentCategory,
                count: results.length,
                listings: results.slice(0, 3)
              });
            }
          }
        }
      }

      // Suggestion 3: Try nearby cities (expand to whole province or all cities)
      if (originalParams.city) {
        const withoutCity = { ...originalParams };
        delete withoutCity.city;
        const results = await this.search(withoutCity);
        if (results.length > 0) {
          suggestions.push({
            type: 'all_cities',
            count: results.length,
            listings: results.slice(0, 3)
          });
        }
      }
    } catch (error) {
      logger.error('Error getting suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Find parent category in category tree
   * @param {string} categorySlug - Category slug to find parent for
   * @param {Array} categories - Categories array
   * @param {Object} parent - Parent category (used recursively)
   * @returns {Object|null} Parent category or null
   */
  findParentCategory(categorySlug, categories, parent = null) {
    for (const cat of categories) {
      if (cat.slug === categorySlug) {
        return parent;
      }
      if (cat.children && cat.children.length > 0) {
        const found = this.findParentCategory(categorySlug, cat.children, cat);
        if (found) return found;
      }
    }
    return null;
  }
}

module.exports = new MarketplaceSearchService();

