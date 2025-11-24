const db = require('./connection');
const logger = require('../../utils/logger');
const cache = require('../cache');

/**
 * Direct Database Search Service
 * ================================
 * ZERO API CALLS - All data fetched directly from PostgreSQL
 * Target: < 200ms response time for 90% of queries
 *
 * This service replaces:
 * - marketplaceSearch.js axios calls
 * - dynamicDataManager.js axios calls
 * - All external API dependencies
 */

class DirectSearchService {
  constructor() {
    this.language = process.env.KASIOON_API_LANGUAGE || 'ar';
    console.log('🚀 [DIRECT-SEARCH] Initialized with ZERO API dependencies');
  }

  /**
   * 🔥 MAIN SEARCH FUNCTION - Direct PostgreSQL Query
   * Replaces: marketplaceSearch.search()
   *
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Listings array
   */
  async search(params) {
    const startTime = Date.now();
    console.log('🔍 [DIRECT-SEARCH] Starting direct database search...');
    console.log('📋 [DIRECT-SEARCH] Parameters:', JSON.stringify(params, null, 2));

    try {
      // Check cache first
      const cacheKey = `direct_search:${JSON.stringify(params)}`;
      const cachedResults = await cache.get(cacheKey);

      if (cachedResults) {
        const parsed = JSON.parse(cachedResults);
        console.log(`✅ [DIRECT-SEARCH] Cache hit: ${parsed.length} results (${Date.now() - startTime}ms)`);
        return parsed;
      }

      // Build optimized SQL query
      const { query, values } = this.buildSearchQuery(params);

      // Execute query with performance tracking
      const result = await db.query(query, values, 'search_listings');

      const listings = result.rows;
      const duration = Date.now() - startTime;

      console.log(`✅ [DIRECT-SEARCH] Found ${listings.length} listings in ${duration}ms`);

      // Performance warning if > 200ms
      if (duration > 200) {
        logger.warn(`⚠️  Search exceeded 200ms target: ${duration}ms`);
      }

      // Cache for 5 minutes
      await cache.set(cacheKey, JSON.stringify(listings), 300);

      return listings;

    } catch (error) {
      logger.error('❌ [DIRECT-SEARCH] Search error:', error);
      throw error;
    }
  }

  /**
   * Build optimized search SQL query
   * Uses proper indexes and JOINs instead of multiple round-trip API calls
   *
   * @param {Object} params - Search parameters
   * @returns {Object} { query: string, values: array }
   */
  buildSearchQuery(params) {
    const conditions = [];
    const values = [];
    let valueIndex = 1;

    // Base query with all necessary JOINs (single query instead of multiple API calls)
    let query = `
      SELECT
        l.id,
        l.title,
        l.description,
        l.created_at,
        l.updated_at,
        l.status,
        l.views,
        l.is_boosted,
        l.boost_type,
        l.priority,
        l.quality_score,

        -- Category info (instead of separate API call)
        c.id as category_id,
        c.slug as category_slug,
        c.name_${this.language} as category_name,
        c.level as category_level,

        -- Location info (instead of separate API call)
        ci.id as city_id,
        ci.name_${this.language} as city_name,
        n.id as neighborhood_id,
        n.name_${this.language} as neighborhood_name,

        -- Transaction type (instead of separate API call)
        tt.id as transaction_type_id,
        tt.slug as transaction_type_slug,
        tt.name_${this.language} as transaction_type_name,

        -- Images (first image only for list view)
        (
          SELECT json_agg(
            json_build_object(
              'id', li.id,
              'url', li.url,
              'is_main', li.is_main,
              'sort_order', li.sort_order
            ) ORDER BY li.is_main DESC, li.sort_order
          )
          FROM listing_images li
          WHERE li.listing_id = l.id
          LIMIT 3
        ) as images,

        -- Attributes (instead of separate API calls for each attribute)
        (
          SELECT json_object_agg(
            la.slug,
            COALESCE(lav.value_text, lav.value_number::text, lav.value_boolean::text, lav.value_date::text, lav.value_json::text)
          )
          FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id
        ) as attributes

      FROM listings l

      -- JOINs instead of multiple API calls
      INNER JOIN categories c ON l.category_id = c.id
      INNER JOIN cities ci ON l.city_id = ci.id
      LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
      INNER JOIN transaction_types tt ON l.transaction_type_id = tt.id
    `;

    // Always filter active listings
    conditions.push("l.status = 'active'");

    // Category filter (by slug or ID)
    // CRITICAL FIX: Support non-leaf categories (like "cars", "motorcycles")
    // Search in the category AND ALL its subcategories at ANY depth using recursive CTE
    if (params.categorySlug) {
      conditions.push(`
        c.id IN (
          WITH RECURSIVE category_tree AS (
            -- Start with the requested category
            SELECT id FROM categories WHERE slug = $${valueIndex} AND is_active = true
            UNION ALL
            -- Recursively get all children
            SELECT cat.id
            FROM categories cat
            INNER JOIN category_tree ct ON cat.parent_id = ct.id
            WHERE cat.is_active = true
          )
          SELECT id FROM category_tree
        )
      `);
      values.push(params.categorySlug);
      valueIndex++;
    } else if (params.category) {
      // Same logic for 'category' parameter
      conditions.push(`
        c.id IN (
          WITH RECURSIVE category_tree AS (
            -- Start with the requested category
            SELECT id FROM categories WHERE slug = $${valueIndex} AND is_active = true
            UNION ALL
            -- Recursively get all children
            SELECT cat.id
            FROM categories cat
            INNER JOIN category_tree ct ON cat.parent_id = ct.id
            WHERE cat.is_active = true
          )
          SELECT id FROM category_tree
        )
      `);
      values.push(params.category);
      valueIndex++;
    }

    // Location filters
    if (params.province) {
      // Province-level search
      conditions.push(`ci.name_en = $${valueIndex} OR ci.name_ar = $${valueIndex}`);
      values.push(params.province);
      valueIndex++;
    } else if (params.city || params.cityName) {
      const cityName = params.city || params.cityName;
      conditions.push(`(ci.name_en ILIKE $${valueIndex} OR ci.name_ar ILIKE $${valueIndex})`);
      values.push(`%${cityName}%`);
      valueIndex++;
    } else if (params.cityId) {
      conditions.push(`l.city_id = $${valueIndex}`);
      values.push(params.cityId);
      valueIndex++;
    }

    // Neighborhood filter
    if (params.neighborhoodId) {
      conditions.push(`l.neighborhood_id = $${valueIndex}`);
      values.push(params.neighborhoodId);
      valueIndex++;
    }

    // Transaction type filter
    if (params.transactionTypeSlug || params.transactionType) {
      const transactionSlug = params.transactionTypeSlug || params.transactionType;
      conditions.push(`tt.slug = $${valueIndex}`);
      values.push(transactionSlug);
      valueIndex++;
    }

    // Keywords search (using PostgreSQL full-text search)
    if (params.keywords) {
      const keywords = params.keywords.trim();
      if (keywords.length > 0) {
        // Use trigram similarity for Arabic text (works better than standard full-text)
        conditions.push(`(
          l.title ILIKE $${valueIndex} OR
          l.description ILIKE $${valueIndex} OR
          similarity(l.title, $${valueIndex + 1}) > 0.3 OR
          similarity(l.description, $${valueIndex + 1}) > 0.3
        )`);
        values.push(`%${keywords}%`);
        values.push(keywords);
        valueIndex += 2;
      }
    }

    // Price filters (attribute-based)
    if (params['price.min'] || params.minPrice) {
      const minPrice = params['price.min'] || params.minPrice;
      conditions.push(`EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id
        AND la.slug = 'price'
        AND lav.value_number >= $${valueIndex}
      )`);
      values.push(minPrice);
      valueIndex++;
    }

    if (params['price.max'] || params.maxPrice) {
      const maxPrice = params['price.max'] || params.maxPrice;
      conditions.push(`EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id
        AND la.slug = 'price'
        AND lav.value_number <= $${valueIndex}
      )`);
      values.push(maxPrice);
      valueIndex++;
    }

    // Area filters
    if (params['area.min'] || params.minArea) {
      const minArea = params['area.min'] || params.minArea;
      conditions.push(`EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id
        AND la.slug = 'area'
        AND lav.value_number >= $${valueIndex}
      )`);
      values.push(minArea);
      valueIndex++;
    }

    if (params['area.max'] || params.maxArea) {
      const maxArea = params['area.max'] || params.maxArea;
      conditions.push(`EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id
        AND la.slug = 'area'
        AND lav.value_number <= $${valueIndex}
      )`);
      values.push(maxArea);
      valueIndex++;
    }

    // Generic attribute filters
    if (params.attributes) {
      const attributes = typeof params.attributes === 'string'
        ? JSON.parse(params.attributes)
        : params.attributes;

      for (const [attrName, attrValue] of Object.entries(attributes)) {
        if (attrValue && typeof attrValue === 'object' && (attrValue.min || attrValue.max)) {
          // Range filter (numeric)
          if (attrValue.min) {
            conditions.push(`EXISTS (
              SELECT 1 FROM listing_attribute_values lav
              JOIN listing_attributes la ON lav.attribute_id = la.id
              WHERE lav.listing_id = l.id
              AND la.slug = $${valueIndex}
              AND lav.value_number >= $${valueIndex + 1}
            )`);
            values.push(attrName);
            values.push(attrValue.min);
            valueIndex += 2;
          }
          if (attrValue.max) {
            conditions.push(`EXISTS (
              SELECT 1 FROM listing_attribute_values lav
              JOIN listing_attributes la ON lav.attribute_id = la.id
              WHERE lav.listing_id = l.id
              AND la.slug = $${valueIndex}
              AND lav.value_number <= $${valueIndex + 1}
            )`);
            values.push(attrName);
            values.push(attrValue.max);
            valueIndex += 2;
          }
        } else if (typeof attrValue === 'boolean') {
          // Boolean filter
          conditions.push(`EXISTS (
            SELECT 1 FROM listing_attribute_values lav
            JOIN listing_attributes la ON lav.attribute_id = la.id
            WHERE lav.listing_id = l.id
            AND la.slug = $${valueIndex}
            AND lav.value_boolean = $${valueIndex + 1}
          )`);
          values.push(attrName);
          values.push(attrValue);
          valueIndex += 2;
        } else {
          // Text/string filter
          conditions.push(`EXISTS (
            SELECT 1 FROM listing_attribute_values lav
            JOIN listing_attributes la ON lav.attribute_id = la.id
            WHERE lav.listing_id = l.id
            AND la.slug = $${valueIndex}
            AND lav.value_text = $${valueIndex + 1}
          )`);
          values.push(attrName);
          values.push(String(attrValue));
          valueIndex += 2;
        }
      }
    }

    // Boosted/Featured filters
    if (params.featured) {
      conditions.push('l.is_boosted = true');
    }

    if (params.hasImages) {
      conditions.push('EXISTS (SELECT 1 FROM listing_images WHERE listing_id = l.id)');
    }

    if (params.hasVideo) {
      conditions.push('EXISTS (SELECT 1 FROM listing_videos WHERE listing_id = l.id)');
    }

    // Add WHERE clause
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting (optimized for performance)
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'DESC';

    // Use indexed columns for sorting
    if (sortBy === 'created_at') {
      query += ` ORDER BY l.is_boosted DESC, l.created_at ${sortOrder}`;
    } else if (sortBy === 'price') {
      query += ` ORDER BY l.is_boosted DESC, (
        SELECT lav.value_number
        FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id AND la.slug = 'price'
        LIMIT 1
      ) ${sortOrder} NULLS LAST`;
    } else if (sortBy === 'views') {
      query += ` ORDER BY l.is_boosted DESC, l.views ${sortOrder}`;
    } else if (sortBy === 'quality') {
      query += ` ORDER BY l.is_boosted DESC, l.quality_score ${sortOrder}`;
    } else {
      query += ` ORDER BY l.is_boosted DESC, l.created_at DESC`;
    }

    // Pagination
    const limit = parseInt(params.limit) || 20;
    const page = parseInt(params.page) || 1;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
    values.push(limit);
    values.push(offset);

    return { query, values };
  }

  /**
   * 🔥 Get listing details by ID
   * Replaces: marketplaceSearch.getListingDetails()
   *
   * @param {string} listingId - Listing UUID
   * @returns {Promise<Object>} Listing details
   */
  async getListingDetails(listingId) {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = `listing:${listingId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log(`✅ [DIRECT-SEARCH] Listing cache hit (${Date.now() - startTime}ms)`);
        return JSON.parse(cached);
      }

      // Single comprehensive query instead of multiple API calls
      const query = `
        SELECT
          l.*,
          c.slug as category_slug,
          c.name_${this.language} as category_name,
          c.level as category_level,
          ci.name_${this.language} as city_name,
          n.name_${this.language} as neighborhood_name,
          tt.slug as transaction_type_slug,
          tt.name_${this.language} as transaction_type_name,
          u.name as user_name,
          u.phone as user_phone,

          -- All images
          (
            SELECT json_agg(
              json_build_object(
                'id', li.id,
                'url', li.url,
                'is_main', li.is_main,
                'sort_order', li.sort_order
              ) ORDER BY li.is_main DESC, li.sort_order
            )
            FROM listing_images li
            WHERE li.listing_id = l.id
          ) as images,

          -- All attributes
          (
            SELECT json_object_agg(
              la.slug,
              json_build_object(
                'value', COALESCE(lav.value_text, lav.value_number::text, lav.value_boolean::text, lav.value_date::text, lav.value_json::text),
                'display_name_ar', la.name_ar,
                'display_name_en', la.name_en,
                'unit_ar', lav.unit_ar,
                'unit_en', lav.unit_en
              )
            )
            FROM listing_attribute_values lav
            JOIN listing_attributes la ON lav.attribute_id = la.id
            WHERE lav.listing_id = l.id
          ) as attributes

        FROM listings l
        INNER JOIN categories c ON l.category_id = c.id
        INNER JOIN cities ci ON l.city_id = ci.id
        LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
        INNER JOIN transaction_types tt ON l.transaction_type_id = tt.id
        INNER JOIN users u ON l.user_id = u.id
        WHERE l.id = $1
      `;

      const result = await db.query(query, [listingId], 'get_listing_details');

      if (result.rows.length === 0) {
        throw new Error('Listing not found');
      }

      const listing = result.rows[0];
      const duration = Date.now() - startTime;

      console.log(`✅ [DIRECT-SEARCH] Listing details fetched in ${duration}ms`);

      // Cache for 10 minutes
      await cache.set(cacheKey, JSON.stringify(listing), 600);

      return listing;

    } catch (error) {
      logger.error('❌ [DIRECT-SEARCH] Error fetching listing details:', error);
      throw error;
    }
  }

  /**
   * 🔥 Get categories (with optional parent filter)
   * Replaces: marketplaceSearch.getCategories()
   *
   * @param {string} parentId - Parent category ID (optional)
   * @returns {Promise<Array>} Categories array
   */
  async getCategories(parentId = null) {
    const startTime = Date.now();

    try {
      const cacheKey = `categories:${parentId || 'root'}:${this.language}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        console.log(`✅ [DIRECT-SEARCH] Categories cache hit (${Date.now() - startTime}ms)`);
        return JSON.parse(cached);
      }

      let query;
      let values;

      if (parentId === null) {
        // Root categories
        query = `
          SELECT
            id,
            slug,
            name_${this.language} as name,
            name_ar,
            name_en,
            icon,
            image,
            level,
            sort_order,
            is_featured,
            (SELECT COUNT(*) FROM categories WHERE parent_id = c.id AND is_active = true) as children_count
          FROM categories c
          WHERE parent_id IS NULL
            AND is_active = true
          ORDER BY sort_order, name_${this.language}
        `;
        values = [];
      } else {
        // Child categories
        query = `
          SELECT
            id,
            slug,
            name_${this.language} as name,
            name_ar,
            name_en,
            parent_id,
            icon,
            level,
            sort_order,
            (SELECT COUNT(*) FROM categories WHERE parent_id = c.id AND is_active = true) as children_count
          FROM categories c
          WHERE parent_id = $1
            AND is_active = true
          ORDER BY sort_order, name_${this.language}
        `;
        values = [parentId];
      }

      const result = await db.query(query, values, 'get_categories');
      const categories = result.rows;
      const duration = Date.now() - startTime;

      console.log(`✅ [DIRECT-SEARCH] Fetched ${categories.length} categories in ${duration}ms`);

      // Cache for 1 hour
      await cache.set(cacheKey, JSON.stringify(categories), 3600);

      return categories;

    } catch (error) {
      logger.error('❌ [DIRECT-SEARCH] Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * 🔥 Get complete category tree (recursive)
   * Replaces: dynamicDataManager.getCategories()
   *
   * @returns {Promise<Array>} Category tree
   */
  async getCategoryTree() {
    const startTime = Date.now();

    try {
      const cacheKey = `category_tree:${this.language}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        console.log(`✅ [DIRECT-SEARCH] Category tree cache hit (${Date.now() - startTime}ms)`);
        return JSON.parse(cached);
      }

      // Recursive CTE for category tree
      const query = `
        WITH RECURSIVE category_tree AS (
          -- Root categories
          SELECT
            id,
            slug,
            name_${this.language} as name,
            name_ar,
            name_en,
            parent_id,
            level,
            sort_order,
            icon,
            image,
            is_featured,
            ARRAY[id] as path,
            ARRAY[sort_order] as sort_path
          FROM categories
          WHERE parent_id IS NULL AND is_active = true

          UNION ALL

          -- Child categories
          SELECT
            c.id,
            c.slug,
            c.name_${this.language},
            c.name_ar,
            c.name_en,
            c.parent_id,
            c.level,
            c.sort_order,
            c.icon,
            c.image,
            c.is_featured,
            ct.path || c.id,
            ct.sort_path || c.sort_order
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
          WHERE c.is_active = true
        )
        SELECT * FROM category_tree
        ORDER BY sort_path;
      `;

      const result = await db.query(query, [], 'get_category_tree');

      // Build tree structure
      const categoriesMap = new Map();
      const rootCategories = [];

      result.rows.forEach(row => {
        const category = {
          ...row,
          children: []
        };
        categoriesMap.set(row.id, category);

        if (row.parent_id === null) {
          rootCategories.push(category);
        }
      });

      // Link children to parents
      result.rows.forEach(row => {
        if (row.parent_id) {
          const parent = categoriesMap.get(row.parent_id);
          if (parent) {
            parent.children.push(categoriesMap.get(row.id));
          }
        }
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [DIRECT-SEARCH] Built category tree in ${duration}ms`);

      // Cache for 1 hour
      await cache.set(cacheKey, JSON.stringify(rootCategories), 3600);

      return rootCategories;

    } catch (error) {
      logger.error('❌ [DIRECT-SEARCH] Error fetching category tree:', error);
      throw error;
    }
  }

  /**
   * 🔥 Get category by slug
   * Replaces: API call to /api/categories/:slug
   *
   * @param {string} slug - Category slug
   * @returns {Promise<Object>} Category details
   */
  async getCategoryBySlug(slug) {
    const query = `
      SELECT
        id,
        slug,
        name_${this.language} as name,
        name_ar,
        name_en,
        parent_id,
        level,
        path,
        icon,
        (SELECT COUNT(*) FROM categories WHERE parent_id = c.id AND is_active = true) as children_count,
        (SELECT COUNT(*) FROM categories WHERE parent_id = c.id AND is_active = true) > 0 as has_children
      FROM categories c
      WHERE slug = $1 AND is_active = true
    `;

    const result = await db.query(query, [slug], 'get_category_by_slug');

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * 🔥 Get provinces/governorates
   * Replaces: marketplaceSearch.getProvinces()
   *
   * @returns {Promise<Array>} Provinces array
   */
  async getProvinces() {
    const cacheKey = `provinces:${this.language}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get unique provinces from cities table
    const query = `
      SELECT DISTINCT
        province_${this.language === 'ar' ? 'ar' : 'en'} as name,
        province_ar as name_ar,
        province_en as name_en
      FROM cities
      ORDER BY province_${this.language === 'ar' ? 'ar' : 'en'}
    `;

    const result = await db.query(query, [], 'get_provinces');
    const provinces = result.rows;

    await cache.set(cacheKey, JSON.stringify(provinces), 3600);

    return provinces;
  }

  /**
   * 🔥 Search categories by name/slug
   * Replaces: dynamicDataManager.searchCategories()
   *
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching categories
   */
  async searchCategories(searchTerm) {
    const query = `
      SELECT
        id,
        slug,
        name_${this.language} as name,
        name_ar,
        name_en,
        level,
        parent_id,
        (SELECT COUNT(*) FROM categories WHERE parent_id = c.id AND is_active = true) > 0 as has_children
      FROM categories c
      WHERE is_active = true
        AND (
          slug ILIKE $1 OR
          name_ar ILIKE $1 OR
          name_en ILIKE $1 OR
          similarity(name_ar, $2) > 0.3 OR
          similarity(name_en, $2) > 0.3
        )
      ORDER BY
        CASE
          WHEN slug = $2 THEN 1
          WHEN slug ILIKE $1 THEN 2
          ELSE 3
        END,
        similarity(name_${this.language}, $2) DESC
      LIMIT 10
    `;

    const result = await db.query(
      query,
      [`%${searchTerm}%`, searchTerm],
      'search_categories'
    );

    return result.rows;
  }
}

// Export singleton
module.exports = new DirectSearchService();
