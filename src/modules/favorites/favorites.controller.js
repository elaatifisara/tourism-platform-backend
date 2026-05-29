const FavoritesService = require('./favorites.service');

/**
 * Ajouter un lieu aux favoris
 */
exports.addFavorite = async (req, res) => {
  try {
    const { placeId } = req.params;
    const userId = req.user?.userId || req.user?.id || 1;

    if (!placeId) {
      return res.status(400).json({ error: 'placeId requis' });
    }

    const favorite = await FavoritesService.addFavorite(userId, placeId);
    res.status(201).json({
      message: 'Ajouté aux favoris',
      favorite
    });
  } catch (error) {
    if (error.message.includes('déjà')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('non trouvé')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Supprimer des favoris
 */
exports.removeFavorite = async (req, res) => {
  try {
    const { placeId } = req.params;
    const userId = req.user?.userId || req.user?.id || 1;

    if (!placeId) {
      return res.status(400).json({ error: 'placeId requis' });
    }

    const result = await FavoritesService.removeFavorite(userId, placeId);
    res.json(result);
  } catch (error) {
    if (error.message.includes('non trouvé')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtenir les favoris de l'utilisateur
 */
exports.getUserFavorites = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || 1;
    const { limit = 100, offset = 0 } = req.query;

    const result = await FavoritesService.getUserFavorites(userId, limit, offset);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Vérifier si un lieu est en favori
 */
exports.isFavorite = async (req, res) => {
  try {
    const { placeId } = req.params;
    const userId = req.user?.userId || req.user?.id || 1;

    if (!placeId) {
      return res.status(400).json({ error: 'placeId requis' });
    }

    const result = await FavoritesService.isFavorite(userId, placeId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Rechercher dans les favoris avec filtres
 */
exports.searchFavorites = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || 1;
    const {
      category,
      priceMin,
      priceMax,
      ratingMin,
      sortBy = 'added_date',
      limit = 20,
      offset = 0
    } = req.query;

    const filters = {
      category: category || null,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      ratingMin: ratingMin ? parseFloat(ratingMin) : undefined
    };

    const result = await FavoritesService.searchFavorites(
      userId,
      filters,
      sortBy,
      limit,
      offset
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Compter favoris
 */
exports.countFavorites = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || 1;
    const total = await FavoritesService.countUserFavorites(userId);

    res.json({ total, count: total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Favoris par catégorie
 */
exports.getFavoritesByCategory = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || 1;
    const categories = await FavoritesService.getFavoritesByCategory(userId);

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
