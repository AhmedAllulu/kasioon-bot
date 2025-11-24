/**
 * SQL Query Builder for Qasioun Marketplace
 *
 * Provides reusable query patterns for searching the marketplace database.
 * These queries are optimized for the MCP PostgreSQL integration.
 */

class QueryBuilder {
  constructor() {
    this.websiteUrl = process.env.KASIOON_WEBSITE_URL || 'https://kasioon.com';
  }

  /**
   * Build a search query for listings with filters
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

    // Add attribute subqueries
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
   * Build subqueries for common attributes
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
   * Build range filter for numeric attributes
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
   * Build exact match filter for attributes
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
   * Leaf categories are those with no children - users must select these
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
        lav.unit_en
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
}

module.exports = new QueryBuilder();
