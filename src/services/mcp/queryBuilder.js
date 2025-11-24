/**
 * SQL Query Builder for Qasioun Marketplace
 *
 * Provides reusable query patterns for searching the marketplace database.
 * Enhanced with DYNAMIC attribute support for all attribute types:
 * - text, number, select, multiselect, boolean, range, date
 *
 * These queries are optimized for the MCP PostgreSQL integration.
 */

class QueryBuilder {
  constructor() {
    this.websiteUrl = process.env.KASIOON_WEBSITE_URL || 'https://kasioon.com';
  }

  /**
   * Build a dynamic search query for listings with category-specific attributes
   * @param {Object} filters - Search filters
   * @param {Array} categoryAttributes - Category attribute metadata from database
   * @returns {Object} - { query: string, params: array }
   */
  buildDynamicSearchQuery(filters = {}, categoryAttributes = []) {
    const {
      categoryId,
      categorySlug,
      cityName,
      transactionType,
      attributes = {},
      keywords,
      limit = 10,
      offset = 0
    } = filters;

    // Build SELECT clause
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
        c.name_en as category_name_en,
        c.slug as category_slug,
        ct.name_ar as city_name,
        ct.name_en as city_name_en,
        ct.province_ar as province,
        tt.name_ar as transaction_type,
        tt.slug as transaction_slug
    `;

    // Add dynamic attribute subqueries
    query += this.buildDynamicAttributeSubqueries(categoryAttributes);

    // FROM and JOIN clauses
    query += `
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN cities ct ON l.city_id = ct.id
      LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
      WHERE l.status = 'active'
    `;

    const params = [];
    let paramIndex = 1;

    // Category filter (by ID or slug)
    if (categoryId) {
      query += ` AND c.id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    } else if (categorySlug) {
      query += ` AND c.slug = $${paramIndex}`;
      params.push(categorySlug);
      paramIndex++;
    }

    // City filter
    if (cityName) {
      query += ` AND (ct.name_ar ILIKE $${paramIndex} OR ct.name_en ILIKE $${paramIndex})`;
      params.push(`%${cityName}%`);
      paramIndex++;
    }

    // Transaction type filter
    if (transactionType) {
      query += ` AND tt.slug = $${paramIndex}`;
      params.push(transactionType);
      paramIndex++;
    }

    // Keywords in title/description
    if (keywords) {
      query += ` AND (l.title ILIKE $${paramIndex} OR l.description ILIKE $${paramIndex})`;
      params.push(`%${keywords}%`);
      paramIndex++;
    }

    // Build dynamic attribute filters
    const attrMap = new Map(categoryAttributes.map(a => [a.slug, a]));
    for (const [attrSlug, attrValue] of Object.entries(attributes)) {
      const attrMeta = attrMap.get(attrSlug);
      if (!attrMeta) continue;

      const filterResult = this.buildAttributeFilter(attrMeta, attrValue, params, paramIndex);
      if (filterResult) {
        query += filterResult.query;
        paramIndex += filterResult.paramsAdded;
      }
    }

    // Ordering
    query += ` ORDER BY l.is_boosted DESC, l.created_at DESC`;

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Math.min(limit, 50), offset);

    return { query, params };
  }

  /**
   * Build SELECT subqueries for dynamic category attributes
   * @param {Array} categoryAttributes - Array of attribute metadata
   * @returns {String} SQL subqueries
   */
  buildDynamicAttributeSubqueries(categoryAttributes) {
    if (!categoryAttributes || categoryAttributes.length === 0) {
      return '';
    }

    return categoryAttributes.map(attr => {
      const valueColumn = this.getValueColumnForType(attr.type);
      return `
        ,(SELECT lav.${valueColumn}
          FROM listing_attribute_values lav
          WHERE lav.listing_id = l.id AND lav.attribute_id = '${attr.id}'
        ) as "${attr.slug}"`;
    }).join('');
  }

  /**
   * Get appropriate value column based on attribute type
   * @param {String} type - Attribute type
   * @returns {String} Column name
   */
  getValueColumnForType(type) {
    switch (type) {
      case 'number':
      case 'range':
        return 'value_number';
      case 'boolean':
        return 'value_boolean';
      case 'date':
        return 'value_date';
      case 'select':
      case 'multiselect':
        return 'value_json';
      case 'text':
      default:
        return 'value_text';
    }
  }

  /**
   * Build WHERE clause for a specific attribute based on type
   * @param {Object} attrMeta - Attribute metadata
   * @param {*} attrValue - Filter value
   * @param {Array} params - Query parameters array (mutated)
   * @param {Number} startIndex - Starting parameter index
   * @returns {Object|null} { query: string, paramsAdded: number }
   */
  buildAttributeFilter(attrMeta, attrValue, params, startIndex) {
    const { id, type } = attrMeta;
    let filterQuery = '';
    let paramsAdded = 0;

    if (attrValue === null || attrValue === undefined) {
      return null;
    }

    switch (type) {
      case 'number':
      case 'range':
        if (typeof attrValue === 'object' && (attrValue.min !== undefined || attrValue.max !== undefined)) {
          // Range query
          if (attrValue.min !== undefined) {
            filterQuery += ` AND EXISTS (
              SELECT 1 FROM listing_attribute_values lav
              WHERE lav.listing_id = l.id
                AND lav.attribute_id = '${id}'
                AND lav.value_number >= $${startIndex + paramsAdded}
            )`;
            params.push(attrValue.min);
            paramsAdded++;
          }
          if (attrValue.max !== undefined) {
            filterQuery += ` AND EXISTS (
              SELECT 1 FROM listing_attribute_values lav
              WHERE lav.listing_id = l.id
                AND lav.attribute_id = '${id}'
                AND lav.value_number <= $${startIndex + paramsAdded}
            )`;
            params.push(attrValue.max);
            paramsAdded++;
          }
        } else {
          // Exact match
          filterQuery += ` AND EXISTS (
            SELECT 1 FROM listing_attribute_values lav
            WHERE lav.listing_id = l.id
              AND lav.attribute_id = '${id}'
              AND lav.value_number = $${startIndex + paramsAdded}
          )`;
          params.push(attrValue);
          paramsAdded++;
        }
        break;

      case 'boolean':
        filterQuery += ` AND EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          WHERE lav.listing_id = l.id
            AND lav.attribute_id = '${id}'
            AND lav.value_boolean = $${startIndex + paramsAdded}
        )`;
        params.push(attrValue);
        paramsAdded++;
        break;

      case 'select':
        filterQuery += ` AND EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          WHERE lav.listing_id = l.id
            AND lav.attribute_id = '${id}'
            AND (
              lav.value_json @> $${startIndex + paramsAdded}::jsonb
              OR lav.value_text = $${startIndex + paramsAdded + 1}
            )
        )`;
        params.push(JSON.stringify([attrValue]));
        params.push(attrValue);
        paramsAdded += 2;
        break;

      case 'multiselect':
        if (Array.isArray(attrValue)) {
          filterQuery += ` AND EXISTS (
            SELECT 1 FROM listing_attribute_values lav
            WHERE lav.listing_id = l.id
              AND lav.attribute_id = '${id}'
              AND lav.value_json ?| $${startIndex + paramsAdded}
          )`;
          params.push(attrValue);
          paramsAdded++;
        } else {
          filterQuery += ` AND EXISTS (
            SELECT 1 FROM listing_attribute_values lav
            WHERE lav.listing_id = l.id
              AND lav.attribute_id = '${id}'
              AND lav.value_json @> $${startIndex + paramsAdded}::jsonb
          )`;
          params.push(JSON.stringify([attrValue]));
          paramsAdded++;
        }
        break;

      case 'text':
        filterQuery += ` AND EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          WHERE lav.listing_id = l.id
            AND lav.attribute_id = '${id}'
            AND lav.value_text ILIKE $${startIndex + paramsAdded}
        )`;
        params.push(`%${attrValue}%`);
        paramsAdded++;
        break;

      case 'date':
        if (typeof attrValue === 'object' && (attrValue.from || attrValue.to)) {
          if (attrValue.from) {
            filterQuery += ` AND EXISTS (
              SELECT 1 FROM listing_attribute_values lav
              WHERE lav.listing_id = l.id
                AND lav.attribute_id = '${id}'
                AND lav.value_date >= $${startIndex + paramsAdded}
            )`;
            params.push(attrValue.from);
            paramsAdded++;
          }
          if (attrValue.to) {
            filterQuery += ` AND EXISTS (
              SELECT 1 FROM listing_attribute_values lav
              WHERE lav.listing_id = l.id
                AND lav.attribute_id = '${id}'
                AND lav.value_date <= $${startIndex + paramsAdded}
            )`;
            params.push(attrValue.to);
            paramsAdded++;
          }
        } else {
          filterQuery += ` AND EXISTS (
            SELECT 1 FROM listing_attribute_values lav
            WHERE lav.listing_id = l.id
              AND lav.attribute_id = '${id}'
              AND lav.value_date = $${startIndex + paramsAdded}
          )`;
          params.push(attrValue);
          paramsAdded++;
        }
        break;

      default:
        return null;
    }

    return { query: filterQuery, paramsAdded };
  }

  /**
   * Build a search query for listings with static filters (legacy support)
   * @param {Object} filters - Search filters
   * @returns {Object} - { query: string, params: array }
   */
  buildSearchQuery(filters = {}) {
    const {
      categorySlug,
      cityName,
      transactionType,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      bedrooms,
      bathrooms,
      keywords,
      limit = 10,
      offset = 0
    } = filters;

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
        c.name_en as category_name_en,
        c.slug as category_slug,
        ct.name_ar as city_name,
        ct.name_en as city_name_en,
        ct.province_ar as province,
        tt.name_ar as transaction_type,
        tt.slug as transaction_slug
    `;

    // Add static attribute subqueries for common attributes
    query += this.buildAttributeSubqueries(['price', 'area', 'bedrooms', 'bathrooms']);

    query += `
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN cities ct ON l.city_id = ct.id
      LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
      WHERE l.status = 'active'
    `;

    const params = [];
    let paramIndex = 1;

    // Category filter
    if (categorySlug) {
      query += ` AND c.slug = $${paramIndex}`;
      params.push(categorySlug);
      paramIndex++;
    }

    // City filter
    if (cityName) {
      query += ` AND (ct.name_ar ILIKE $${paramIndex} OR ct.name_en ILIKE $${paramIndex})`;
      params.push(`%${cityName}%`);
      paramIndex++;
    }

    // Transaction type filter
    if (transactionType) {
      query += ` AND tt.slug = $${paramIndex}`;
      params.push(transactionType);
      paramIndex++;
    }

    // Keywords in title/description
    if (keywords) {
      query += ` AND (l.title ILIKE $${paramIndex} OR l.description ILIKE $${paramIndex})`;
      params.push(`%${keywords}%`);
      paramIndex++;
    }

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      query += this.buildAttributeRangeFilter('price', minPrice, maxPrice, params, paramIndex);
      paramIndex = params.length + 1;
    }

    // Area range
    if (minArea !== undefined || maxArea !== undefined) {
      query += this.buildAttributeRangeFilter('area', minArea, maxArea, params, paramIndex);
      paramIndex = params.length + 1;
    }

    // Bedrooms exact match
    if (bedrooms !== undefined) {
      query += this.buildAttributeExactFilter('bedrooms', bedrooms, params, paramIndex);
      paramIndex = params.length + 1;
    }

    // Bathrooms exact match
    if (bathrooms !== undefined) {
      query += this.buildAttributeExactFilter('bathrooms', bathrooms, params, paramIndex);
      paramIndex = params.length + 1;
    }

    // Ordering
    query += ` ORDER BY l.is_boosted DESC, l.created_at DESC`;

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Math.min(limit, 50), offset);

    return { query, params };
  }

  /**
   * Build subqueries for static attributes (legacy support)
   */
  buildAttributeSubqueries(attributeSlugs) {
    return attributeSlugs.map(slug => `
        ,(SELECT lav.value_number
          FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id AND la.slug = '${slug}'
        ) as ${slug}`
    ).join('');
  }

  /**
   * Build range filter for numeric attributes (legacy support)
   */
  buildAttributeRangeFilter(attributeSlug, minValue, maxValue, params, startIndex) {
    let filter = '';
    let idx = startIndex;

    if (minValue !== undefined && maxValue !== undefined) {
      filter += ` AND EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id AND la.slug = '${attributeSlug}'
          AND lav.value_number >= $${idx} AND lav.value_number <= $${idx + 1}
      )`;
      params.push(minValue, maxValue);
    } else if (minValue !== undefined) {
      filter += ` AND EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id AND la.slug = '${attributeSlug}'
          AND lav.value_number >= $${idx}
      )`;
      params.push(minValue);
    } else if (maxValue !== undefined) {
      filter += ` AND EXISTS (
        SELECT 1 FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = l.id AND la.slug = '${attributeSlug}'
          AND lav.value_number <= $${idx}
      )`;
      params.push(maxValue);
    }

    return filter;
  }

  /**
   * Build exact match filter for attributes (legacy support)
   */
  buildAttributeExactFilter(attributeSlug, value, params, startIndex) {
    params.push(value);
    return ` AND EXISTS (
      SELECT 1 FROM listing_attribute_values lav
      JOIN listing_attributes la ON lav.attribute_id = la.id
      WHERE lav.listing_id = l.id AND la.slug = '${attributeSlug}'
        AND lav.value_number = $${startIndex}
    )`;
  }

  /**
   * Build query to get leaf categories
   */
  buildLeafCategoriesQuery(parentSlug = null) {
    let query = `
      SELECT
        c.id,
        c.name_ar,
        c.name_en,
        c.slug,
        c.level,
        c.icon,
        p.slug as parent_slug,
        p.name_ar as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM categories child
          WHERE child.parent_id = c.id AND child.is_active = true
        )
    `;

    const params = [];

    if (parentSlug) {
      query += ` AND p.slug = $1`;
      params.push(parentSlug);
    }

    query += ` ORDER BY c.level, c.sort_order`;

    return { query, params };
  }

  /**
   * Build query to get category attributes
   * @param {String} categoryId - Category UUID
   * @returns {Object} { query, params }
   */
  buildCategoryAttributesQuery(categoryId) {
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

    return { query, params: [categoryId] };
  }

  /**
   * Build query to find matching category by keywords
   */
  buildCategorySearchQuery(keywords) {
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

    return { query, params: [keywords] };
  }

  /**
   * Build query to get category hierarchy path
   */
  buildCategoryPathQuery(categoryId) {
    const query = `
      WITH RECURSIVE category_path AS (
        SELECT id, name_ar, name_en, slug, parent_id,
               ARRAY[name_ar] as path_ar,
               ARRAY[name_en] as path_en,
               0 as depth
        FROM categories
        WHERE id = $1

        UNION ALL

        SELECT c.id, c.name_ar, c.name_en, c.slug, c.parent_id,
               cp.path_ar || c.name_ar,
               cp.path_en || c.name_en,
               cp.depth + 1
        FROM categories c
        INNER JOIN category_path cp ON c.id = cp.parent_id
      )
      SELECT * FROM category_path ORDER BY depth DESC
    `;

    return { query, params: [categoryId] };
  }

  /**
   * Build query to get all attributes for a listing
   */
  buildListingAttributesQuery(listingId) {
    const query = `
      SELECT
        la.slug,
        la.name_ar,
        la.name_en,
        la.type,
        lav.value_text,
        lav.value_number,
        lav.value_boolean,
        lav.value_date,
        lav.value_json,
        lav.unit_ar,
        lav.unit_en,
        la.unit_ar as attr_unit_ar,
        la.unit_en as attr_unit_en
      FROM listing_attribute_values lav
      JOIN listing_attributes la ON lav.attribute_id = la.id
      WHERE lav.listing_id = $1
      ORDER BY la.sort_order
    `;

    return { query, params: [listingId] };
  }

  /**
   * Build query for city search
   */
  buildCitySearchQuery(searchTerm = null) {
    let query = `
      SELECT
        id,
        name_ar,
        name_en,
        province_ar,
        province_en
      FROM cities
    `;

    const params = [];

    if (searchTerm) {
      query += ` WHERE name_ar ILIKE $1 OR name_en ILIKE $1 OR province_ar ILIKE $1`;
      params.push(`%${searchTerm}%`);
    }

    query += ` ORDER BY name_ar`;

    return { query, params };
  }

  /**
   * Build query to count listings by category
   */
  buildCategoryCountsQuery() {
    const query = `
      SELECT
        c.slug,
        c.name_ar,
        c.name_en,
        COUNT(l.id) as listing_count
      FROM categories c
      LEFT JOIN listings l ON l.category_id = c.id AND l.status = 'active'
      WHERE c.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM categories child
          WHERE child.parent_id = c.id AND child.is_active = true
        )
      GROUP BY c.id, c.slug, c.name_ar, c.name_en
      ORDER BY listing_count DESC
    `;

    return { query, params: [] };
  }

  /**
   * Format query results with listing URLs
   */
  formatListingsWithUrls(listings) {
    return listings.map(listing => ({
      ...listing,
      listing_url: `${this.websiteUrl}/listing/${listing.slug || listing.id}`,
      images: listing.images ?
        (typeof listing.images === 'string' ? JSON.parse(listing.images) : listing.images) : []
    }));
  }

  /**
   * Extract attribute value based on type
   * @param {Object} attr - Attribute row from database
   * @returns {*} Extracted value
   */
  extractAttributeValue(attr) {
    switch (attr.type) {
      case 'number':
      case 'range':
        return attr.value_number;
      case 'boolean':
        return attr.value_boolean;
      case 'date':
        return attr.value_date;
      case 'select':
      case 'multiselect':
        return attr.value_json;
      case 'text':
      default:
        return attr.value_text;
    }
  }
}

module.exports = new QueryBuilder();
