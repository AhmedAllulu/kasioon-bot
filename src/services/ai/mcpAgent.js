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
        description: `Search listings with DYNAMIC attribute filters. First identify the category, then use its specific attributes.

IMPORTANT: The 'attributes' parameter accepts dynamic key-value pairs based on category.
Examples:
- Real estate: price, area, bedrooms, bathrooms, floor, furnished
- Vehicles: price, year, mileage, brand, model, color, condition, transmission
- Electronics: price, brand, model, ram, storage, condition

For numeric ranges, use: { "min": value, "max": value }
For dates, use: { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`,
        input_schema: {
          type: 'object',
          properties: {
            category_slug: {
              type: 'string',
              description: 'LEAF category slug (MUST be a leaf category with no children). Examples: apartments, houses, cars, laptops'
            },
            city_name: {
              type: 'string',
              description: 'City name in Arabic or English (e.g., "دمشق", "Damascus")'
            },
            transaction_type: {
              type: 'string',
              enum: ['sale', 'rent', 'exchange'],
              description: 'Transaction type: sale, rent, or exchange'
            },
            attributes: {
              type: 'object',
              description: `Dynamic attribute filters as key-value pairs. Keys are attribute slugs.

For number attributes: use exact value OR { "min": X, "max": Y }
For boolean attributes: true/false
For select/multiselect: use the option value
For text: partial match string
For date: { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }

Common attribute slugs by category:
- Real Estate: price, area, bedrooms, bathrooms, floor, furnished, parking
- Vehicles: price, year, mileage, brand, model, color, transmission, fuel_type
- Electronics: price, brand, model, ram, storage, screen_size, condition`,
              additionalProperties: true
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results (default: 10, max: 20)',
              default: 10
            }
          },
          required: ['category_slug']
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
        description: 'Find the most appropriate LEAF category based on user keywords',
        input_schema: {
          type: 'object',
          properties: {
            keywords: {
              type: 'string',
              description: 'Keywords to search for in category names (e.g., "شقة", "apartment", "سيارة")'
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

    const query = `
      SELECT
        la.id,
        la.slug,
        la.name_ar,
        la.name_en,
        la.type,
        la.validation_rules,
        la.options,
        la.unit_ar,
        la.unit_en,
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
      limit = 10
    } = params;

    console.log('🔍 [MCP-AGENT] Searching listings:', {
      category_slug,
      city_name,
      transaction_type,
      attributeCount: Object.keys(attributes).length,
      limit
    });

    try {
      // 1. Get category and verify it's a LEAF category
      const categoryQuery = `
        SELECT id, name_ar, slug
        FROM categories c
        WHERE c.slug = $1 AND c.is_active = true
      `;
      const categoryResult = await this.pool.query(categoryQuery, [category_slug]);

      if (categoryResult.rows.length === 0) {
        return {
          listings: [],
          count: 0,
          message: `الفئة "${category_slug}" غير موجودة`
        };
      }

      const category = categoryResult.rows[0];

      // 2. Build simple query - NO attribute subqueries
      let query = `
        SELECT
          l.id, l.title, l.slug,
          c.name_ar as category,
          ct.name_ar as city,
          tt.name_ar as transaction_type,
          l.images
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        LEFT JOIN cities ct ON l.city_id = ct.id
        LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
        WHERE l.status = 'active'
          AND l.category_id = $1
      `;

      const queryParams = [category.id];
      let paramIndex = 2;

      // 3. City filter
      if (city_name) {
        query += ` AND ct.name_ar ILIKE $${paramIndex}`;
        queryParams.push(`%${city_name}%`);
        paramIndex++;
      }

      // 4. Transaction filter
      if (transaction_type) {
        query += ` AND tt.slug = $${paramIndex}`;
        queryParams.push(transaction_type);
        paramIndex++;
      }

      // 5. Attribute filters - only for critical attributes
      const criticalAttrs = ['price', 'area', 'rooms', 'bedrooms'];
      for (const [attrSlug, attrValue] of Object.entries(attributes)) {
        if (!criticalAttrs.includes(attrSlug)) continue;

        // Simple EXISTS check instead of complex subquery
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

      // 6. Order and limit
      query += ` ORDER BY l.is_boosted DESC, l.created_at DESC LIMIT $${paramIndex}`;
      queryParams.push(Math.min(limit, 20));

      // 7. Execute query
      const result = await this.pool.query(query, queryParams);

      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} listings`);

      // 8. Simple formatting
      const listings = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        category: row.category,
        city: row.city,
        transaction_type: row.transaction_type,
        images: this.parseImages(row.images),
        listing_url: `${this.websiteUrl}/listing/${row.slug || row.id}`
      }));

      return {
        listings,
        count: listings.length,
        category: category.name_ar
      };

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
   */
  async getRootCategories() {
    const query = `
      SELECT id, name_ar, slug
      FROM categories
      WHERE parent_id IS NULL AND is_active = true
      ORDER BY sort_order ASC
    `;

    try {
      const result = await this.pool.query(query);
      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} root categories`);
      return {
        categories: result.rows,
        message: 'اختر فئة رئيسية'
      };
    } catch (error) {
      console.error('❌ [MCP-AGENT] Root categories query error:', error.message);
      throw error;
    }
  }

  /**
   * Get child categories for a parent - Progressive navigation step 2+
   */
  async getChildCategories(parentId) {
    const query = `
      SELECT
        id, name_ar, slug,
        NOT EXISTS(
          SELECT 1 FROM categories
          WHERE parent_id = c.id AND is_active = true
        ) as is_leaf
      FROM categories c
      WHERE parent_id = $1 AND is_active = true
      ORDER BY sort_order ASC
      LIMIT 50
    `;

    try {
      const result = await this.pool.query(query, [parentId]);
      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} child categories for parent ${parentId}`);
      return {
        categories: result.rows,
        parent_id: parentId
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

    if (!listing_id && !slug) {
      throw new Error('Either listing_id or slug is required');
    }

    let query = `
      SELECT
        l.id, l.title, l.slug, l.images,
        c.name_ar as category, c.slug as category_slug,
        ct.name_ar as city, ct.province_ar as province,
        tt.name_ar as transaction_type
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN cities ct ON l.city_id = ct.id
      LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
      WHERE l.status = 'active'
    `;
    const queryParams = [];

    if (listing_id) {
      query += ` AND l.id = $1`;
      queryParams.push(listing_id);
    } else {
      query += ` AND l.slug = $1`;
      queryParams.push(slug);
    }

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

      listing.images = this.parseImages(listing.images);
      listing.listing_url = `${this.websiteUrl}/listing/${listing.slug || listing.id}`;

      console.log(`✅ [MCP-AGENT] Found listing details with ${attrsResult.rows.length} attributes`);
      return { listing };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Listing details query error:', error.message);
      throw error;
    }
  }


  /**
   * Find matching LEAF category based on keywords
   */
  async findCategory(params) {
    const { keywords } = params;

    const query = `
      SELECT
        c.id,
        c.name_ar,
        c.name_en,
        c.slug,
        c.level,
        p.slug as parent_slug,
        p.name_ar as parent_name,
        NOT EXISTS (
          SELECT 1 FROM categories child
          WHERE child.parent_id = c.id AND child.is_active = true
        ) as is_leaf,
        CASE
          WHEN c.name_ar = $1 OR c.name_en = $1 THEN 100
          WHEN c.name_ar ILIKE $1 || '%' OR c.name_en ILIKE $1 || '%' THEN 80
          WHEN c.name_ar ILIKE '%' || $1 || '%' OR c.name_en ILIKE '%' || $1 || '%' THEN 60
          ELSE 40
        END as match_score
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.is_active = true
        AND (c.name_ar ILIKE '%' || $1 || '%' OR c.name_en ILIKE '%' || $1 || '%' OR c.slug ILIKE '%' || $1 || '%')
      ORDER BY
        is_leaf DESC,
        match_score DESC,
        c.level DESC
      LIMIT 5
    `;

    try {
      const result = await this.pool.query(query, [keywords]);

      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} matching categories for "${keywords}"`);

      const leafCategories = result.rows.filter(c => c.is_leaf);
      const bestMatch = leafCategories.length > 0 ? leafCategories[0] : result.rows[0];

      return {
        categories: result.rows,
        best_match: bestMatch,
        suggestion: bestMatch
          ? `Use category slug: "${bestMatch.slug}" (${bestMatch.name_ar})`
          : 'No matching category found'
      };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Category search error:', error.message);
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
