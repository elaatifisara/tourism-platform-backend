/**
 * SEARCH UTILITIES - Calculs mathématiques pour recherche
 * Responsabilités: Distance Haversine, Wilson Score, Parsing JSON
 */

class SearchUtils {
  /**
   * Calcul de distance Haversine entre deux coordonnées
   * @param {number} lat1 - Latitude du point 1
   * @param {number} lon1 - Longitude du point 1
   * @param {number} lat2 - Latitude du point 2
   * @param {number} lon2 - Longitude du point 2
   * @returns {number} Distance en mètres
   */
  static calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c; // Distance en mètres
  }

  /**
   * Convertir degrés en radians
   */
  static _toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calcul du Wilson Score pour le tri par notation
   * Utile quand on a peu d'avis (évite biais)
   * @param {number} positiveRatings - Nombre d'avis positifs
   * @param {number} totalRatings - Total d'avis
   * @param {number} z - Score Z (1.96 pour 95% confiance)
   * @returns {number} Wilson score
   */
  static calculateWilsonScore(positiveRatings, totalRatings, z = 1.96) {
    if (totalRatings === 0) return 0;

    const p = positiveRatings / totalRatings;
    const denominator = 1 + z * z / totalRatings;
    const center = (p + z * z / (2 * totalRatings)) / denominator;
    const adjustment = z * Math.sqrt(p * (1 - p) / totalRatings + z * z / (4 * totalRatings * totalRatings)) / denominator;

    return center - adjustment;
  }

  /**
   * Convertir note moyenne (1-5) en nombre d'avis positifs simulé
   * pour le Wilson score
   * @param {number} rating - Note moyenne (1-5)
   * @param {number} reviewCount - Nombre d'avis
   * @returns {object} {positive, total}
   */
  static convertRatingToWilsonInput(rating, reviewCount) {
    if (reviewCount === 0) return { positive: 0, total: 0 };

    const threshold = 3; // Note minimum pour "positif"
    const positivePercentage = Math.max(0, Math.min(1, (rating - 1) / 4)); // Normaliser 1-5 à 0-1
    const positiveCount = Math.round(reviewCount * positivePercentage);

    return {
      positive: positiveCount,
      total: reviewCount
    };
  }

  /**
   * Parser JSON sécurisé pour les colonnes JSON en DB
   * @param {string|object} json - Données JSON
   * @returns {object} Objet parsé ou valeur par défaut
   */
  static parseJSON(json, defaultValue = {}) {
    if (!json) return defaultValue;
    if (typeof json === 'object') return json;

    try {
      return JSON.parse(json);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return defaultValue;
    }
  }

  /**
   * Vérifier si place est ouvert maintenant
   * @param {object} openingHours - Format JSON opening_hours
   * @returns {boolean} True si ouvert
   */
  static isOpenNow(openingHours) {
    try {
      const hours = this.parseJSON(openingHours, {});
      if (Object.keys(hours).length === 0) return true; // Pas de données = supposé ouvert

      const now = new Date();
      const dayName = this._getDayName(now.getDay());
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                         now.getMinutes().toString().padStart(2, '0');

      const dayHours = hours[dayName];
      if (!dayHours) return false; // Jour fermé

      if (dayHours.closed) return false;

      const { open, close } = dayHours;
      return currentTime >= open && currentTime <= close;
    } catch (e) {
      console.error('isOpenNow Error:', e);
      return true;
    }
  }

  /**
   * Obtenir nom du jour en anglais
   */
  static _getDayName(dayOfWeek) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayOfWeek];
  }

  /**
   * Valider coordonnées GPS
   */
  static isValidCoordinates(lat, lng) {
    return lat !== undefined && lng !== undefined &&
           !isNaN(lat) && !isNaN(lng) &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180;
  }

  /**
   * Builder de clause WHERE SQL pour filtres
   * @param {object} filters - Objet avec filtres
   * @returns {object} {whereClause: string, params: array}
   */
  static buildWhereClause(filters) {
    const conditions = [];
    const params = [];

    // Catégorie
    if (filters.category) {
      conditions.push('p.category = ?');
      params.push(filters.category);
    }

    // Sous-catégorie
    if (filters.subcategory) {
      conditions.push('p.subcategory = ?');
      params.push(filters.subcategory);
    }

    // Prix
    if (filters.priceMin !== undefined) {
      conditions.push('p.average_price >= ?');
      params.push(filters.priceMin);
    }

    if (filters.priceMax !== undefined) {
      conditions.push('p.average_price <= ?');
      params.push(filters.priceMax);
    }

    // Note minimum
    if (filters.ratingMin !== undefined) {
      conditions.push('p.rating >= ?');
      params.push(filters.ratingMin);
    }

    // Accessibilité
    if (filters.accessible === true) {
      conditions.push('p.accessibility = TRUE');
    }

    // Texte de recherche (full-text)
    if (filters.search) {
      conditions.push('MATCH(p.name, p.description) AGAINST(? IN BOOLEAN MODE)');
      params.push(filters.search);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    return { whereClause, params };
  }

  /**
   * Builder de clause ORDER BY SQL
   * @param {string} sortBy - Type de tri
   * @param {object} options - Options additionnelles (lat, lng, etc)
   * @returns {string} Clause ORDER BY
   */
  static buildOrderByClause(sortBy, options = {}) {
    switch (sortBy) {
      case 'rating':
        return 'ORDER BY p.rating DESC, p.id DESC';

      case 'price_asc':
        return 'ORDER BY p.average_price ASC, p.id DESC';

      case 'price_desc':
        return 'ORDER BY p.average_price DESC, p.id DESC';

      case 'distance':
        // Calculer distance dans la requête (Haversine)
        if (!options.lat || !options.lng) {
          return 'ORDER BY p.id DESC'; // Fallback si pas de coordonnées
        }
        return `ORDER BY (6371 * acos(cos(radians(${options.lat})) * cos(radians(p.latitude)) * 
                       cos(radians(p.longitude) - radians(${options.lng})) + 
                       sin(radians(${options.lat})) * sin(radians(p.latitude)))) ASC, p.id DESC`;

      case 'popularity':
        return 'ORDER BY p.reservation_count DESC, p.rating DESC, p.id DESC';

      case 'newest':
        return 'ORDER BY p.created_at DESC, p.id DESC';

      default:
        return 'ORDER BY p.rating DESC, p.reservation_count DESC, p.id DESC';
    }
  }

  /**
   * Sanitize et valider pagination
   */
  static validatePagination(limit, offset) {
    const maxLimit = 100;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), maxLimit);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);

    return { limit: safeLimit, offset: safeOffset };
  }
}

module.exports = SearchUtils;
