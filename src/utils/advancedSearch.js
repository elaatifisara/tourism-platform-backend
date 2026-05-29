// Advanced Search Service for Catalog
// Implements multi-criteria filtering, geolocation search, and weighted ratings

class AdvancedSearchService {
  /**
   * Search places with advanced filters
   * @param {Object} filters - Filter criteria
   * @param {Sequelize} db - Database instance
   */
  static async searchPlaces(filters, db) {
    const {
      category,
      subcategory,
      priceMin = 0,
      priceMax = 99999,
      ratingMin = 0,
      distance = null, // in km
      latitude = null,
      longitude = null,
      hours, // operating hours filter
      accessibility = false,
      sort = 'rating', // rating, price, distance, popularity
      limit = 20,
      offset = 0,
    } = filters;

    try {
      let query = `
        SELECT 
          p.*,
          AVG(CAST(r.rating AS FLOAT)) as average_rating,
          COUNT(r.id) as review_count,
          CAST(COUNT(r.id) * AVG(CAST(r.rating AS FLOAT)) / 5 AS FLOAT) as weighted_rating
        FROM places p
        LEFT JOIN reviews r ON p.id = r.place_id
        WHERE 1=1
      `;

      const params = [];

      // Category filter
      if (category) {
        query += ` AND p.category = ?`;
        params.push(category);
      }

      // Sub-category filter
      if (subcategory) {
        query += ` AND p.subcategory = ?`;
        params.push(subcategory);
      }

      // Price range filter
      query += ` AND p.average_price BETWEEN ? AND ?`;
      params.push(priceMin, priceMax);

      // Rating filter (minimum rating)
      if (ratingMin > 0) {
        query += ` AND AVG(CAST(r.rating AS FLOAT)) >= ?`;
        params.push(ratingMin);
      }

      // Accessibility filter
      if (accessibility) {
        query += ` AND p.accessibility = true`;
      }

      // Operating hours filter
      if (hours) {
        const currentHour = new Date().getHours();
        const operatingHourStart = parseInt(hours.split('-')[0]);
        const operatingHourEnd = parseInt(hours.split('-')[1]);
        query += ` AND p.opening_hour <= ? AND p.closing_hour >= ?`;
        params.push(operatingHourStart, operatingHourEnd);
      }

      // Geolocation filter (distance-based)
      if (latitude && longitude && distance) {
        query += `
          AND (
            3959 * acos(
              cos(radians(?)) * cos(radians(p.latitude)) * 
              cos(radians(p.longitude) - radians(?)) + 
              sin(radians(?)) * sin(radians(p.latitude))
            )
          ) <= ?
        `;
        params.push(latitude, longitude, latitude, distance);
      }

      // Grouping
      query += ` GROUP BY p.id`;

      // Sorting
      switch (sort) {
        case 'rating':
          query += ` ORDER BY weighted_rating DESC, review_count DESC`;
          break;
        case 'price':
          query += ` ORDER BY p.average_price ASC`;
          break;
        case 'distance':
          if (latitude && longitude) {
            query += `
              ORDER BY (
                3959 * acos(
                  cos(radians(?)) * cos(radians(p.latitude)) * 
                  cos(radians(p.longitude) - radians(?)) + 
                  sin(radians(?)) * sin(radians(p.latitude))
                )
              ) ASC
            `;
            params.push(latitude, longitude, latitude);
          }
          break;
        case 'popularity':
          query += ` ORDER BY review_count DESC`;
          break;
        default:
          query += ` ORDER BY weighted_rating DESC`;
      }

      // Pagination
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      // Execute query
      const results = await db.query(query, params);

      return {
        success: true,
        data: results,
        count: results.length,
        limit,
        offset,
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate weighted rating
   * Weighted by number of reviews to prioritize places with more reviews
   */
  static calculateWeightedRating(averageRating, reviewCount) {
    // Formula: average_rating * (review_count / (review_count + k))
    // k = 5 (influence parameter)
    const k = 5;
    return (averageRating * reviewCount) / (reviewCount + k);
  }

  /**
   * Get available categories and subcategories
   */
  static async getCategories(db) {
    try {
      const categories = await db.query(`
        SELECT DISTINCT category, subcategory
        FROM places
        ORDER BY category, subcategory
      `);

      const grouped = {};
      categories.forEach((item) => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item.subcategory);
      });

      return { success: true, categories: grouped };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get price range statistics
   */
  static async getPriceRange(db) {
    try {
      const result = await db.query(`
        SELECT 
          MIN(average_price) as min_price,
          MAX(average_price) as max_price,
          AVG(average_price) as avg_price
        FROM places
      `);

      return {
        success: true,
        minPrice: Math.floor(result[0].min_price),
        maxPrice: Math.ceil(result[0].max_price),
        avgPrice: Math.round(result[0].avg_price),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get nearby places (geolocation-based)
   */
  static async getNearbyPlaces(db, latitude, longitude, radiusKm = 5) {
    try {
      const query = `
        SELECT 
          p.*,
          (
            3959 * acos(
              cos(radians(?)) * cos(radians(p.latitude)) * 
              cos(radians(p.longitude) - radians(?)) + 
              sin(radians(?)) * sin(radians(p.latitude))
            )
          ) as distance_km,
          AVG(CAST(r.rating AS FLOAT)) as average_rating
        FROM places p
        LEFT JOIN reviews r ON p.id = r.place_id
        WHERE (
          3959 * acos(
            cos(radians(?)) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(p.latitude))
          )
        ) <= ?
        GROUP BY p.id
        ORDER BY distance_km ASC
        LIMIT 20
      `;

      const results = await db.query(query, [
        latitude,
        longitude,
        latitude,
        latitude,
        longitude,
        latitude,
        radiusKm,
      ]);

      return { success: true, places: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Suggest places based on user preferences
   */
  static async getSuggestions(db, userId) {
    try {
      // Get user's previous bookings and their categories
      const userPreferences = await db.query(`
        SELECT DISTINCT p.category, p.subcategory
        FROM bookings b
        JOIN places p ON b.place_id = p.id
        WHERE b.user_id = ?
        LIMIT 10
      `, [userId]);

      if (userPreferences.length === 0) {
        // If no history, return popular places
        return await db.query(`
          SELECT p.*, AVG(CAST(r.rating AS FLOAT)) as average_rating
          FROM places p
          LEFT JOIN reviews r ON p.id = r.place_id
          GROUP BY p.id
          ORDER BY average_rating DESC
          LIMIT 10
        `);
      }

      // Get similar places based on preferences
      const categories = userPreferences.map((p) => p.category);
      const placeholders = categories.map(() => '?').join(',');

      const suggestions = await db.query(`
        SELECT p.*, AVG(CAST(r.rating AS FLOAT)) as average_rating
        FROM places p
        LEFT JOIN reviews r ON p.id = r.place_id
        WHERE p.category IN (${placeholders})
        GROUP BY p.id
        ORDER BY average_rating DESC
        LIMIT 10
      `, categories);

      return { success: true, suggestions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = AdvancedSearchService;
