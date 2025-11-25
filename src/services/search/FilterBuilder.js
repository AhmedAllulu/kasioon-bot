const logger = require('../../utils/logger');

/**
 * SQL Filter Builder
 * Builds dynamic WHERE clauses for search queries
 */
class FilterBuilder {
  constructor() {
    this.conditions = [];
    this.params = [];
    this.paramCounter = 1;
  }

  /**
   * Reset builder state
   */
  reset() {
    this.conditions = [];
    this.params = [];
    this.paramCounter = 1;
  }

  /**
   * Add category filter
   * @param {string} categoryId - Category UUID
   * @returns {FilterBuilder} this
   */
  addCategory(categoryId) {
    if (categoryId) {
      this.conditions.push(`l.category_id = $${this.paramCounter}`);
      this.params.push(categoryId);
      this.paramCounter++;
    }
    return this;
  }

  /**
   * Add city filter
   * @param {string} cityId - City UUID
   * @returns {FilterBuilder} this
   */
  addCity(cityId) {
    if (cityId) {
      this.conditions.push(`l.city_id = $${this.paramCounter}`);
      this.params.push(cityId);
      this.paramCounter++;
    }
    return this;
  }

  /**
   * Add neighborhood filter
   * @param {string} neighborhoodId - Neighborhood UUID
   * @returns {FilterBuilder} this
   */
  addNeighborhood(neighborhoodId) {
    if (neighborhoodId) {
      this.conditions.push(`l.neighborhood_id = $${this.paramCounter}`);
      this.params.push(neighborhoodId);
      this.paramCounter++;
    }
    return this;
  }

  /**
   * Add transaction type filter
   * @param {string} transactionTypeSlug - Transaction type slug
   * @returns {FilterBuilder} this
   */
  addTransactionType(transactionTypeSlug) {
    if (transactionTypeSlug) {
      this.conditions.push(
        `tt.slug = $${this.paramCounter}`
      );
      this.params.push(transactionTypeSlug);
      this.paramCounter++;
    }
    return this;
  }

  /**
   * Add status filter (always active listings)
   * @returns {FilterBuilder} this
   */
  addActiveStatus() {
    this.conditions.push(`l.status = 'active'`);
    return this;
  }

  /**
   * Add attribute filters
   * @param {Object} attributes - Attribute filters
   * @returns {FilterBuilder} this
   */
  addAttributes(attributes) {
    if (!attributes || typeof attributes !== 'object') {
      return this;
    }

    Object.entries(attributes).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      // Handle price filter
      if (key === 'price') {
        this.addPriceFilter(value);
        return;
      }

      // Handle area filter
      if (key === 'area') {
        this.addAreaFilter(value);
        return;
      }

      // Handle range filters
      if (typeof value === 'object' && (value.min !== undefined || value.max !== undefined)) {
        this.addRangeFilter(key, value);
        return;
      }

      // Handle exact value filters
      this.addExactAttributeFilter(key, value);
    });

    return this;
  }

  /**
   * Add price filter
   * @param {Object|number} price - Price filter
   */
  addPriceFilter(price) {
    if (typeof price === 'number') {
      // Exact price
      this.conditions.push(
        `EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id
            AND la.slug = 'price'
            AND lav.value_number = $${this.paramCounter}
        )`
      );
      this.params.push(price);
      this.paramCounter++;
    } else if (typeof price === 'object') {
      if (price.min !== undefined) {
        this.conditions.push(
          `EXISTS (
            SELECT 1 FROM listing_attribute_values lav
            JOIN listing_attributes la ON lav.attribute_id = la.id
            WHERE lav.listing_id = l.id
              AND la.slug = 'price'
              AND lav.value_number >= $${this.paramCounter}
          )`
        );
        this.params.push(price.min);
        this.paramCounter++;
      }

      if (price.max !== undefined) {
        this.conditions.push(
          `EXISTS (
            SELECT 1 FROM listing_attribute_values lav
            JOIN listing_attributes la ON lav.attribute_id = la.id
            WHERE lav.listing_id = l.id
              AND la.slug = 'price'
              AND lav.value_number <= $${this.paramCounter}
          )`
        );
        this.params.push(price.max);
        this.paramCounter++;
      }
    }
  }

  /**
   * Add area filter
   * @param {Object|number} area - Area filter
   */
  addAreaFilter(area) {
    const value = typeof area === 'object' ? area.value : area;

    if (value) {
      this.conditions.push(
        `EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id
            AND la.slug = 'area'
            AND lav.value_number >= $${this.paramCounter} * 0.9
            AND lav.value_number <= $${this.paramCounter} * 1.1
        )`
      );
      this.params.push(value);
      this.paramCounter++;
    }
  }

  /**
   * Add range filter for numeric attributes
   * @param {string} attributeSlug - Attribute slug
   * @param {Object} range - Range {min, max}
   */
  addRangeFilter(attributeSlug, range) {
    if (range.min !== undefined) {
      this.conditions.push(
        `EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id
            AND la.slug = $${this.paramCounter}
            AND lav.value_number >= $${this.paramCounter + 1}
        )`
      );
      this.params.push(attributeSlug, range.min);
      this.paramCounter += 2;
    }

    if (range.max !== undefined) {
      this.conditions.push(
        `EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id
            AND la.slug = $${this.paramCounter}
            AND lav.value_number <= $${this.paramCounter + 1}
        )`
      );
      this.params.push(attributeSlug, range.max);
      this.paramCounter += 2;
    }
  }

  /**
   * Add exact attribute filter
   * @param {string} attributeSlug - Attribute slug
   * @param {*} value - Attribute value
   */
  addExactAttributeFilter(attributeSlug, value) {
    if (typeof value === 'number') {
      this.conditions.push(
        `EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id
            AND la.slug = $${this.paramCounter}
            AND lav.value_number = $${this.paramCounter + 1}
        )`
      );
      this.params.push(attributeSlug, value);
      this.paramCounter += 2;
    } else if (typeof value === 'string') {
      this.conditions.push(
        `EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id
            AND la.slug = $${this.paramCounter}
            AND LOWER(lav.value_text) = LOWER($${this.paramCounter + 1})
        )`
      );
      this.params.push(attributeSlug, value);
      this.paramCounter += 2;
    } else if (typeof value === 'boolean') {
      this.conditions.push(
        `EXISTS (
          SELECT 1 FROM listing_attribute_values lav
          JOIN listing_attributes la ON lav.attribute_id = la.id
          WHERE lav.listing_id = l.id
            AND la.slug = $${this.paramCounter}
            AND lav.value_boolean = $${this.paramCounter + 1}
        )`
      );
      this.params.push(attributeSlug, value);
      this.paramCounter += 2;
    }
  }

  /**
   * Build WHERE clause
   * @returns {string} WHERE clause (without 'WHERE' keyword)
   */
  buildWhereClause() {
    if (this.conditions.length === 0) {
      return '1=1';
    }
    return this.conditions.join(' AND ');
  }

  /**
   * Get parameters array
   * @returns {Array} Parameters
   */
  getParams() {
    return this.params;
  }

  /**
   * Build complete filter
   * @param {Object} searchParams - Search parameters
   * @returns {Object} {whereClause, params}
   */
  static build(searchParams) {
    const builder = new FilterBuilder();

    // Always filter for active listings
    builder.addActiveStatus();

    // Add filters from search params
    if (searchParams.categoryId) {
      builder.addCategory(searchParams.categoryId);
    }

    if (searchParams.cityId) {
      builder.addCity(searchParams.cityId);
    }

    if (searchParams.neighborhoodId) {
      builder.addNeighborhood(searchParams.neighborhoodId);
    }

    if (searchParams.transactionTypeSlug) {
      builder.addTransactionType(searchParams.transactionTypeSlug);
    }

    if (searchParams.attributes) {
      builder.addAttributes(searchParams.attributes);
    }

    const whereClause = builder.buildWhereClause();
    const params = builder.getParams();

    logger.debug('Filter built', {
      conditions: builder.conditions.length,
      params: params.length
    });

    return { whereClause, params };
  }
}

module.exports = FilterBuilder;
