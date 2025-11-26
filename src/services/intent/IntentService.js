const database = require('../../config/database');
const logger = require('../../utils/logger');
const responseFormatter = require('../../utils/responseFormatter');

/**
 * Intent Service
 * Handles non-search operations like getting stats, offices, etc.
 */
class IntentService {
  constructor() {
    this.db = database;
  }

  /**
   * Get most viewed listings
   * @param {number} limit - Number of listings to return
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Promise<Object>} Formatted response
   */
  async getMostViewedListings(limit = 10, language = 'ar') {
    try {
      logger.info('Getting most viewed listings', { limit });

      const query = `
        SELECT
          l.id,
          l.title,
          l.description,
          l.category_id,
          l.city_id,
          l.neighborhood_id,
          l.transaction_type_id,
          l.views,
          l.is_boosted,
          l.priority,
          l.created_at,
          c.slug as category_slug,
          c.name_ar as category_name_ar,
          c.name_en as category_name_en,
          ct.name_ar as city_name_ar,
          ct.name_en as city_name_en,
          ct.province_ar,
          ct.province_en,
          n.name_ar as neighborhood_name_ar,
          n.name_en as neighborhood_name_en,
          tt.slug as transaction_type_slug,
          tt.name_ar as transaction_type_name_ar,
          tt.name_en as transaction_type_name_en,
          (
            SELECT url FROM listing_images
            WHERE listing_id = l.id AND is_main = true
            LIMIT 1
          ) as main_image_url
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        JOIN cities ct ON l.city_id = ct.id
        LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
        LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
        WHERE l.status = 'active'
        ORDER BY l.views DESC, l.created_at DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);

      logger.info('Most viewed listings retrieved', {
        count: result.rows.length
      });

      // Enrich with attributes
      const enrichedListings = await this.enrichListings(result.rows);

      const formattedListings = enrichedListings.map(listing =>
        responseFormatter.formatListing(listing, language)
      );

      return {
        success: true,
        data: formattedListings,
        meta: {
          intent: 'most_viewed',
          count: formattedListings.length,
          limit
        }
      };
    } catch (error) {
      logger.error('Get most viewed listings error:', error);
      throw error;
    }
  }

  /**
   * Get most impressioned listings
   * Note: Impressions tracking might need to be added if not exists
   * For now, using views + boosted + priority as proxy
   * @param {number} limit - Number of listings to return
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Promise<Object>} Formatted response
   */
  async getMostImpressionedListings(limit = 10, language = 'ar') {
    try {
      logger.info('Getting most impressioned listings', { limit });

      const query = `
        SELECT
          l.id,
          l.title,
          l.description,
          l.category_id,
          l.city_id,
          l.neighborhood_id,
          l.transaction_type_id,
          l.views,
          l.is_boosted,
          l.priority,
          l.created_at,
          c.slug as category_slug,
          c.name_ar as category_name_ar,
          c.name_en as category_name_en,
          ct.name_ar as city_name_ar,
          ct.name_en as city_name_en,
          ct.province_ar,
          ct.province_en,
          n.name_ar as neighborhood_name_ar,
          n.name_en as neighborhood_name_en,
          tt.slug as transaction_type_slug,
          tt.name_ar as transaction_type_name_ar,
          tt.name_en as transaction_type_name_en,
          (
            SELECT url FROM listing_images
            WHERE listing_id = l.id AND is_main = true
            LIMIT 1
          ) as main_image_url,
          (l.views * 1.0 + CASE WHEN l.is_boosted THEN 1000 ELSE 0 END + l.priority * 10) as impression_score
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        JOIN cities ct ON l.city_id = ct.id
        LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
        LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
        WHERE l.status = 'active'
        ORDER BY impression_score DESC, l.created_at DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);

      logger.info('Most impressioned listings retrieved', {
        count: result.rows.length
      });

      // Enrich with attributes
      const enrichedListings = await this.enrichListings(result.rows);

      const formattedListings = enrichedListings.map(listing =>
        responseFormatter.formatListing(listing, language)
      );

      return {
        success: true,
        data: formattedListings,
        meta: {
          intent: 'most_impressioned',
          count: formattedListings.length,
          limit
        }
      };
    } catch (error) {
      logger.error('Get most impressioned listings error:', error);
      throw error;
    }
  }

  /**
   * Get list of offices
   * @param {number} limit - Number of offices to return
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Promise<Object>} Formatted response
   */
  async getOffices(limit = 20, language = 'ar') {
    try {
      logger.info('Getting offices list', { limit });

      const query = `
        SELECT
          o.id,
          o.name,
          o.description,
          o.phone,
          o.email,
          o.website,
          o.logo,
          o.city_id,
          o.address,
          o.location,
          o.is_premium,
          o.average_rating,
          o.rating_count,
          o.properties_count,
          o.created_at,
          ct.name_ar as city_name_ar,
          ct.name_en as city_name_en,
          ct.province_ar,
          ct.province_en
        FROM offices o
        LEFT JOIN cities ct ON o.city_id = ct.id
        WHERE o.status = 'approved'
        ORDER BY o.is_premium DESC, o.average_rating DESC NULLS LAST, o.created_at DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);

      logger.info('Offices retrieved', { count: result.rows.length });

      const formattedOffices = result.rows.map(office => ({
        id: office.id,
        name: office.name,
        url: `https://www.kasioon.com/office/${office.id}`,
        description: office.description,
        phone: office.phone,
        email: office.email,
        website: office.website,
        logo: office.logo,
        city: language === 'ar' ? office.city_name_ar : office.city_name_en,
        province: language === 'ar' ? office.province_ar : office.province_en,
        address: office.address,
        location: office.location,
        isPremium: office.is_premium,
        rating: office.average_rating,
        ratingCount: office.rating_count,
        activeListingsCount: office.properties_count,
        createdAt: office.created_at
      }));

      return {
        success: true,
        data: formattedOffices,
        meta: {
          intent: 'get_offices',
          count: formattedOffices.length,
          limit
        }
      };
    } catch (error) {
      logger.error('Get offices error:', error);
      throw error;
    }
  }

  /**
   * Get office details
   * @param {string} officeId - Office ID or name
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Promise<Object>} Formatted response
   */
  async getOfficeDetails(officeId, language = 'ar') {
    try {
      logger.info('Getting office details', { officeId });

      // Try to find office by ID or name
      // Check if officeId is a valid UUID format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(officeId);

      let query, params;

      if (isUUID) {
        // Search by ID or name
        query = `
          SELECT
            o.id,
            o.name,
            o.description,
            o.phone,
            o.email,
            o.website,
            o.logo,
            o.city_id,
            o.address,
            o.location,
            o.is_premium,
            o.average_rating,
            o.rating_count,
            o.properties_count,
            o.created_at,
            ct.name_ar as city_name_ar,
            ct.name_en as city_name_en,
            ct.province_ar,
            ct.province_en,
            (
              SELECT COUNT(*) FROM listings
              WHERE office_id = o.id AND status = 'active'
            ) as active_listings_count,
            (
              SELECT COUNT(*) FROM listings
              WHERE office_id = o.id
            ) as total_listings_count
          FROM offices o
          LEFT JOIN cities ct ON o.city_id = ct.id
          WHERE (o.id = $1 OR o.name ILIKE $2)
            AND o.status = 'approved'
          LIMIT 1
        `;
        params = [officeId, `%${officeId}%`];
      } else {
        // Search only by name
        query = `
          SELECT
            o.id,
            o.name,
            o.description,
            o.phone,
            o.email,
            o.website,
            o.logo,
            o.city_id,
            o.address,
            o.location,
            o.is_premium,
            o.average_rating,
            o.rating_count,
            o.properties_count,
            o.created_at,
            ct.name_ar as city_name_ar,
            ct.name_en as city_name_en,
            ct.province_ar,
            ct.province_en,
            (
              SELECT COUNT(*) FROM listings
              WHERE office_id = o.id AND status = 'active'
            ) as active_listings_count,
            (
              SELECT COUNT(*) FROM listings
              WHERE office_id = o.id
            ) as total_listings_count
          FROM offices o
          LEFT JOIN cities ct ON o.city_id = ct.id
          WHERE o.name ILIKE $1
            AND o.status = 'approved'
          LIMIT 1
        `;
        params = [`%${officeId}%`];
      }

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: language === 'ar'
            ? 'لم يتم العثور على المكتب المطلوب'
            : 'Office not found',
          meta: { intent: 'get_office_details' }
        };
      }

      const office = result.rows[0];

      logger.info('Office details retrieved', {
        officeId: office.id,
        name: office.name
      });

      const formattedOffice = {
        id: office.id,
        name: office.name,
        url: `https://www.kasioon.com/office/${office.id}`,
        description: office.description,
        phone: office.phone,
        email: office.email,
        website: office.website,
        logo: office.logo,
        city: language === 'ar' ? office.city_name_ar : office.city_name_en,
        province: language === 'ar' ? office.province_ar : office.province_en,
        address: office.address,
        location: office.location,
        isPremium: office.is_premium,
        rating: office.average_rating,
        ratingCount: office.rating_count,
        propertiesCount: office.properties_count,
        activeListingsCount: parseInt(office.active_listings_count),
        totalListingsCount: parseInt(office.total_listings_count),
        createdAt: office.created_at
      };

      return {
        success: true,
        data: formattedOffice,
        meta: { intent: 'get_office_details' }
      };
    } catch (error) {
      logger.error('Get office details error:', error);
      throw error;
    }
  }

  /**
   * Get listings from a specific office
   * @param {string} officeId - Office ID or name
   * @param {number} limit - Number of listings to return
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Promise<Object>} Formatted response
   */
  async getOfficeListings(officeId, limit = 20, language = 'ar') {
    try {
      logger.info('Getting office listings', { officeId, limit });

      // First, find the office
      // Check if officeId is a valid UUID format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(officeId);

      let officeQuery, officeParams;

      if (isUUID) {
        officeQuery = `
          SELECT id, name
          FROM offices
          WHERE (id = $1 OR name ILIKE $2)
            AND status = 'approved'
          LIMIT 1
        `;
        officeParams = [officeId, `%${officeId}%`];
      } else {
        officeQuery = `
          SELECT id, name
          FROM offices
          WHERE name ILIKE $1
            AND status = 'approved'
          LIMIT 1
        `;
        officeParams = [`%${officeId}%`];
      }

      const officeResult = await this.db.query(officeQuery, officeParams);

      if (officeResult.rows.length === 0) {
        return {
          success: false,
          error: language === 'ar'
            ? 'لم يتم العثور على المكتب المطلوب'
            : 'Office not found',
          meta: { intent: 'get_office_listings' }
        };
      }

      const office = officeResult.rows[0];

      // Get listings for this office
      const listingsQuery = `
        SELECT
          l.id,
          l.title,
          l.description,
          l.category_id,
          l.city_id,
          l.neighborhood_id,
          l.transaction_type_id,
          l.views,
          l.is_boosted,
          l.priority,
          l.created_at,
          c.slug as category_slug,
          c.name_ar as category_name_ar,
          c.name_en as category_name_en,
          ct.name_ar as city_name_ar,
          ct.name_en as city_name_en,
          ct.province_ar,
          ct.province_en,
          n.name_ar as neighborhood_name_ar,
          n.name_en as neighborhood_name_en,
          tt.slug as transaction_type_slug,
          tt.name_ar as transaction_type_name_ar,
          tt.name_en as transaction_type_name_en,
          (
            SELECT url FROM listing_images
            WHERE listing_id = l.id AND is_main = true
            LIMIT 1
          ) as main_image_url
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        JOIN cities ct ON l.city_id = ct.id
        LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
        LEFT JOIN transaction_types tt ON l.transaction_type_id = tt.id
        WHERE l.office_id = $1 AND l.status = 'active'
        ORDER BY l.is_boosted DESC, l.priority DESC, l.created_at DESC
        LIMIT $2
      `;

      const listingsResult = await this.db.query(listingsQuery, [office.id, limit]);

      logger.info('Office listings retrieved', {
        officeId: office.id,
        count: listingsResult.rows.length
      });

      // Enrich with attributes
      const enrichedListings = await this.enrichListings(listingsResult.rows);

      const formattedListings = enrichedListings.map(listing =>
        responseFormatter.formatListing(listing, language)
      );

      return {
        success: true,
        data: formattedListings,
        office: {
          id: office.id,
          name: office.name
        },
        meta: {
          intent: 'get_office_listings',
          count: formattedListings.length,
          limit
        }
      };
    } catch (error) {
      logger.error('Get office listings error:', error);
      throw error;
    }
  }

  /**
   * Get help/capabilities message
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Object} Help message
   */
  getHelpMessage(language = 'ar') {
    if (language === 'ar') {
      return {
        success: true,
        message: `مرحباً! أنا مساعد قاسيون الذكي 🤖

يمكنني مساعدتك في:

🔍 **البحث عن إعلانات**
   - "بدي سيارة هيونداي"
   - "شقة للإيجار بدمشق"
   - "ايفون مستعمل"

📊 **الإحصائيات والتصنيفات**
   - "أكتر الإعلانات مشاهدة"
   - "الإعلانات الأكثر تفاعلاً"

🏢 **المكاتب العقارية**
   - "شو المكاتب الموجودة"
   - "تفاصيل المكتب رقم X"
   - "إعلانات المكتب X"

فقط اكتبلي شو بدك وأنا بساعدك! 🚀`,
        meta: { intent: 'help' }
      };
    } else {
      return {
        success: true,
        message: `Hello! I'm Kasioon AI Assistant 🤖

I can help you with:

🔍 **Search for listings**
   - "I want a Hyundai car"
   - "Apartment for rent in Damascus"
   - "Used iPhone"

📊 **Statistics and Rankings**
   - "Most viewed listings"
   - "Most impressioned listings"

🏢 **Real Estate Offices**
   - "List offices"
   - "Office details for X"
   - "Listings from office X"

Just tell me what you need! 🚀`,
        meta: { intent: 'help' }
      };
    }
  }

  /**
   * Get greeting message
   * @param {string} language - Language ('ar' or 'en')
   * @returns {Object} Greeting message
   */
  getGreetingMessage(language = 'ar') {
    if (language === 'ar') {
      return {
        success: true,
        message: `أهلاً وسهلاً! 👋

أنا مساعد قاسيون الذكي للبحث.
شو بدك دور عليه اليوم؟

💡 جرب مثلاً:
   - "بدي سيارة هيونداي موديل حديث"
   - "شقة للإيجار بدمشق"
   - "أكتر الإعلانات مشاهدة"`,
        meta: { intent: 'greeting' }
      };
    } else {
      return {
        success: true,
        message: `Hello! 👋

I'm Kasioon AI Search Assistant.
What are you looking for today?

💡 Try for example:
   - "I want a recent Hyundai car"
   - "Apartment for rent in Damascus"
   - "Most viewed listings"`,
        meta: { intent: 'greeting' }
      };
    }
  }

  /**
   * Enrich listings with attributes
   * @param {Array} listings - Raw listings
   * @returns {Promise<Array>} Enriched listings
   */
  async enrichListings(listings) {
    if (listings.length === 0) return [];

    try {
      const listingIds = listings.map(l => l.id);

      // Get all attributes for these listings (using same method as TextSearch)
      const attributesQuery = `
        SELECT
          lav.listing_id,
          la.slug,
          lav.value_number,
          lav.value_text,
          lav.unit_ar
        FROM listing_attribute_values lav
        JOIN listing_attributes la ON lav.attribute_id = la.id
        WHERE lav.listing_id = ANY($1)
          AND la.slug IN ('price', 'area', 'rooms', 'bathrooms', 'year', 'mileage', 'brand', 'model')
      `;

      const attributesResult = await this.db.query(attributesQuery, [listingIds]);

      // Group attributes by listing_id
      const attributesByListing = {};
      attributesResult.rows.forEach(attr => {
        if (!attributesByListing[attr.listing_id]) {
          attributesByListing[attr.listing_id] = {};
        }

        const value = attr.value_number !== null ? attr.value_number : attr.value_text;
        attributesByListing[attr.listing_id][attr.slug] = value;

        if (attr.slug === 'price') {
          attributesByListing[attr.listing_id].price = attr.value_number;
          attributesByListing[attr.listing_id].currency = attr.unit_ar || 'SYP';
        }
      });

      // Attach attributes to listings
      return listings.map(listing => ({
        ...listing,
        price: attributesByListing[listing.id]?.price || null,
        currency: attributesByListing[listing.id]?.currency || 'SYP',
        attributes: attributesByListing[listing.id] || {}
      }));
    } catch (error) {
      logger.error('Enrich listings error:', error);
      return listings;
    }
  }
}

// Singleton instance
module.exports = new IntentService();
