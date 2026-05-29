/**
 * CATALOG SEARCH SERVICE - Requêtes SQL optimisées
 * Responsabilités: Recherche avancée avec filtres, tri, pagination
 */

const db = require('../../config/database');
const SearchUtils = require('../../utils/searchUtils');

class CatalogSearchService {
  /**
   * Recherche avancée avec filtres multiples et tri
   */
  static async searchPlaces(filters = {}, sortBy = 'rating', limit = 20, offset = 0) {
    try {
      const { limit: safeLimit, offset: safeOffset } = SearchUtils.validatePagination(limit, offset);
      const { whereClause, params } = SearchUtils.buildWhereClause(filters);
      const orderByClause = SearchUtils.buildOrderByClause(sortBy, {
        lat: filters.lat,
        lng: filters.lng
      });

      // Filtrer par distance si lat/lng fournis
      let distanceFilter = '';
      if (SearchUtils.isValidCoordinates(filters.lat, filters.lng)) {
        const maxDistance = filters.radius || 50000; // 50km par défaut

        distanceFilter = `
          AND (6371000 * acos(cos(radians(${filters.lat})) * cos(radians(p.latitude)) * 
               cos(radians(p.longitude) - radians(${filters.lng})) + 
               sin(radians(${filters.lat})) * sin(radians(p.latitude)))) <= ${maxDistance}
        `;
      }

      // Filtrer par disponibilité actuelle
      let openNowFilter = '';
      if (filters.openNow === true) {
        const now = new Date();
        const dayName = this._getDayName(now.getDay());
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                           now.getMinutes().toString().padStart(2, '0');

        openNowFilter = `
          AND (
            p.opening_hours IS NULL OR 
            JSON_EXTRACT(p.opening_hours, '$.${dayName}.open') IS NULL OR (
              JSON_EXTRACT(p.opening_hours, '$.${dayName}.open') <= '${currentTime}' AND
              JSON_EXTRACT(p.opening_hours, '$.${dayName}.close') >= '${currentTime}'
            )
          )
        `;
      }

      const query = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.category,
          p.subcategory,
          p.latitude,
          p.longitude,
          p.address,
          p.average_price,
          p.opening_hours,
          p.accessibility,
          p.amenities,
          p.phone,
          p.website,
          p.rating,
          p.reservation_count,
          (
            SELECT COUNT(*) FROM reviews 
            WHERE place_id = p.id
          ) as review_count,
          (
            SELECT GROUP_CONCAT(photo_url SEPARATOR ',')
            FROM place_photos 
            WHERE place_id = p.id 
            ORDER BY photo_order 
            LIMIT 5
          ) as photos,
          CASE 
            WHEN ? IS NOT NULL AND ? IS NOT NULL THEN
              ROUND(6371 * acos(cos(radians(?)) * cos(radians(p.latitude)) * 
                    cos(radians(p.longitude) - radians(?)) + 
                    sin(radians(?)) * sin(radians(p.latitude))), 2)
            ELSE NULL
          END as distance_km
        FROM places p
        ${whereClause} ${distanceFilter} ${openNowFilter}
        ${orderByClause}
        LIMIT ? OFFSET ?
      `;

      // Ajouter les paramètres pour distance
      const queryParams = [
        filters.lat || null,
        filters.lng || null,
        filters.lat || null,
        filters.lng || null,
        filters.lat || null,
        ...params,
        safeLimit,
        safeOffset
      ];

      const connection = await db.getConnection();
      const [results] = await connection.query(query, queryParams);
      connection.release();

      // Parser les colonnes JSON
      const places = results.map(place => ({
        ...place,
        opening_hours: SearchUtils.parseJSON(place.opening_hours),
        amenities: SearchUtils.parseJSON(place.amenities),
        photos: place.photos ? place.photos.split(',') : [],
        is_open_now: SearchUtils.isOpenNow(place.opening_hours)
      }));

      return places;
    } catch (error) {
      console.error('Search places error:', error);
      throw new Error(`Erreur recherche: ${error.message}`);
    }
  }

  /**
   * Compter total de résultats (sans pagination)
   */
  static async countSearchResults(filters = {}) {
    try {
      const { whereClause, params } = SearchUtils.buildWhereClause(filters);

      let distanceFilter = '';
      if (SearchUtils.isValidCoordinates(filters.lat, filters.lng)) {
        const maxDistance = filters.radius || 50000;
        distanceFilter = `
          AND (6371000 * acos(cos(radians(${filters.lat})) * cos(radians(p.latitude)) * 
               cos(radians(p.longitude) - radians(${filters.lng})) + 
               sin(radians(${filters.lat})) * sin(radians(p.latitude)))) <= ${maxDistance}
        `;
      }

      const query = `
        SELECT COUNT(*) as total
        FROM places p
        ${whereClause} ${distanceFilter}
      `;

      const connection = await db.getConnection();
      const [results] = await connection.query(query, params);
      connection.release();

      return results[0].total;
    } catch (error) {
      console.error('Count search results error:', error);
      throw new Error(`Erreur comptage: ${error.message}`);
    }
  }

  /**
   * Obtenir détails d'un lieu avec avis et photos
   */
  static async getPlaceDetails(placeId) {
    try {
      const query = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.category,
          p.subcategory,
          p.latitude,
          p.longitude,
          p.address,
          p.average_price,
          p.opening_hours,
          p.accessibility,
          p.amenities,
          p.phone,
          p.website,
          p.rating,
          p.reservation_count,
          p.created_at,
          (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) as review_count
        FROM places p
        WHERE p.id = ?
      `;

      const connection = await db.getConnection();
      const [results] = await connection.query(query, [placeId]);
      
      if (results.length === 0) {
        connection.release();
        return null;
      }

      const place = results[0];

      // Récupérer les photos
      const [photos] = await connection.query(
        `SELECT id, photo_url, alt_text, photo_order 
         FROM place_photos 
         WHERE place_id = ? 
         ORDER BY photo_order ASC`,
        [placeId]
      );

      // Récupérer les avis avec calcul Wilson score
      const [reviews] = await connection.query(
        `SELECT id, user_id, rating, title, content, helpful_count, unhelpful_count, created_at
         FROM reviews 
         WHERE place_id = ? 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [placeId]
      );

      connection.release();

      return {
        ...place,
        opening_hours: SearchUtils.parseJSON(place.opening_hours),
        amenities: SearchUtils.parseJSON(place.amenities),
        is_open_now: SearchUtils.isOpenNow(place.opening_hours),
        photos,
        reviews,
        wilson_score: this._calculateWilsonScoreForPlace(reviews)
      };
    } catch (error) {
      console.error('Get place details error:', error);
      throw new Error(`Erreur détails lieu: ${error.message}`);
    }
  }

  /**
   * Récupérer les suggestions de recherche (autocomplete)
   */
  static async getSearchSuggestions(query, limit = 10) {
    try {
      const searchTerm = `${query}%`;

      const connection = await db.getConnection();
      const [results] = await connection.query(
        `SELECT DISTINCT 
           CASE 
             WHEN name LIKE ? THEN name
             WHEN city LIKE ? THEN city
             WHEN category LIKE ? THEN category
           END as suggestion,
           CASE 
             WHEN name LIKE ? THEN 'place'
             WHEN city LIKE ? THEN 'city'
             WHEN category LIKE ? THEN 'category'
           END as type
         FROM places
         WHERE name LIKE ? OR city LIKE ? OR category LIKE ?
         GROUP BY suggestion, type
         ORDER BY type DESC, suggestion ASC
         LIMIT ?`,
        [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit]
      );

      connection.release();
      return results;
    } catch (error) {
      console.error('Get suggestions error:', error);
      throw new Error(`Erreur suggestions: ${error.message}`);
    }
  }

  /**
   * Obtenir catégories et sous-catégories
   */
  static async getCategories() {
    try {
      const query = `
        SELECT DISTINCT category, subcategory
        FROM places
        WHERE category IS NOT NULL
        ORDER BY category ASC, subcategory ASC
      `;

      const connection = await db.getConnection();
      const [results] = await connection.query(query);
      connection.release();

      // Grouper par catégorie
      const grouped = {};
      results.forEach(row => {
        if (!grouped[row.category]) {
          grouped[row.category] = [];
        }
        if (row.subcategory && !grouped[row.category].includes(row.subcategory)) {
          grouped[row.category].push(row.subcategory);
        }
      });

      return grouped;
    } catch (error) {
      console.error('Get categories error:', error);
      throw new Error(`Erreur catégories: ${error.message}`);
    }
  }

  /**
   * Obtenir les lieux populaires (trending)
   */
  static async getTrendingPlaces(limit = 10) {
    try {
      const query = `
        SELECT 
          p.id,
          p.name,
          p.category,
          p.subcategory,
          p.average_price,
          p.rating,
          p.reservation_count,
          (SELECT GROUP_CONCAT(photo_url, ',')
           FROM place_photos WHERE place_id = p.id ORDER BY photo_order LIMIT 1) as photo
        FROM places p
        WHERE p.reservation_count > 0
        ORDER BY 
          (p.rating * 0.6 + LOG10(p.reservation_count + 1) * 40) DESC,
          p.created_at DESC
        LIMIT ?
      `;

      const connection = await db.getConnection();
      const [results] = await connection.query(query, [limit]);
      connection.release();

      return results.map(place => ({
        ...place,
        photo: place.photo ? place.photo.split(',')[0] : null
      }));
    } catch (error) {
      console.error('Get trending places error:', error);
      throw new Error(`Erreur lieux tendance: ${error.message}`);
    }
  }

  /**
   * Calculer Wilson score pour un lieu
   */
  static _calculateWilsonScoreForPlace(reviews) {
    if (!reviews || reviews.length === 0) {
      return 0;
    }

    const positiveCount = reviews.filter(r => r.rating >= 4).length;
    const total = reviews.length;

    return SearchUtils.calculateWilsonScore(positiveCount, total);
  }

  /**
   * Obtenir jour de la semaine
   */
  static _getDayName(dayOfWeek) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayOfWeek];
  }

  /**
   * Ajouter photo à un lieu
   */
  static async addPlacePhoto(placeId, photoUrl, altText = '', order = 0) {
    try {
      const query = `
        INSERT INTO place_photos (place_id, photo_url, alt_text, photo_order)
        VALUES (?, ?, ?, ?)
      `;

      const connection = await db.getConnection();
      const [result] = await connection.query(query, [placeId, photoUrl, altText, order]);
      connection.release();

      return result.insertId;
    } catch (error) {
      console.error('Add place photo error:', error);
      throw new Error(`Erreur ajout photo: ${error.message}`);
    }
  }

  /**
   * Mettre à jour les informations d'un lieu
   */
  static async updatePlace(placeId, updateData) {
    try {
      const allowedFields = [
        'name', 'description', 'category', 'subcategory',
        'average_price', 'opening_hours', 'accessibility', 'amenities',
        'phone', 'website', 'latitude', 'longitude', 'address'
      ];

      const updates = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updates.length === 0) {
        return { updated: false };
      }

      params.push(placeId);

      const query = `
        UPDATE places 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;

      const connection = await db.getConnection();
      const [result] = await connection.query(query, params);
      connection.release();

      return {
        updated: result.affectedRows > 0,
        changes: result.affectedRows
      };
    } catch (error) {
      console.error('Update place error:', error);
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }
  }
}

module.exports = CatalogSearchService;
