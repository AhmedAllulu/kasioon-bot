/**
 * MCP-Powered AI Agent for Qasioun Marketplace
 *
 * This agent uses OpenAI (primary) or Claude AI (fallback) with direct PostgreSQL
 * database access to provide 100% accurate search results.
 *
 * Features:
 * - OpenAI as primary AI provider (GPT-4o)
 * - Anthropic Claude as fallback
 * - FULLY DYNAMIC attribute system - fetches attributes from database
 * - Support for ALL attribute types: text, number, select, multiselect, boolean, range, date
 * - Real-time data with optimized queries
 * - Enforced LEAF category selection
 * - Native Arabic language handling
 * - Category attribute caching (30 min TTL)
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { detectLanguage } = require('../../utils/languageDetector');

class MCPAgent {
  constructor() {
    // PRIMARY: Initialize OpenAI client
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;

    // FALLBACK: Initialize Anthropic client
    this.anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    }) : null;

    // Choose provider (default to OpenAI)
    this.provider = process.env.AI_PROVIDER || 'openai';

    // Initialize PostgreSQL connection pool
    this.pool = null;
    this.initializeDatabase();

    // Load system prompt
    this.systemPrompt = this.loadSystemPrompt();

    // Website URL for listing links
    this.websiteUrl = process.env.KASIOON_WEBSITE_URL || 'https://kasioon.com';

    // Category attributes cache (30 min TTL)
    this.attributeCache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    // Define database tools
    this.tools = this.defineTools();

    console.log('🤖 [MCP-AGENT] MCP Agent initialized:', {
      provider: this.provider,
      hasOpenAI: !!this.openai,
      hasAnthropic: !!this.anthropic,
      hasDatabase: !!this.pool,
      toolsCount: this.tools.length
    });
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  initializeDatabase() {
    const connectionString = process.env.MCP_DATABASE_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      console.warn('⚠️ [MCP-AGENT] No MCP_DATABASE_URL configured, database features disabled');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      // Test connection
      this.pool.query('SELECT 1')
        .then(() => console.log('✅ [MCP-AGENT] Database connection established'))
        .catch(err => console.error('❌ [MCP-AGENT] Database connection failed:', err.message));

    } catch (error) {
      console.error('❌ [MCP-AGENT] Failed to initialize database pool:', error.message);
    }
  }

  /**
   * Load system prompt from markdown file
   */
  loadSystemPrompt() {
    try {
      const promptPath = path.join(__dirname, '../../prompts/marketplace-agent.md');
      return fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
      console.error('❌ [MCP-AGENT] Failed to load system prompt:', error.message);
      return this.getDefaultSystemPrompt();
    }
  }

  /**
   * Default system prompt fallback
   */
  getDefaultSystemPrompt() {
    return `You are the Qasioun Marketplace AI assistant. You help users find listings in a comprehensive classifieds platform.

IMPORTANT RULES:
- Only return data that exists in the database
- Never hallucinate or make up listings
- Enforce LEAF category selection (most specific categories)
- Support both Arabic and English queries
- Always query the database for accurate results
- Use DYNAMIC attributes based on category - don't assume which attributes exist`;
  }

  /**
   * Define database tools with DYNAMIC attribute support
   */
  defineTools() {
    return [
      {
        name: 'search_listings',
        description: `Search listings by category, title keywords, or both. SMART FALLBACK: If no results in requested city, returns results from other cities.

IMPORTANT: You can search by:
1. category_slug - search in a specific category
2. title_keywords - search in listing titles (useful for colloquial terms like "طربيزات")
3. Both - combine category and title search

If no results found in the requested city, the tool automatically searches other cities and returns them with a note.`,
        input_schema: {
          type: 'object',
          properties: {
            category_slug: {
              type: 'string',
              description: 'LEAF category slug (optional). Examples: apartments, houses, cars, coffee-side-tables'
            },
            title_keywords: {
              type: 'string',
              description: 'Keywords to search in listing titles (e.g., "طربيزات", "موبايل سامسونج"). Use this for colloquial/dialect terms.'
            },
            city_name: {
              type: 'string',
              description: 'City name in Arabic (e.g., "دمشق", "إدلب", "حلب")'
            },
            transaction_type: {
              type: 'string',
              enum: ['sale', 'rent', 'exchange'],
              description: 'Transaction type: sale, rent, or exchange'
            },
            attributes: {
              type: 'object',
              description: 'Dynamic attribute filters (price, area, bedrooms, etc.)',
              additionalProperties: true
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results (default: 10, max: 20)',
              default: 10
            }
          },
          required: []
        }
      },
      {
        name: 'get_category_attributes',
        description: 'Get all filterable attributes for a specific category. Use this to discover what filters are available before searching.',
        input_schema: {
          type: 'object',
          properties: {
            category_slug: {
              type: 'string',
              description: 'Category slug to get attributes for'
            }
          },
          required: ['category_slug']
        }
      },
      {
        name: 'get_root_categories',
        description: 'Get main categories (level 0). This is the first step in progressive category navigation.',
        input_schema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_child_categories',
        description: 'Get children of a category. Use this to drill down the category hierarchy until reaching a leaf category.',
        input_schema: {
          type: 'object',
          properties: {
            parent_id: {
              type: 'string',
              description: 'Parent category ID (UUID)'
            }
          },
          required: ['parent_id']
        }
      },
      {
        name: 'get_cities',
        description: 'Get available cities for location filtering',
        input_schema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Optional search term to filter cities'
            }
          },
          required: []
        }
      },
      {
        name: 'get_listing_details',
        description: 'Get full details of a specific listing including ALL dynamic attributes',
        input_schema: {
          type: 'object',
          properties: {
            listing_id: {
              type: 'string',
              description: 'UUID of the listing'
            },
            slug: {
              type: 'string',
              description: 'Slug of the listing'
            }
          },
          required: []
        }
      },
      {
        name: 'find_category',
        description: 'Find the most appropriate LEAF category based on user keywords. Searches in names, slugs, AND descriptions.',
        input_schema: {
          type: 'object',
          properties: {
            keywords: {
              type: 'string',
              description: 'Keywords to search for in category names and descriptions (e.g., "شقة", "apartment", "سيارة", "أرض زراعية")'
            },
            parent_id: {
              type: 'string',
              description: 'Optional: Limit search to children of this parent category (UUID)'
            },
            search_in_description: {
              type: 'boolean',
              description: 'Whether to search in category descriptions (default: true)',
              default: true
            }
          },
          required: ['keywords']
        }
      },
      {
        name: 'deep_search_categories',
        description: 'Recursively search through all category levels to find matching categories. Use this when find_category returns no results.',
        input_schema: {
          type: 'object',
          properties: {
            keywords: {
              type: 'string',
              description: 'Keywords to search for across all category levels and descriptions'
            },
            max_depth: {
              type: 'integer',
              description: 'Maximum depth to search (default: 3)',
              default: 3
            },
            root_category_id: {
              type: 'string',
              description: 'Optional: Start search from a specific root category (UUID)'
            }
          },
          required: ['keywords']
        }
      },
      {
        name: 'search_listings_for_hints',
        description: '🆕 Search in listing titles to discover which category a keyword belongs to. Useful for colloquial language (e.g., "طربيزات" → finds in "طاولات صغيرة" category). Returns 5 listings with their categories as hints.',
        input_schema: {
          type: 'object',
          properties: {
            keywords: {
              type: 'string',
              description: 'Keywords to search for in listing titles (e.g., "أرض", "طربيزة", "موبايل")'
            }
          },
          required: ['keywords']
        }
      }
    ];
  }

  /**
   * Get all filterable attributes for a category (with caching)
   * @param {String} categoryId - Category UUID
   * @returns {Promise<Array>} Array of attribute objects with metadata
   */
  async getCategoryAttributes(categoryId) {
    // Check cache first
    const cached = this.attributeCache.get(categoryId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log(`📦 [MCP-AGENT] Using cached attributes for category ${categoryId}`);
      return cached.data;
    }

    // Note: unit_ar and unit_en are ARRAY types, get first element
    const query = `
      SELECT
        la.id,
        la.slug,
        la.name_ar,
        la.name_en,
        la.type,
        la.validation_rules,
        la.options,
        la.unit_ar[1] as unit_ar,
        la.unit_en[1] as unit_en,
        la.min_value,
        la.max_value,
        ca.is_required,
        ca.is_filterable,
        ca.sort_order
      FROM listing_attributes la
      JOIN category_attributes ca ON la.id = ca.attribute_id
      WHERE ca.category_id = $1
        AND la.is_active = true
        AND ca.is_filterable = true
      ORDER BY ca.sort_order ASC
    `;

    try {
      const result = await this.pool.query(query, [categoryId]);

      // Cache the result
      this.attributeCache.set(categoryId, {
        data: result.rows,
        timestamp: Date.now()
      });

      console.log(`✅ [MCP-AGENT] Fetched ${result.rows.length} attributes for category ${categoryId}`);
      return result.rows;
    } catch (error) {
      console.error('❌ [MCP-AGENT] Error fetching category attributes:', error);
      return [];
    }
  }

  /**
   * Get category attributes by slug (wrapper)
   */
  async getCategoryAttributesBySlug(categorySlug) {
    const categoryQuery = `
      SELECT id FROM categories WHERE slug = $1 AND is_active = true
    `;
    try {
      const result = await this.pool.query(categoryQuery, [categorySlug]);
      if (result.rows.length === 0) {
        return { error: `Category "${categorySlug}" not found`, attributes: [] };
      }
      const attributes = await this.getCategoryAttributes(result.rows[0].id);
      return {
        category_id: result.rows[0].id,
        attributes: attributes.map(attr => ({
          slug: attr.slug,
          name_ar: attr.name_ar,
          name_en: attr.name_en,
          type: attr.type,
          unit_ar: attr.unit_ar,
          unit_en: attr.unit_en,
          is_required: attr.is_required,
          options: attr.options
        }))
      };
    } catch (error) {
      console.error('❌ [MCP-AGENT] Error getting category attributes by slug:', error);
      return { error: error.message, attributes: [] };
    }
  }

  /**
   * Execute a database tool
   */
  async executeTool(toolName, toolInput) {
    if (!this.pool) {
      throw new Error('Database connection not available');
    }

    console.log(`🔧 [MCP-AGENT] Executing tool: ${toolName}`, JSON.stringify(toolInput, null, 2));

    switch (toolName) {
      case 'search_listings':
        return this.searchListings(toolInput);
      case 'get_category_attributes':
        return this.getCategoryAttributesBySlug(toolInput.category_slug);
      case 'get_root_categories':
        return this.getRootCategories();
      case 'get_child_categories':
        return this.getChildCategories(toolInput.parent_id);
      case 'get_cities':
        return this.getCities(toolInput);
      case 'get_listing_details':
        return this.getListingDetails(toolInput);
      case 'find_category':
        return this.findCategory(toolInput);
      case 'deep_search_categories':
        return this.deepSearchCategories(toolInput);
      case 'search_listings_for_hints':
        return this.searchListingsForHints(toolInput);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Search listings - Optimized for minimal token usage
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results
   */
  async searchListings(params) {
    const {
      category_slug,
      city_name,
      transaction_type,
      attributes = {},
      title_keywords,
      limit = 10
    } = params;

    console.log('🔍 [MCP-AGENT] Searching listings:', {
      category_slug,
      city_name,
      transaction_type,
      title_keywords,
      attributeCount: Object.keys(attributes).length,
      limit
    });

    try {
      let category = null;

      // 1. Get category if provided
      if (category_slug) {
        const categoryQuery = `
          SELECT id, name_ar, slug
          FROM categories c
          WHERE c.slug = $1 AND c.is_active = true
        `;
        const categoryResult = await this.pool.query(categoryQuery, [category_slug]);
        if (categoryResult.rows.length > 0) {
          category = categoryResult.rows[0];
        }
      }

      // 2. Build query - search by title keywords OR category
      let query = `
        SELECT
          l.id, l.title,
          c.name_ar as category,
          ct.name_ar as city,
          tt.name_ar as transaction_type
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        LEFT JOIN cities ct ON l.city_id = ct.id
        LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
        WHERE l.status = 'active'
      `;

      const queryParams = [];
      let paramIndex = 1;

      // 3. Category filter (optional now)
      if (category) {
        query += ` AND l.category_id = $${paramIndex}`;
        queryParams.push(category.id);
        paramIndex++;
      }

      // 4. City/Province filter - search in city name OR province name
      if (city_name) {
        query += ` AND (ct.name_ar ILIKE $${paramIndex} OR ct.province_ar ILIKE $${paramIndex})`;
        queryParams.push(`%${city_name}%`);
        paramIndex++;
      }

      // 5. Transaction filter
      if (transaction_type) {
        query += ` AND tt.slug = $${paramIndex}`;
        queryParams.push(transaction_type);
        paramIndex++;
      }

      // 6. Title keywords filter (NEW!)
      if (title_keywords) {
        query += ` AND l.title ILIKE $${paramIndex}`;
        queryParams.push(`%${title_keywords}%`);
        paramIndex++;
      }

      // 7. Attribute filters
      const criticalAttrs = ['price', 'area', 'rooms', 'bedrooms'];
      for (const [attrSlug, attrValue] of Object.entries(attributes)) {
        if (!criticalAttrs.includes(attrSlug)) continue;
        query += ` AND EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id
            AND la.slug = '${attrSlug}'
            AND lav.value_number >= $${paramIndex}
        )`;
        queryParams.push(attrValue);
        paramIndex++;
      }

      // 8. Order and limit
      query += ` ORDER BY l.is_boosted DESC, l.created_at DESC LIMIT $${paramIndex}`;
      queryParams.push(Math.min(limit, 20));

      // 9. Execute main query
      const result = await this.pool.query(query, queryParams);
      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} listings`);

      // 10. If no results with city filter, try without city (fallback)
      let fallbackListings = [];
      let fallbackMessage = null;

      if (result.rows.length === 0 && city_name && (category || title_keywords)) {
        console.log(`🔄 [MCP-AGENT] No results in ${city_name}, searching without city filter...`);

        let fallbackQuery = `
          SELECT
            l.id, l.title,
            c.name_ar as category,
            ct.name_ar as city,
            tt.name_ar as transaction_type
          FROM listings l
          JOIN categories c ON l.category_id = c.id
          LEFT JOIN cities ct ON l.city_id = ct.id
          LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
          WHERE l.status = 'active'
        `;

        const fallbackParams = [];
        let fbParamIndex = 1;

        if (category) {
          fallbackQuery += ` AND l.category_id = $${fbParamIndex}`;
          fallbackParams.push(category.id);
          fbParamIndex++;
        }

        if (title_keywords) {
          fallbackQuery += ` AND l.title ILIKE $${fbParamIndex}`;
          fallbackParams.push(`%${title_keywords}%`);
          fbParamIndex++;
        }

        fallbackQuery += ` ORDER BY l.is_boosted DESC, l.created_at DESC LIMIT $${fbParamIndex}`;
        fallbackParams.push(Math.min(limit, 10));

        const fallbackResult = await this.pool.query(fallbackQuery, fallbackParams);

        if (fallbackResult.rows.length > 0) {
          fallbackListings = fallbackResult.rows.map(row => ({
            id: row.id,
            title: row.title,
            category: row.category,
            city: row.city,
            transaction_type: row.transaction_type,
            listing_url: `${this.websiteUrl}/listing/${row.id}/`
          }));
          fallbackMessage = `لم أجد نتائج في "${city_name}"، لكن وجدت ${fallbackListings.length} إعلان في مدن أخرى`;
          console.log(`✅ [MCP-AGENT] Fallback found ${fallbackListings.length} listings in other cities`);
        }
      }

      // 11. Format results
      const listings = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        category: row.category,
        city: row.city,
        transaction_type: row.transaction_type,
        listing_url: `${this.websiteUrl}/listing/${row.id}/`
      }));

      // 12. Return with smart message
      if (listings.length > 0) {
        return {
          listings,
          count: listings.length,
          category: category?.name_ar || 'بحث حر',
          city_searched: city_name
        };
      } else if (fallbackListings.length > 0) {
        return {
          listings: fallbackListings,
          count: fallbackListings.length,
          category: category?.name_ar || 'بحث حر',
          city_searched: city_name,
          message: fallbackMessage,
          note: 'النتائج من مدن أخرى لأنه لا توجد نتائج في المدينة المطلوبة'
        };
      } else {
        return {
          listings: [],
          count: 0,
          category: category?.name_ar,
          city_searched: city_name,
          message: category
            ? `لا توجد إعلانات في فئة "${category.name_ar}"${city_name ? ` في ${city_name}` : ''}`
            : `لا توجد إعلانات مطابقة للبحث`
        };
      }

    } catch (error) {
      console.error('❌ [MCP-AGENT] Search error:', error);
      throw error;
    }
  }


  /**
   * Parse images field
   */
  parseImages(images) {
    if (!images) return [];
    if (typeof images === 'string') {
      try {
        return JSON.parse(images);
      } catch {
        return [];
      }
    }
    return Array.isArray(images) ? images : [];
  }

  /**
   * Get root categories (level 0) - Progressive navigation step 1
   * Enhanced to include descriptions for better understanding
   */
  async getRootCategories() {
    const query = `
      SELECT
        id,
        name_ar,
        name_en,
        slug,
        description_ar,
        description_en
      FROM categories
      WHERE parent_id IS NULL AND is_active = true
      ORDER BY sort_order ASC
    `;

    try {
      const result = await this.pool.query(query);
      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} root categories`);

      // Log root categories for debugging
      result.rows.forEach((cat, idx) => {
        console.log(`   ${idx + 1}. ${cat.name_ar} (${cat.slug})`);
      });

      return {
        categories: result.rows.map(cat => ({
          id: cat.id,
          name_ar: cat.name_ar,
          name_en: cat.name_en,
          slug: cat.slug,
          description_ar: cat.description_ar,
          description_en: cat.description_en
        })),
        count: result.rows.length,
        message: 'اختر فئة رئيسية'
      };
    } catch (error) {
      console.error('❌ [MCP-AGENT] Root categories query error:', error.message);
      throw error;
    }
  }

  /**
   * Get child categories for a parent - Progressive navigation step 2+
   * Enhanced to include descriptions for better understanding
   */
  async getChildCategories(parentId) {
    const query = `
      SELECT
        c.id,
        c.name_ar,
        c.name_en,
        c.slug,
        c.description_ar,
        c.description_en,
        c.level,
        NOT EXISTS(
          SELECT 1 FROM categories child
          WHERE child.parent_id = c.id AND child.is_active = true
        ) as is_leaf
      FROM categories c
      WHERE c.parent_id = $1 AND c.is_active = true
      ORDER BY c.sort_order ASC
      LIMIT 50
    `;

    try {
      const result = await this.pool.query(query, [parentId]);
      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} child categories for parent ${parentId}`);

      // Log categories with their descriptions for debugging
      result.rows.forEach((cat, idx) => {
        console.log(`   ${idx + 1}. ${cat.name_ar} (${cat.slug}) - IsLeaf: ${cat.is_leaf}`);
        if (cat.description_ar) {
          console.log(`      Description: ${cat.description_ar.substring(0, 80)}...`);
        }
      });

      return {
        categories: result.rows.map(cat => ({
          id: cat.id,
          name_ar: cat.name_ar,
          name_en: cat.name_en,
          slug: cat.slug,
          description_ar: cat.description_ar,
          description_en: cat.description_en,
          is_leaf: cat.is_leaf,
          level: cat.level
        })),
        parent_id: parentId,
        count: result.rows.length
      };
    } catch (error) {
      console.error('❌ [MCP-AGENT] Child categories query error:', error.message);
      throw error;
    }
  }

  /**
   * Get cities from database - Optimized for Arabic users
   */
  async getCities(params) {
    const { search } = params;

    let query = `
      SELECT id, name_ar, province_ar
      FROM cities
    `;
    const queryParams = [];

    if (search) {
      query += ` WHERE name_ar ILIKE $1 OR province_ar ILIKE $1`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY name_ar LIMIT 30`;

    try {
      const result = await this.pool.query(query, queryParams);
      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} cities`);
      return { cities: result.rows };
    } catch (error) {
      console.error('❌ [MCP-AGENT] Cities query error:', error.message);
      throw error;
    }
  }

  /**
   * Get listing details - Optimized for Arabic users
   */
  async getListingDetails(params) {
    const { listing_id, slug } = params;

    // Note: listings table does NOT have slug column, search by id only
    // If slug is provided, treat it as id (for backwards compatibility)
    const searchId = listing_id || slug;

    if (!searchId) {
      throw new Error('listing_id is required');
    }

    // NO images - query only text data
    let query = `
      SELECT
        l.id, l.title,
        c.name_ar as category, c.slug as category_slug,
        ct.name_ar as city, ct.province_ar as province,
        tt.name_ar as transaction_type
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN cities ct ON l.city_id = ct.id
      LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
      WHERE l.status = 'active'
        AND l.id = $1
    `;
    const queryParams = [searchId];

    try {
      const listingResult = await this.pool.query(query, queryParams);

      if (listingResult.rows.length === 0) {
        return { listing: null, message: 'الإعلان غير موجود' };
      }

      const listing = listingResult.rows[0];

      // Get only important attributes - limit to 8
      const attrsQuery = `
        SELECT la.name_ar, lav.value_text, lav.value_number
        FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = $1
          AND la.slug IN ('price', 'area', 'rooms', 'bathrooms', 'bedrooms', 'year', 'brand', 'model')
        ORDER BY la.sort_order
        LIMIT 8
      `;

      const attrsResult = await this.pool.query(attrsQuery, [listing.id]);

      // Format as simple key-value object
      listing.attributes = {};
      attrsResult.rows.forEach(attr => {
        listing.attributes[attr.name_ar] = attr.value_number || attr.value_text;
      });

      // NO images - only URL
      listing.listing_url = `${this.websiteUrl}/listing/${listing.id}/`;

      console.log(`✅ [MCP-AGENT] Found listing details with ${attrsResult.rows.length} attributes`);
      return { listing };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Listing details query error:', error.message);
      throw error;
    }
  }

  /**
   * 🆕 Search listings for hints - discover category from listing titles
   * البحث في عناوين الإعلانات لاكتشاف الفئة المناسبة
   * Useful for colloquial language (e.g., "طربيزات" → "طاولات صغيرة")
   */
  async searchListingsForHints(params) {
    const { keywords } = params;

    // Generate variations for search
    const keywordVariations = this.generateKeywordVariations(keywords);

    console.log(`📋 [MCP-AGENT] Searching listings for hints: "${keywords}" (${keywordVariations.length} variations)`);

    // Build ILIKE conditions for all variations
    const ilikeConds = keywordVariations.map((_, idx) => `l.title ILIKE '%' || $${idx + 1} || '%'`).join(' OR ');

    const query = `
      SELECT
        l.id,
        l.title,
        c.id as category_id,
        c.slug as category_slug,
        c.name_ar as category_name,
        c.path as category_path,
        p.name_ar as parent_category_name,
        NOT EXISTS (
          SELECT 1 FROM categories child
          WHERE child.parent_id = c.id AND child.is_active = true
        ) as is_leaf_category
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE l.status = 'active'
        AND (${ilikeConds})
      ORDER BY l.created_at DESC
      LIMIT 5
    `;

    try {
      const result = await this.pool.query(query, keywordVariations);

      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} listing hints for "${keywords}"`);

      // Log hints for debugging
      result.rows.forEach((hint, idx) => {
        console.log(`   ${idx + 1}. "${hint.title}" → ${hint.category_name} (${hint.category_slug})`);
      });

      // Extract unique categories from hints
      const categoryMap = new Map();
      result.rows.forEach(row => {
        if (!categoryMap.has(row.category_id)) {
          categoryMap.set(row.category_id, {
            id: row.category_id,
            slug: row.category_slug,
            name_ar: row.category_name,
            path: row.category_path,
            parent_name: row.parent_category_name,
            is_leaf: row.is_leaf_category,
            examples: []
          });
        }
        categoryMap.get(row.category_id).examples.push(row.title.substring(0, 50));
      });

      const suggestedCategories = Array.from(categoryMap.values());

      return {
        hints: result.rows.map(row => ({
          listing_id: row.id,
          title: row.title,
          category_slug: row.category_slug,
          category_name: row.category_name,
          is_leaf: row.is_leaf_category
        })),
        suggested_categories: suggestedCategories,
        count: result.rows.length,
        message: suggestedCategories.length > 0
          ? `Found ${suggestedCategories.length} categories from listing hints. Best match: "${suggestedCategories[0].name_ar}" (${suggestedCategories[0].slug})`
          : `No listings found with "${keywords}" in title. Try a different keyword.`
      };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Listing hints query error:', error.message);
      throw error;
    }
  }

  /**
   * 🆕 Generate Arabic keyword variations (singular/plural forms)
   * توليد اشتقاقات الكلمات العربية (مفرد/جمع)
   */
  generateKeywordVariations(keyword) {
    const variations = new Set([keyword.trim()]);
    const word = keyword.trim();

    // Common Arabic singular → plural patterns
    const patterns = [
      // أرض → أراضي (فعل → أفاعيل)
      { singular: /^(.)(.)(.?)$/, plural: (m) => `أ${m[1]}ا${m[2]}ي` },
      // سيارة → سيارات (فعالة → فعالات)
      { check: (w) => w.endsWith('ة'), transform: (w) => w.slice(0, -1) + 'ات' },
      // موبايل → موبايلات
      { check: (w) => !w.endsWith('ات') && !w.endsWith('ة'), transform: (w) => w + 'ات' },
      // مركبة → مركبات
      { check: (w) => w.endsWith('ة'), transform: (w) => w.slice(0, -1) + 'ات' },
    ];

    // Specific known mappings (قاموس معروف)
    const knownMappings = {
      'أرض': ['أراضي', 'أراضٍ', 'ارض', 'اراضي', 'land', 'lands'],
      'ارض': ['أراضي', 'أراضٍ', 'أرض', 'اراضي', 'land', 'lands'],
      'سيارة': ['سيارات', 'مركبة', 'مركبات', 'car', 'cars', 'vehicle'],
      'سيارات': ['سيارة', 'مركبة', 'مركبات', 'car', 'cars', 'vehicle'],
      'شقة': ['شقق', 'apartment', 'apartments', 'flat'],
      'شقق': ['شقة', 'apartment', 'apartments', 'flat'],
      'موبايل': ['موبايلات', 'جوال', 'جوالات', 'هاتف', 'هواتف', 'mobile', 'phone'],
      'موبايلات': ['موبايل', 'جوال', 'جوالات', 'هاتف', 'هواتف', 'mobile', 'phone'],
      'مركبة': ['مركبات', 'سيارة', 'سيارات', 'vehicle', 'vehicles'],
      'مركبات': ['مركبة', 'سيارة', 'سيارات', 'vehicle', 'vehicles'],
      'عقار': ['عقارات', 'real-estate', 'property'],
      'عقارات': ['عقار', 'real-estate', 'property'],
      'منزل': ['منازل', 'بيت', 'بيوت', 'house', 'home'],
      'بيت': ['بيوت', 'منزل', 'منازل', 'house', 'home'],
      'فيلا': ['فلل', 'فيلات', 'villa', 'villas'],
      'محل': ['محلات', 'محال', 'shop', 'store'],
      'مزرعة': ['مزارع', 'farm', 'farms'],
      'دراجة': ['دراجات', 'موتور', 'موتورات', 'motorcycle', 'bike'],
      'land': ['lands', 'أرض', 'أراضي', 'ارض', 'اراضي'],
      'car': ['cars', 'سيارة', 'سيارات', 'مركبة'],
      'apartment': ['apartments', 'flat', 'شقة', 'شقق'],
      'phone': ['phones', 'mobile', 'موبايل', 'جوال'],
    };

    // Add known mappings
    const lowerWord = word.toLowerCase();
    if (knownMappings[word]) {
      knownMappings[word].forEach(v => variations.add(v));
    }
    if (knownMappings[lowerWord]) {
      knownMappings[lowerWord].forEach(v => variations.add(v));
    }

    // Try pattern-based transformations
    patterns.forEach(pattern => {
      if (pattern.check && pattern.check(word)) {
        variations.add(pattern.transform(word));
      }
    });

    // Add without diacritics (تشكيل)
    const withoutDiacritics = word.replace(/[\u064B-\u065F\u0670]/g, '');
    variations.add(withoutDiacritics);

    console.log(`🔑 [MCP-AGENT] Keyword variations for "${keyword}":`, Array.from(variations));
    return Array.from(variations);
  }

  /**
   * Find matching LEAF category based on keywords
   * 🆕 PARALLEL SEARCH: Searches categories AND listings simultaneously, then analyzes combined results
   */
  async findCategory(params) {
    const {
      keywords,
      parent_id = null,
      search_in_description = true
    } = params;

    // 🆕 Generate keyword variations
    const keywordVariations = this.generateKeywordVariations(keywords);

    console.log(`🔍 [MCP-AGENT] Finding category with keywords: "${keywords}" + ${keywordVariations.length - 1} variations`);
    console.log(`   Variations: ${keywordVariations.join(', ')}`);

    // 🆕 PARALLEL SEARCH: Search categories and listings at the same time
    const listingSearchPromise = this.searchListingsForHints({ keywords });
    console.log(`📋 [MCP-AGENT] Started parallel listing search for "${keywords}"`);

    // 🆕 Build dynamic query to search for ALL keyword variations
    // Create placeholders for each variation
    const placeholders = keywordVariations.map((_, idx) => `$${idx + 1}`);
    const queryParams = [...keywordVariations];

    // Build CASE for match scoring - check all variations
    const exactMatchConditions = placeholders.map(p => `c.name_ar = ${p} OR c.name_en = ${p}`).join(' OR ');
    const startsWithConditions = placeholders.map(p => `c.name_ar ILIKE ${p} || '%' OR c.name_en ILIKE ${p} || '%'`).join(' OR ');
    const containsNameConditions = placeholders.map(p => `c.name_ar ILIKE '%' || ${p} || '%' OR c.name_en ILIKE '%' || ${p} || '%'`).join(' OR ');
    const slugConditions = placeholders.map(p => `c.slug ILIKE '%' || ${p} || '%'`).join(' OR ');
    const descConditions = placeholders.map(p => `c.description_ar ILIKE '%' || ${p} || '%' OR c.description_en ILIKE '%' || ${p} || '%'`).join(' OR ');

    let query = `
      SELECT
        c.id,
        c.name_ar,
        c.name_en,
        c.slug,
        c.description_ar,
        c.description_en,
        c.level,
        p.slug as parent_slug,
        p.name_ar as parent_name,
        p.id as parent_id,
        NOT EXISTS (
          SELECT 1 FROM categories child
          WHERE child.parent_id = c.id AND child.is_active = true
        ) as is_leaf,
        CASE
          -- Exact match in name (highest priority)
          WHEN ${exactMatchConditions} THEN 100
          -- Starts with keyword in name
          WHEN ${startsWithConditions} THEN 90
          -- Contains keyword in name
          WHEN ${containsNameConditions} THEN 70
          -- Slug match
          WHEN ${slugConditions} THEN 60
          -- Description match (lower priority)
          WHEN ${descConditions} THEN 50
          ELSE 40
        END as match_score,
        CASE
          WHEN ${containsNameConditions} THEN 'name'
          WHEN ${slugConditions} THEN 'slug'
          WHEN ${descConditions} THEN 'description'
          ELSE 'none'
        END as matched_field
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.is_active = true
    `;

    let paramIndex = keywordVariations.length + 1;

    // Add parent_id filter if specified
    if (parent_id) {
      query += ` AND c.parent_id = $${paramIndex}`;
      queryParams.push(parent_id);
      paramIndex++;
    }

    // Add search conditions - search for ANY of the variations
    if (search_in_description) {
      query += ` AND (${containsNameConditions} OR ${slugConditions} OR ${descConditions})`;
    } else {
      query += ` AND (${containsNameConditions} OR ${slugConditions})`;
    }

    query += `
      ORDER BY
        is_leaf DESC,
        match_score DESC,
        c.level DESC
      LIMIT 10
    `;

    try {
      const result = await this.pool.query(query, queryParams);

      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} matching categories for "${keywords}"`);

      // Log matches for debugging
      result.rows.forEach((cat, idx) => {
        console.log(`   ${idx + 1}. ${cat.name_ar} (${cat.slug}) - Score: ${cat.match_score}, Field: ${cat.matched_field}, IsLeaf: ${cat.is_leaf}`);
      });

      // 🆕 WAIT FOR PARALLEL LISTING SEARCH
      const listingHints = await listingSearchPromise;
      console.log(`📋 [MCP-AGENT] Listing search completed: ${listingHints.count} hints found`);

      // 🆕 ANALYZE COMBINED RESULTS
      const leafCategories = result.rows.filter(c => c.is_leaf);
      let bestMatch = leafCategories.length > 0 ? leafCategories[0] : result.rows[0];

      // If no category found from direct search, use listing hints
      if (!bestMatch && listingHints.suggested_categories?.length > 0) {
        const suggestedCat = listingHints.suggested_categories[0];
        bestMatch = {
          id: suggestedCat.id,
          name_ar: suggestedCat.name_ar,
          slug: suggestedCat.slug,
          is_leaf: suggestedCat.is_leaf,
          match_score: 75,
          matched_field: 'listing_title',
          parent_name: suggestedCat.parent_name
        };
        console.log(`✅ [MCP-AGENT] Using category from listing hints: ${suggestedCat.name_ar} (${suggestedCat.slug})`);
      }

      // If category found but listing hints suggest a more specific leaf category
      if (bestMatch && !bestMatch.is_leaf && listingHints.suggested_categories?.length > 0) {
        const leafFromHints = listingHints.suggested_categories.find(c => c.is_leaf);
        if (leafFromHints) {
          console.log(`🔄 [MCP-AGENT] Upgrading to leaf category from hints: ${leafFromHints.name_ar}`);
          bestMatch = {
            id: leafFromHints.id,
            name_ar: leafFromHints.name_ar,
            slug: leafFromHints.slug,
            is_leaf: true,
            match_score: 80,
            matched_field: 'listing_title',
            parent_name: leafFromHints.parent_name
          };
        }
      }

      // Build parent context for non-leaf categories
      const categoriesWithContext = result.rows.map(cat => ({
        id: cat.id,
        name_ar: cat.name_ar,
        name_en: cat.name_en,
        slug: cat.slug,
        level: cat.level,
        is_leaf: cat.is_leaf,
        match_score: cat.match_score,
        matched_field: cat.matched_field,
        parent_name: cat.parent_name,
        parent_slug: cat.parent_slug,
        description_snippet: cat.matched_field === 'description'
          ? (cat.description_ar || cat.description_en || '').substring(0, 100) + '...'
          : null
      }));

      return {
        categories: categoriesWithContext,
        best_match: bestMatch ? {
          id: bestMatch.id,
          name_ar: bestMatch.name_ar,
          slug: bestMatch.slug,
          is_leaf: bestMatch.is_leaf,
          match_score: bestMatch.match_score,
          matched_field: bestMatch.matched_field,
          parent_name: bestMatch.parent_name
        } : null,
        leaf_count: leafCategories.length,
        total_count: result.rows.length,
        listing_hints: listingHints,
        suggestion: bestMatch
          ? `Found "${bestMatch.name_ar}" (slug: "${bestMatch.slug}"). ${bestMatch.is_leaf ? 'This is a leaf category - ready to search!' : 'This is NOT a leaf category - get child categories first.'}`
          : parent_id
            ? `No categories found under parent ${parent_id} for "${keywords}". Try searching in a different parent category or use deep_search_categories.`
            : `No categories found for "${keywords}". Try using deep_search_categories to search more thoroughly.`
      };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Category search error:', error.message);
      throw error;
    }
  }

  /**
   * Deep search through category tree recursively
   * Use this when simple find_category returns no results
   */
  async deepSearchCategories(params) {
    const {
      keywords,
      max_depth = 3,
      root_category_id = null
    } = params;

    console.log(`🔎 [MCP-AGENT] Starting deep search for "${keywords}", max_depth: ${max_depth}, root: ${root_category_id || 'all'}`);

    try {
      // Step 1: Get all categories up to max_depth
      // Note: Using explicit text[] cast to avoid PostgreSQL type mismatch errors
      let baseQuery = `
        WITH RECURSIVE category_tree AS (
          -- Base case: root categories or specified root
          SELECT
            c.id,
            c.name_ar,
            c.name_en,
            c.slug,
            c.description_ar,
            c.description_en,
            c.level,
            c.parent_id,
            ARRAY[c.id::text]::text[] as path_ids,
            ARRAY[c.name_ar::text]::text[] as path_names,
            NOT EXISTS (
              SELECT 1 FROM categories child
              WHERE child.parent_id = c.id AND child.is_active = true
            ) as is_leaf,
            0 as depth
          FROM categories c
          WHERE c.is_active = true
      `;

      const queryParams = [];
      let paramIndex = 1;

      if (root_category_id) {
        baseQuery += ` AND c.id = $${paramIndex}`;
        queryParams.push(root_category_id);
        paramIndex++;
      } else {
        baseQuery += ` AND c.parent_id IS NULL`;
      }

      baseQuery += `
          UNION ALL

          -- Recursive case: get children
          SELECT
            c.id,
            c.name_ar,
            c.name_en,
            c.slug,
            c.description_ar,
            c.description_en,
            c.level,
            c.parent_id,
            (ct.path_ids || c.id::text)::text[],
            (ct.path_names || c.name_ar::text)::text[],
            NOT EXISTS (
              SELECT 1 FROM categories child
              WHERE child.parent_id = c.id AND child.is_active = true
            ) as is_leaf,
            ct.depth + 1
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
          WHERE c.is_active = true
            AND ct.depth < $${paramIndex}
        )
        SELECT
          *,
          CASE
            -- Exact match in name (highest priority)
            WHEN name_ar = $${paramIndex + 1} OR name_en = $${paramIndex + 1} THEN 100
            -- Starts with keyword in name
            WHEN name_ar ILIKE $${paramIndex + 1} || '%' OR name_en ILIKE $${paramIndex + 1} || '%' THEN 90
            -- Contains keyword in name
            WHEN name_ar ILIKE '%' || $${paramIndex + 1} || '%' OR name_en ILIKE '%' || $${paramIndex + 1} || '%' THEN 70
            -- Slug match
            WHEN slug ILIKE '%' || $${paramIndex + 1} || '%' THEN 60
            -- Description match (lower priority)
            WHEN description_ar ILIKE '%' || $${paramIndex + 1} || '%' OR description_en ILIKE '%' || $${paramIndex + 1} || '%' THEN 50
            ELSE 0
          END as match_score,
          CASE
            WHEN name_ar ILIKE '%' || $${paramIndex + 1} || '%' OR name_en ILIKE '%' || $${paramIndex + 1} || '%' THEN 'name'
            WHEN slug ILIKE '%' || $${paramIndex + 1} || '%' THEN 'slug'
            WHEN description_ar ILIKE '%' || $${paramIndex + 1} || '%' OR description_en ILIKE '%' || $${paramIndex + 1} || '%' THEN 'description'
            ELSE 'none'
          END as matched_field
        FROM category_tree
        WHERE
          name_ar ILIKE '%' || $${paramIndex + 1} || '%' OR
          name_en ILIKE '%' || $${paramIndex + 1} || '%' OR
          slug ILIKE '%' || $${paramIndex + 1} || '%' OR
          description_ar ILIKE '%' || $${paramIndex + 1} || '%' OR
          description_en ILIKE '%' || $${paramIndex + 1} || '%'
        ORDER BY
          is_leaf DESC,
          match_score DESC,
          depth ASC
        LIMIT 15
      `;

      queryParams.push(max_depth, keywords);

      const result = await this.pool.query(baseQuery, queryParams);

      console.log(`✅ [MCP-AGENT] Deep search found ${result.rows.length} categories`);

      // Log detailed matches
      result.rows.forEach((cat, idx) => {
        const pathStr = cat.path_names.join(' > ');
        console.log(`   ${idx + 1}. ${pathStr}`);
        console.log(`      Score: ${cat.match_score}, Field: ${cat.matched_field}, IsLeaf: ${cat.is_leaf}, Depth: ${cat.depth}`);
      });

      const leafCategories = result.rows.filter(c => c.is_leaf);
      const bestMatch = leafCategories.length > 0 ? leafCategories[0] : result.rows[0];

      // Format results with full path context
      const categoriesWithPath = result.rows.map(cat => ({
        id: cat.id,
        name_ar: cat.name_ar,
        name_en: cat.name_en,
        slug: cat.slug,
        level: cat.level,
        is_leaf: cat.is_leaf,
        match_score: cat.match_score,
        matched_field: cat.matched_field,
        depth: cat.depth,
        path_names: cat.path_names,
        path_string: cat.path_names.join(' > '),
        description_snippet: cat.matched_field === 'description'
          ? (cat.description_ar || cat.description_en || '').substring(0, 150) + '...'
          : null
      }));

      return {
        categories: categoriesWithPath,
        best_match: bestMatch ? {
          id: bestMatch.id,
          name_ar: bestMatch.name_ar,
          slug: bestMatch.slug,
          is_leaf: bestMatch.is_leaf,
          match_score: bestMatch.match_score,
          matched_field: bestMatch.matched_field,
          path_string: bestMatch.path_names.join(' > ')
        } : null,
        leaf_count: leafCategories.length,
        total_count: result.rows.length,
        search_depth: max_depth,
        suggestion: bestMatch
          ? `Found "${bestMatch.name_ar}" via path: ${bestMatch.path_names.join(' > ')}. ${bestMatch.is_leaf ? 'This is a leaf category - use slug "' + bestMatch.slug + '" to search listings!' : 'Get children with get_child_categories("' + bestMatch.id + '")'}`
          : `No categories found for "${keywords}" even with deep search. The category might not exist, or try different keywords.`
      };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Deep search error:', error.message);
      throw error;
    }
  }

  /**
   * Process user message with AI and database tools
   * Main entry point - routes to OpenAI or Anthropic
   */
  async processMessage(userMessage, language = null) {
    const detectedLanguage = language || detectLanguage(userMessage);

    console.log('\n' + '='.repeat(80));
    console.log('🤖 [MCP-AGENT] Processing message');
    console.log('Provider:', this.provider);
    console.log('='.repeat(80));
    console.log('Message:', userMessage);
    console.log('Language:', detectedLanguage);
    console.log('='.repeat(80) + '\n');

    // Determine which provider to use
    if (this.provider === 'openai' && this.openai) {
      return this.processWithOpenAI(userMessage, detectedLanguage);
    } else if (this.anthropic) {
      console.log('📢 [MCP-AGENT] Using Anthropic as fallback');
      return this.processWithAnthropic(userMessage, detectedLanguage);
    } else {
      throw new Error('No AI provider available. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
    }
  }

  /**
   * Process message using OpenAI with function calling
   */
  async processWithOpenAI(userMessage, detectedLanguage) {
    if (!this.pool) {
      throw new Error('Database connection not available. Set MCP_DATABASE_URL.');
    }

    try {
      const messages = [
        {
          role: 'system',
          content: this.systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      // Convert tools to OpenAI format
      const openaiTools = this.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema
        }
      }));

      let response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages,
        tools: openaiTools,
        tool_choice: 'auto'
      });

      console.log('🤖 [MCP-AGENT] OpenAI response:', {
        finish_reason: response.choices[0].finish_reason,
        has_tool_calls: !!response.choices[0].message.tool_calls
      });

      let toolCallCount = 0;

      // Handle tool calls loop
      while (response.choices[0].finish_reason === 'tool_calls' || response.choices[0].message.tool_calls) {
        const toolCalls = response.choices[0].message.tool_calls;

        if (!toolCalls || toolCalls.length === 0) break;

        messages.push(response.choices[0].message);

        for (const toolCall of toolCalls) {
          console.log(`🔧 [MCP-AGENT] Tool call: ${toolCall.function.name}`);
          toolCallCount++;

          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await this.executeTool(toolCall.function.name, args);

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error) {
            console.error(`❌ [MCP-AGENT] Tool error:`, error);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error.message })
            });
          }
        }

        response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages,
          tools: openaiTools,
          tool_choice: 'auto'
        });

        console.log('🤖 [MCP-AGENT] Follow-up response:', {
          finish_reason: response.choices[0].finish_reason,
          has_tool_calls: !!response.choices[0].message.tool_calls
        });

        // Safety break to prevent infinite loops
        if (toolCallCount > 10) {
          console.warn('⚠️ [MCP-AGENT] Breaking tool call loop after 10 iterations');
          break;
        }
      }

      const finalResponse = response.choices[0].message.content || 'No response generated.';

      console.log('✅ [MCP-AGENT] Response complete, length:', finalResponse.length);

      return {
        response: finalResponse,
        language: detectedLanguage,
        toolsUsed: toolCallCount,
        provider: 'openai'
      };

    } catch (error) {
      console.error('❌ [MCP-AGENT] OpenAI error:', error);

      // Fallback to Anthropic if OpenAI fails
      if (this.anthropic) {
        console.log('📢 [MCP-AGENT] Falling back to Anthropic after OpenAI error');
        return this.processWithAnthropic(userMessage, detectedLanguage);
      }

      throw error;
    }
  }

  /**
   * Process message using Anthropic Claude (fallback)
   */
  async processWithAnthropic(userMessage, detectedLanguage) {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Set ANTHROPIC_API_KEY.');
    }

    if (!this.pool) {
      throw new Error('Database connection not available. Set MCP_DATABASE_URL.');
    }

    try {
      const messages = [
        {
          role: 'user',
          content: userMessage
        }
      ];

      let response = await this.anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: this.systemPrompt,
        tools: this.tools,
        messages
      });

      console.log('🤖 [MCP-AGENT] Anthropic response:', {
        stop_reason: response.stop_reason,
        content_types: response.content.map(c => c.type)
      });

      let toolCallCount = 0;

      // Handle tool use loop
      while (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(c => c.type === 'tool_use');
        const toolResults = [];

        for (const toolUse of toolUseBlocks) {
          console.log(`🔧 [MCP-AGENT] Tool call: ${toolUse.name}`);
          toolCallCount++;

          try {
            const result = await this.executeTool(toolUse.name, toolUse.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(result)
            });
          } catch (error) {
            console.error(`❌ [MCP-AGENT] Tool error: ${error.message}`);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: error.message }),
              is_error: true
            });
          }
        }

        messages.push({
          role: 'assistant',
          content: response.content
        });
        messages.push({
          role: 'user',
          content: toolResults
        });

        response = await this.anthropic.messages.create({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: this.systemPrompt,
          tools: this.tools,
          messages
        });

        console.log('🤖 [MCP-AGENT] Follow-up response:', {
          stop_reason: response.stop_reason,
          content_types: response.content.map(c => c.type)
        });

        // Safety break
        if (toolCallCount > 10) {
          console.warn('⚠️ [MCP-AGENT] Breaking tool call loop after 10 iterations');
          break;
        }
      }

      const textContent = response.content.find(c => c.type === 'text');
      const finalResponse = textContent ? textContent.text : 'No response generated.';

      console.log('✅ [MCP-AGENT] Response complete, length:', finalResponse.length);

      return {
        response: finalResponse,
        language: detectedLanguage,
        toolsUsed: toolCallCount,
        provider: 'anthropic'
      };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Anthropic error:', error);
      logger.error('MCP Agent Anthropic error:', error);
      throw error;
    }
  }

  /**
   * Transcribe voice message using OpenAI Whisper
   */
  async transcribeAudio(audioBuffer) {
    if (!this.openai) {
      throw new Error('OpenAI is required for audio transcription');
    }

    const { toFile } = require('openai');
    const file = await toFile(audioBuffer, 'audio.ogg', { type: 'audio/ogg' });

    const response = await this.openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1'
    });

    return response.text;
  }

  /**
   * Format results for bot response
   */
  formatListingsForBot(listings, language = 'ar') {
    if (!listings || listings.length === 0) {
      return language === 'ar'
        ? 'لم أجد نتائج مطابقة لبحثك. جرب تغيير معايير البحث.'
        : 'No results found matching your search. Try adjusting your criteria.';
    }

    let message = '';

    if (language === 'ar') {
      message = `🏠 وجدت ${listings.length} نتيجة:\n\n`;

      listings.forEach((item, index) => {
        message += `${index + 1}️⃣ ${item.title}\n`;

        // Display dynamic attributes
        if (item.attribute_details && item.attribute_details.length > 0) {
          item.attribute_details.slice(0, 5).forEach(attr => {
            const icon = this.getAttributeIcon(attr.slug);
            const unit = attr.unit_ar || '';
            message += `   ${icon} ${attr.name_ar}: ${attr.value}${unit ? ' ' + unit : ''}\n`;
          });
        }

        if (item.city_name) message += `   📍 ${item.city_name}${item.province ? '، ' + item.province : ''}\n`;
        message += `   🔗 ${item.listing_url}\n\n`;
      });
    } else {
      message = `🏠 Found ${listings.length} results:\n\n`;

      listings.forEach((item, index) => {
        message += `${index + 1}️⃣ ${item.title}\n`;

        // Display dynamic attributes
        if (item.attribute_details && item.attribute_details.length > 0) {
          item.attribute_details.slice(0, 5).forEach(attr => {
            const icon = this.getAttributeIcon(attr.slug);
            const unit = attr.unit_en || '';
            message += `   ${icon} ${attr.name_en}: ${attr.value}${unit ? ' ' + unit : ''}\n`;
          });
        }

        if (item.city_name) message += `   📍 ${item.city_name_en || item.city_name}${item.province ? ', ' + item.province : ''}\n`;
        message += `   🔗 ${item.listing_url}\n\n`;
      });
    }

    return message;
  }

  /**
   * Get icon for common attributes
   */
  getAttributeIcon(slug) {
    const icons = {
      'price': '💰',
      'area': '📐',
      'bedrooms': '🛏️',
      'bathrooms': '🚿',
      'floor': '🏢',
      'year': '📅',
      'mileage': '🛣️',
      'brand': '🏷️',
      'model': '📱',
      'color': '🎨',
      'condition': '✨',
      'transmission': '⚙️',
      'fuel_type': '⛽',
      'ram': '💾',
      'storage': '💿',
      'screen_size': '📺',
      'furnished': '🪑',
      'parking': '🅿️'
    };
    return icons[slug] || '•';
  }

  /**
   * Clear attribute cache
   */
  clearAttributeCache() {
    this.attributeCache.clear();
    console.log('🧹 [MCP-AGENT] Attribute cache cleared');
  }

  /**
   * Close database connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 [MCP-AGENT] Database connection pool closed');
    }
  }
}

// Export singleton instance
module.exports = new MCPAgent();
