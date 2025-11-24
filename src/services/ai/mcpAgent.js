/**
 * MCP-Powered AI Agent for Qasioun Marketplace
 *
 * This agent uses Claude AI with direct PostgreSQL database access via MCP
 * to provide 100% accurate search results without API intermediaries.
 *
 * Features:
 * - Direct database queries via MCP PostgreSQL server
 * - Real-time data (no cache delays)
 * - Enforced LEAF category selection
 * - Native Arabic language handling
 * - Structured tool use for database operations
 */

const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { detectLanguage } = require('../../utils/languageDetector');

class MCPAgent {
  constructor() {
    // Initialize Anthropic client
    this.anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    }) : null;

    // Initialize PostgreSQL connection pool for marketplace database
    this.pool = null;
    this.initializeDatabase();

    // Load system prompt
    this.systemPrompt = this.loadSystemPrompt();

    // Website URL for listing links
    this.websiteUrl = process.env.KASIOON_WEBSITE_URL || 'https://kasioon.com';

    // Define database tools for Claude
    this.tools = this.defineTools();

    console.log('🤖 [MCP-AGENT] MCP Agent initialized:', {
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
- Always query the database for accurate results`;
  }

  /**
   * Define database tools for Claude
   */
  defineTools() {
    return [
      {
        name: 'search_listings',
        description: 'Search for listings in the marketplace database. Use this to find apartments, houses, cars, electronics, etc.',
        input_schema: {
          type: 'object',
          properties: {
            category_slug: {
              type: 'string',
              description: 'The slug of the LEAF category to search in (e.g., "apartments", "houses", "cars")'
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
            min_price: {
              type: 'number',
              description: 'Minimum price filter'
            },
            max_price: {
              type: 'number',
              description: 'Maximum price filter'
            },
            min_area: {
              type: 'number',
              description: 'Minimum area in square meters'
            },
            max_area: {
              type: 'number',
              description: 'Maximum area in square meters'
            },
            bedrooms: {
              type: 'integer',
              description: 'Number of bedrooms (for real estate)'
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return (default: 10)',
              default: 10
            }
          },
          required: []
        }
      },
      {
        name: 'get_categories',
        description: 'Get available categories. Use this to understand the category hierarchy and find LEAF categories.',
        input_schema: {
          type: 'object',
          properties: {
            parent_slug: {
              type: 'string',
              description: 'Optional parent category slug to get subcategories'
            },
            only_leaf: {
              type: 'boolean',
              description: 'If true, only return LEAF categories (categories with no children)',
              default: false
            }
          },
          required: []
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
        description: 'Get full details of a specific listing including all attributes',
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
   * Execute a database tool
   */
  async executeTool(toolName, toolInput) {
    if (!this.pool) {
      throw new Error('Database connection not available');
    }

    console.log(`🔧 [MCP-AGENT] Executing tool: ${toolName}`, toolInput);

    switch (toolName) {
      case 'search_listings':
        return this.searchListings(toolInput);
      case 'get_categories':
        return this.getCategories(toolInput);
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
   * Search listings in the database
   */
  async searchListings(params) {
    const {
      category_slug,
      city_name,
      transaction_type,
      min_price,
      max_price,
      min_area,
      max_area,
      bedrooms,
      limit = 10
    } = params;

    let query = `
      SELECT
        l.id,
        l.title,
        l.description,
        l.slug,
        l.images,
        l.created_at,
        l.views_count,
        l.is_boosted,
        c.name_ar as category_name,
        c.slug as category_slug,
        ct.name_ar as city_name,
        ct.province_ar as province,
        tt.name_ar as transaction_type,
        tt.slug as transaction_slug,
        (SELECT lav.value_number
         FROM listing_attribute_values lav
         JOIN listing_attributes la ON lav.attribute_id = la.id
         WHERE lav.listing_id = l.id AND la.slug = 'price'
        ) as price,
        (SELECT lav.value_number
         FROM listing_attribute_values lav
         JOIN listing_attributes la ON lav.attribute_id = la.id
         WHERE lav.listing_id = l.id AND la.slug = 'area'
        ) as area,
        (SELECT lav.value_number
         FROM listing_attribute_values lav
         JOIN listing_attributes la ON lav.attribute_id = la.id
         WHERE lav.listing_id = l.id AND la.slug = 'bedrooms'
        ) as bedrooms
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN cities ct ON l.city_id = ct.id
      LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
      WHERE l.status = 'active'
    `;

    const queryParams = [];
    let paramIndex = 1;

    // Category filter (must be LEAF category)
    if (category_slug) {
      query += ` AND c.slug = $${paramIndex}`;
      queryParams.push(category_slug);
      paramIndex++;
    }

    // City filter
    if (city_name) {
      query += ` AND (ct.name_ar ILIKE $${paramIndex} OR ct.name_en ILIKE $${paramIndex})`;
      queryParams.push(`%${city_name}%`);
      paramIndex++;
    }

    // Transaction type filter
    if (transaction_type) {
      query += ` AND tt.slug = $${paramIndex}`;
      queryParams.push(transaction_type);
      paramIndex++;
    }

    // Price filters
    if (min_price) {
      query += ` AND EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id AND la.slug = 'price' AND lav.value_number >= $${paramIndex}
      )`;
      queryParams.push(min_price);
      paramIndex++;
    }

    if (max_price) {
      query += ` AND EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id AND la.slug = 'price' AND lav.value_number <= $${paramIndex}
      )`;
      queryParams.push(max_price);
      paramIndex++;
    }

    // Area filters
    if (min_area) {
      query += ` AND EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id AND la.slug = 'area' AND lav.value_number >= $${paramIndex}
      )`;
      queryParams.push(min_area);
      paramIndex++;
    }

    if (max_area) {
      query += ` AND EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id AND la.slug = 'area' AND lav.value_number <= $${paramIndex}
      )`;
      queryParams.push(max_area);
      paramIndex++;
    }

    // Bedrooms filter
    if (bedrooms) {
      query += ` AND EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id AND la.slug = 'bedrooms' AND lav.value_number = $${paramIndex}
      )`;
      queryParams.push(bedrooms);
      paramIndex++;
    }

    // Ordering and limit
    query += ` ORDER BY l.is_boosted DESC, l.created_at DESC LIMIT $${paramIndex}`;
    queryParams.push(Math.min(limit, 20));

    try {
      const result = await this.pool.query(query, queryParams);

      // Format results with listing URLs
      const listings = result.rows.map(row => ({
        ...row,
        listing_url: `${this.websiteUrl}/listing/${row.slug || row.id}`,
        images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : []
      }));

      console.log(`✅ [MCP-AGENT] Found ${listings.length} listings`);
      return { listings, count: listings.length };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Search query error:', error.message);
      throw error;
    }
  }

  /**
   * Get categories from database
   */
  async getCategories(params) {
    const { parent_slug, only_leaf = false } = params;

    let query;
    const queryParams = [];

    if (only_leaf) {
      // Get only LEAF categories (no children)
      query = `
        SELECT c.id, c.name_ar, c.name_en, c.slug, c.level, c.icon,
               p.slug as parent_slug, p.name_ar as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        WHERE c.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM categories child
            WHERE child.parent_id = c.id AND child.is_active = true
          )
        ORDER BY c.level, c.sort_order
      `;
    } else if (parent_slug) {
      // Get subcategories of a specific parent
      query = `
        SELECT c.id, c.name_ar, c.name_en, c.slug, c.level, c.icon,
               EXISTS (
                 SELECT 1 FROM categories child
                 WHERE child.parent_id = c.id AND child.is_active = true
               ) as has_children
        FROM categories c
        JOIN categories p ON c.parent_id = p.id
        WHERE c.is_active = true AND p.slug = $1
        ORDER BY c.sort_order
      `;
      queryParams.push(parent_slug);
    } else {
      // Get root categories
      query = `
        SELECT c.id, c.name_ar, c.name_en, c.slug, c.level, c.icon,
               EXISTS (
                 SELECT 1 FROM categories child
                 WHERE child.parent_id = c.id AND child.is_active = true
               ) as has_children
        FROM categories c
        WHERE c.is_active = true AND c.parent_id IS NULL
        ORDER BY c.sort_order
      `;
    }

    try {
      const result = await this.pool.query(query, queryParams);
      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} categories`);
      return { categories: result.rows };
    } catch (error) {
      console.error('❌ [MCP-AGENT] Categories query error:', error.message);
      throw error;
    }
  }

  /**
   * Get cities from database
   */
  async getCities(params) {
    const { search } = params;

    let query = `
      SELECT id, name_ar, name_en, province_ar, province_en
      FROM cities
    `;
    const queryParams = [];

    if (search) {
      query += ` WHERE name_ar ILIKE $1 OR name_en ILIKE $1 OR province_ar ILIKE $1`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY name_ar`;

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
   * Get listing details with all attributes
   */
  async getListingDetails(params) {
    const { listing_id, slug } = params;

    if (!listing_id && !slug) {
      throw new Error('Either listing_id or slug is required');
    }

    // Get listing base info
    let query = `
      SELECT
        l.*,
        c.name_ar as category_name,
        c.slug as category_slug,
        ct.name_ar as city_name,
        ct.province_ar as province,
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
        return { listing: null, message: 'Listing not found' };
      }

      const listing = listingResult.rows[0];

      // Get all attributes for this listing
      const attrsQuery = `
        SELECT
          la.slug,
          la.name_ar,
          la.name_en,
          la.type,
          lav.value_text,
          lav.value_number,
          lav.value_boolean,
          lav.value_json,
          lav.unit_ar,
          lav.unit_en
        FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = $1
      `;

      const attrsResult = await this.pool.query(attrsQuery, [listing.id]);

      listing.attributes = attrsResult.rows;
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

    // Search for matching categories, prioritizing LEAF categories
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
        ) as is_leaf
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.is_active = true
        AND (c.name_ar ILIKE $1 OR c.name_en ILIKE $1 OR c.slug ILIKE $1)
      ORDER BY
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM categories child
          WHERE child.parent_id = c.id AND child.is_active = true
        ) THEN 0 ELSE 1 END,
        c.level DESC
      LIMIT 5
    `;

    try {
      const result = await this.pool.query(query, [`%${keywords}%`]);

      console.log(`✅ [MCP-AGENT] Found ${result.rows.length} matching categories for "${keywords}"`);

      // Return the best matching LEAF category
      const leafCategories = result.rows.filter(c => c.is_leaf);
      const bestMatch = leafCategories.length > 0 ? leafCategories[0] : result.rows[0];

      return {
        categories: result.rows,
        best_match: bestMatch,
        suggestion: bestMatch ?
          `Use category slug: "${bestMatch.slug}" (${bestMatch.name_ar})` :
          'No matching category found'
      };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Category search error:', error.message);
      throw error;
    }
  }

  /**
   * Process user message with Claude and database tools
   * This is the main entry point for handling user queries
   */
  async processMessage(userMessage, language = null) {
    const detectedLanguage = language || detectLanguage(userMessage);

    console.log('\n' + '='.repeat(80));
    console.log('🤖 [MCP-AGENT] Processing message');
    console.log('='.repeat(80));
    console.log('Message:', userMessage);
    console.log('Language:', detectedLanguage);
    console.log('='.repeat(80) + '\n');

    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Set ANTHROPIC_API_KEY.');
    }

    if (!this.pool) {
      throw new Error('Database connection not available. Set MCP_DATABASE_URL.');
    }

    try {
      // Initial message to Claude with system prompt
      const messages = [
        {
          role: 'user',
          content: userMessage
        }
      ];

      // Call Claude with tools
      let response = await this.anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: this.systemPrompt,
        tools: this.tools,
        messages
      });

      console.log('🤖 [MCP-AGENT] Initial response:', {
        stop_reason: response.stop_reason,
        content_types: response.content.map(c => c.type)
      });

      // Handle tool use loop
      while (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(c => c.type === 'tool_use');
        const toolResults = [];

        for (const toolUse of toolUseBlocks) {
          console.log(`🔧 [MCP-AGENT] Tool call: ${toolUse.name}`);

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

        // Continue conversation with tool results
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
      }

      // Extract final text response
      const textContent = response.content.find(c => c.type === 'text');
      const finalResponse = textContent ? textContent.text : 'No response generated.';

      console.log('✅ [MCP-AGENT] Final response length:', finalResponse.length);

      return {
        response: finalResponse,
        language: detectedLanguage,
        toolsUsed: messages.filter(m => m.content && Array.isArray(m.content) &&
          m.content.some(c => c.type === 'tool_result')).length
      };

    } catch (error) {
      console.error('❌ [MCP-AGENT] Processing error:', error.message);
      logger.error('MCP Agent processing error:', error);
      throw error;
    }
  }

  /**
   * Transcribe voice message using OpenAI Whisper
   * (Kept for compatibility with voice messages)
   */
  async transcribeAudio(audioBuffer) {
    // Delegate to OpenAI for voice transcription
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (!openai) {
      throw new Error('OpenAI is required for audio transcription');
    }

    const { toFile } = require('openai');
    const file = await toFile(audioBuffer, 'audio.ogg', { type: 'audio/ogg' });

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1'
    });

    return response.text;
  }

  /**
   * Format results for bot response
   * Utility method for consistent formatting
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
        if (item.price) message += `   💰 السعر: ${item.price.toLocaleString()} \n`;
        if (item.area) message += `   📐 المساحة: ${item.area} م²\n`;
        if (item.bedrooms) message += `   🛏️ ${item.bedrooms} غرف نوم\n`;
        if (item.city_name) message += `   📍 ${item.city_name}${item.province ? `, ${item.province}` : ''}\n`;
        message += `   🔗 ${item.listing_url}\n\n`;
      });
    } else {
      message = `🏠 Found ${listings.length} results:\n\n`;

      listings.forEach((item, index) => {
        message += `${index + 1}️⃣ ${item.title}\n`;
        if (item.price) message += `   💰 Price: ${item.price.toLocaleString()}\n`;
        if (item.area) message += `   📐 Area: ${item.area} m²\n`;
        if (item.bedrooms) message += `   🛏️ ${item.bedrooms} bedrooms\n`;
        if (item.city_name) message += `   📍 ${item.city_name}${item.province ? `, ${item.province}` : ''}\n`;
        message += `   🔗 ${item.listing_url}\n\n`;
      });
    }

    return message;
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
