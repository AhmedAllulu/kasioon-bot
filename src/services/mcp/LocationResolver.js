const database = require('../../config/database');
const openAIService = require('../ai/OpenAIService');
const cacheService = require('../cache/CacheService');
const arabicNormalizer = require('../../utils/arabicNormalizer');
const logger = require('../../utils/logger');

class LocationResolver {
  constructor() {
    this.db = database;
    this.ai = openAIService;
    this.cache = cacheService;
  }

  /**
   * Resolve location from hint text
   * @param {string} hint - Location hint from AI
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Promise<Object|null>} Resolved location
   */
  async resolve(hint, language = 'ar') {
    if (!hint) {
      logger.debug('No location hint provided');
      return null;
    }

    try {
      logger.debug('Resolving location', { hint, language });

      // Try city match first (most common)
      const cityMatch = await this.matchCity(hint, language);
      if (cityMatch) {
        logger.info('Location resolved as city', {
          hint,
          city: cityMatch.name_ar,
          confidence: cityMatch.confidence
        });
        return {
          ...cityMatch,
          type: 'city'
        };
      }

      // Try neighborhood match
      const neighborhoodMatch = await this.matchNeighborhood(hint, language);
      if (neighborhoodMatch) {
        logger.info('Location resolved as neighborhood', {
          hint,
          neighborhood: neighborhoodMatch.name_ar,
          city: neighborhoodMatch.city_name_ar
        });
        return {
          ...neighborhoodMatch,
          type: 'neighborhood'
        };
      }

      // Try province match
      const provinceMatch = await this.matchProvince(hint, language);
      if (provinceMatch) {
        logger.info('Location resolved as province', {
          hint,
          province: provinceMatch.name_ar
        });
        return {
          ...provinceMatch,
          type: 'province'
        };
      }

      logger.warn('No location match found', { hint });
      return null;
    } catch (error) {
      logger.error('Location resolution error:', error);
      return null;
    }
  }

  /**
   * Match city from hint
   * @param {string} hint - Search hint
   * @param {string} language - Language
   * @returns {Promise<Object|null>} Matched city
   */
  async matchCity(hint, language) {
    try {
      const normalized = arabicNormalizer.normalizeAndLower(hint);
      const column = language === 'ar' ? 'name_ar' : 'name_en';

      // Try exact match first
      let result = await this.db.query(
        `
        SELECT
          id,
          name_ar,
          name_en,
          province_ar,
          province_en,
          latitude,
          longitude,
          1.0 as confidence
        FROM cities
        WHERE is_active = true
          AND LOWER(${column}) = $1
        LIMIT 1
        `,
        [normalized]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Try fuzzy match with trigram similarity
      result = await this.db.query(
        `
        SELECT
          id,
          name_ar,
          name_en,
          province_ar,
          province_en,
          latitude,
          longitude,
          SIMILARITY(${column}, $1) as confidence
        FROM cities
        WHERE is_active = true
          AND SIMILARITY(${column}, $1) > 0.4
        ORDER BY SIMILARITY(${column}, $1) DESC
        LIMIT 1
        `,
        [hint]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('City match error:', error);
      return null;
    }
  }

  /**
   * Match neighborhood from hint
   * @param {string} hint - Search hint
   * @param {string} language - Language
   * @returns {Promise<Object|null>} Matched neighborhood
   */
  async matchNeighborhood(hint, language) {
    try {
      const normalized = arabicNormalizer.normalizeAndLower(hint);
      const column = language === 'ar' ? 'name_ar' : 'name_en';

      // Try exact match
      let result = await this.db.query(
        `
        SELECT
          n.id,
          n.name_ar,
          n.name_en,
          n.city_id,
          c.name_ar as city_name_ar,
          c.name_en as city_name_en,
          n.latitude,
          n.longitude,
          1.0 as confidence
        FROM neighborhoods n
        JOIN cities c ON n.city_id = c.id
        WHERE n.is_active = true
          AND LOWER(n.${column}) = $1
        LIMIT 1
        `,
        [normalized]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Try fuzzy match
      result = await this.db.query(
        `
        SELECT
          n.id,
          n.name_ar,
          n.name_en,
          n.city_id,
          c.name_ar as city_name_ar,
          c.name_en as city_name_en,
          n.latitude,
          n.longitude,
          SIMILARITY(n.${column}, $1) as confidence
        FROM neighborhoods n
        JOIN cities c ON n.city_id = c.id
        WHERE n.is_active = true
          AND SIMILARITY(n.${column}, $1) > 0.5
        ORDER BY SIMILARITY(n.${column}, $1) DESC
        LIMIT 1
        `,
        [hint]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Neighborhood match error:', error);
      return null;
    }
  }

  /**
   * Match province/governorate from hint
   * @param {string} hint - Search hint
   * @param {string} language - Language
   * @returns {Promise<Object|null>} Matched province
   */
  async matchProvince(hint, language) {
    try {
      const normalized = arabicNormalizer.normalizeAndLower(hint);
      const provinceColumn = language === 'ar' ? 'province_ar' : 'province_en';

      const result = await this.db.query(
        `
        SELECT DISTINCT
          province_ar as name_ar,
          province_en as name_en,
          1.0 as confidence
        FROM cities
        WHERE is_active = true
          AND LOWER(${provinceColumn}) = $1
        LIMIT 1
        `,
        [normalized]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Province match error:', error);
      return null;
    }
  }

  /**
   * Get city by ID
   * @param {string} cityId - City UUID
   * @returns {Promise<Object|null>} City
   */
  async getCityById(cityId) {
    try {
      const cached = await this.cache.getStructure('cities', cityId);
      if (cached) {
        return cached;
      }

      const result = await this.db.query(
        `
        SELECT
          id,
          name_ar,
          name_en,
          province_ar,
          province_en,
          latitude,
          longitude,
          population
        FROM cities
        WHERE id = $1 AND is_active = true
        `,
        [cityId]
      );

      const city = result.rows[0] || null;

      if (city) {
        await this.cache.setStructure('cities', city, cityId);
      }

      return city;
    } catch (error) {
      logger.error('Get city by ID error:', error);
      return null;
    }
  }

  /**
   * Get neighborhoods for a city
   * @param {string} cityId - City UUID
   * @returns {Promise<Array>} Neighborhoods
   */
  async getNeighborhoodsByCity(cityId) {
    try {
      const result = await this.db.query(
        `
        SELECT
          id,
          name_ar,
          name_en,
          city_id,
          latitude,
          longitude
        FROM neighborhoods
        WHERE city_id = $1 AND is_active = true
        ORDER BY name_ar ASC
        `,
        [cityId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Get neighborhoods error:', error);
      return [];
    }
  }

  /**
   * Get all active cities
   * @returns {Promise<Array>} Cities
   */
  async getAllCities() {
    try {
      const cached = await this.cache.getStructure('cities', 'all');
      if (cached) {
        return cached;
      }

      const result = await this.db.query(
        `
        SELECT
          id,
          name_ar,
          name_en,
          province_ar,
          province_en,
          population
        FROM cities
        WHERE is_active = true
        ORDER BY population DESC NULLS LAST, name_ar ASC
        `
      );

      const cities = result.rows;
      await this.cache.setStructure('cities', cities, 'all');

      return cities;
    } catch (error) {
      logger.error('Get all cities error:', error);
      return [];
    }
  }

  /**
   * Get all provinces
   * @returns {Promise<Array>} Provinces
   */
  async getAllProvinces() {
    try {
      const result = await this.db.query(
        `
        SELECT DISTINCT
          province_ar as name_ar,
          province_en as name_en
        FROM cities
        WHERE is_active = true
        ORDER BY province_ar ASC
        `
      );

      return result.rows;
    } catch (error) {
      logger.error('Get all provinces error:', error);
      return [];
    }
  }

  /**
   * Normalize Syrian location names (handle aliases)
   * @param {string} location - Location name
   * @returns {string} Normalized name
   */
  normalizeLocationName(location) {
    const aliases = {
      'الشام': 'دمشق',
      'حماه': 'حماة',
      'حماة': 'حماة'
    };

    return aliases[location] || location;
  }
}

// Singleton instance
module.exports = new LocationResolver();
