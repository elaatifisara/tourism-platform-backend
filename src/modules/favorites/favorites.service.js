/**
 * FAVORITES SERVICE - Gestion des favoris utilisateur
 * Responsabilités: CRUD favoris, lister favoris avec détails
 */

const db = require('../../config/database');

class FavoritesService {
  /**
   * Ajouter un lieu aux favoris
   */
  static async addFavorite(userId, placeId) {
    try {
      // Vérifier que le lieu existe
      const connection = await db.getConnection();
      
      const [placeCheck] = await connection.query(
        'SELECT id FROM places WHERE id = ?',
        [placeId]
      );

      if (placeCheck.length === 0) {
        connection.release();
        throw new Error('Lieu non trouvé');
      }

      // Vérifier si déjà en favori
      const [favorite] = await connection.query(
        'SELECT id FROM favorites WHERE user_id = ? AND place_id = ?',
        [userId, placeId]
      );

      if (favorite.length > 0) {
        connection.release();
        throw new Error('Déjà en favori');
      }

      // Ajouter aux favoris
      const [result] = await connection.query(
        'INSERT INTO favorites (user_id, place_id) VALUES (?, ?)',
        [userId, placeId]
      );

      connection.release();

      return {
        id: result.insertId,
        user_id: userId,
        place_id: placeId,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Add favorite error:', error);
      throw new Error(`Erreur ajout favori: ${error.message}`);
    }
  }

  /**
   * Supprimer des favoris
   */
  static async removeFavorite(userId, placeId) {
    try {
      const connection = await db.getConnection();
      
      const [result] = await connection.query(
        'DELETE FROM favorites WHERE user_id = ? AND place_id = ?',
        [userId, placeId]
      );

      connection.release();

      if (result.affectedRows === 0) {
        throw new Error('Favori non trouvé');
      }

      return {
        message: 'Favori supprimé',
        deleted: true
      };
    } catch (error) {
      console.error('Remove favorite error:', error);
      throw new Error(`Erreur suppression favori: ${error.message}`);
    }
  }

  /**
   * Obtenir tous les favoris d'un utilisateur (avec détails)
   */
  static async getUserFavorites(userId, limit = 100, offset = 0) {
    try {
      const query = `
        SELECT 
          f.id as favorite_id,
          f.created_at as added_to_favorites,
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
            SELECT GROUP_CONCAT(photo_url SEPARATOR ',')
            FROM place_photos 
            WHERE place_id = p.id 
            ORDER BY photo_order 
            LIMIT 1
          ) as photo,
          (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) as review_count
        FROM favorites f
        JOIN places p ON f.place_id = p.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const connection = await db.getConnection();
      const [results] = await connection.query(query, [userId, limit, offset]);

      // Compter total
      const [countResults] = await connection.query(
        'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
        [userId]
      );

      connection.release();

      const favorites = results.map(fav => ({
        favorite_id: fav.favorite_id,
        added_at: fav.added_to_favorites,
        place: {
          id: fav.id,
          name: fav.name,
          description: fav.description,
          category: fav.category,
          subcategory: fav.subcategory,
          latitude: fav.latitude,
          longitude: fav.longitude,
          address: fav.address,
          average_price: fav.average_price,
          opening_hours: this._parseJSON(fav.opening_hours),
          accessibility: fav.accessibility,
          amenities: this._parseJSON(fav.amenities),
          phone: fav.phone,
          website: fav.website,
          rating: fav.rating,
          reservation_count: fav.reservation_count,
          photo: fav.photo,
          review_count: fav.review_count
        }
      }));

      return {
        favorites,
        pagination: {
          total: countResults[0].total,
          limit,
          offset,
          page: Math.floor(offset / limit) + 1
        }
      };
    } catch (error) {
      console.error('Get user favorites error:', error);
      throw new Error(`Erreur récupération favoris: ${error.message}`);
    }
  }

  /**
   * Vérifier si un lieu est en favori
   */
  static async isFavorite(userId, placeId) {
    try {
      const connection = await db.getConnection();
      const [results] = await connection.query(
        'SELECT id FROM favorites WHERE user_id = ? AND place_id = ?',
        [userId, placeId]
      );
      connection.release();

      return {
        is_favorite: results.length > 0,
        favorite_id: results.length > 0 ? results[0].id : null
      };
    } catch (error) {
      console.error('Check favorite error:', error);
      throw new Error(`Erreur vérification favori: ${error.message}`);
    }
  }

  /**
   * Obtenir favoris avec recherche et tri
   */
  static async searchFavorites(userId, filters = {}, sortBy = 'added_date', limit = 20, offset = 0) {
    try {
      let where = 'f.user_id = ?';
      const params = [userId];

      // Filtrer par catégorie
      if (filters.category) {
        where += ' AND p.category = ?';
        params.push(filters.category);
      }

      // Filtrer par prix
      if (filters.priceMin !== undefined) {
        where += ' AND p.average_price >= ?';
        params.push(filters.priceMin);
      }

      if (filters.priceMax !== undefined) {
        where += ' AND p.average_price <= ?';
        params.push(filters.priceMax);
      }

      // Filtrer par note
      if (filters.ratingMin !== undefined) {
        where += ' AND p.rating >= ?';
        params.push(filters.ratingMin);
      }

      // Déterminer le tri
      let orderBy = 'f.created_at DESC';
      switch (sortBy) {
        case 'rating':
          orderBy = 'p.rating DESC, p.id DESC';
          break;
        case 'price_asc':
          orderBy = 'p.average_price ASC, p.id DESC';
          break;
        case 'price_desc':
          orderBy = 'p.average_price DESC, p.id DESC';
          break;
        case 'name':
          orderBy = 'p.name ASC';
          break;
        case 'added_date':
        default:
          orderBy = 'f.created_at DESC';
      }

      const query = `
        SELECT 
          f.id as favorite_id,
          f.created_at as added_to_favorites,
          p.id,
          p.name,
          p.description,
          p.category,
          p.subcategory,
          p.average_price,
          p.rating,
          (
            SELECT GROUP_CONCAT(photo_url SEPARATOR ',')
            FROM place_photos 
            WHERE place_id = p.id 
            ORDER BY photo_order 
            LIMIT 1
          ) as photo
        FROM favorites f
        JOIN places p ON f.place_id = p.id
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const connection = await db.getConnection();
      const [results] = await connection.query(query, params);

      // Compter total avec filtres
      const countQuery = `
        SELECT COUNT(*) as total
        FROM favorites f
        JOIN places p ON f.place_id = p.id
        WHERE ${where}
      `;

      const [countResults] = await connection.query(countQuery, params.slice(0, -2));
      connection.release();

      return {
        favorites: results,
        pagination: {
          total: countResults[0].total,
          limit,
          offset,
          page: Math.floor(offset / limit) + 1,
          pages: Math.ceil(countResults[0].total / limit)
        }
      };
    } catch (error) {
      console.error('Search favorites error:', error);
      throw new Error(`Erreur recherche favoris: ${error.message}`);
    }
  }

  /**
   * Compter favoris d'un utilisateur
   */
  static async countUserFavorites(userId) {
    try {
      const connection = await db.getConnection();
      const [results] = await connection.query(
        'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
        [userId]
      );
      connection.release();

      return results[0].total;
    } catch (error) {
      console.error('Count favorites error:', error);
      throw new Error(`Erreur comptage favoris: ${error.message}`);
    }
  }

  /**
   * Obtenir lieux favoris par catégorie
   */
  static async getFavoritesByCategory(userId) {
    try {
      const query = `
        SELECT 
          p.category,
          COUNT(*) as count,
          GROUP_CONCAT(DISTINCT p.id) as place_ids
        FROM favorites f
        JOIN places p ON f.place_id = p.id
        WHERE f.user_id = ?
        GROUP BY p.category
        ORDER BY count DESC
      `;

      const connection = await db.getConnection();
      const [results] = await connection.query(query, [userId]);
      connection.release();

      return results;
    } catch (error) {
      console.error('Get favorites by category error:', error);
      throw new Error(`Erreur favoris par catégorie: ${error.message}`);
    }
  }

  /**
   * Parser JSON sécurisé
   */
  static _parseJSON(json, defaultValue = {}) {
    if (!json) return defaultValue;
    if (typeof json === 'object') return json;

    try {
      return JSON.parse(json);
    } catch (e) {
      return defaultValue;
    }
  }
}

module.exports = FavoritesService;
