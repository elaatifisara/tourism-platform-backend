const catalogService = require("./catalog.service");
const CatalogSearchService = require("./catalog.search.service");

/**
 * CRUD BASIQUE
 */

exports.createPlace = async (req, res) => {
  try {
    const place = await catalogService.createPlace(req.body);
    res.status(201).json(place);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllPlaces = async (req, res) => {
  try {
    const places = await catalogService.getAllPlaces();
    res.json(places);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * RECHERCHE AVANCÉE - Moteur de recherche avec filtres
 */

exports.searchPlaces = async (req, res) => {
  try {
    const {
      // Filtres
      category,
      subcategory,
      search,
      priceMin,
      priceMax,
      ratingMin,
      lat,
      lng,
      radius,
      openNow,
      accessible,
      // Tri et pagination
      sortBy = 'rating',
      limit = 20,
      offset = 0
    } = req.query;

    // Builder les filtres
    const filters = {
      category: category || null,
      subcategory: subcategory || null,
      search: search || null,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      ratingMin: ratingMin ? parseFloat(ratingMin) : undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius: radius ? parseFloat(radius) : 50000,
      openNow: openNow === 'true',
      accessible: accessible === 'true'
    };

    // Rechercher
    const places = await CatalogSearchService.searchPlaces(
      filters,
      sortBy,
      limit,
      offset
    );

    // Compter total
    const total = await CatalogSearchService.countSearchResults(filters);

    res.json({
      data: places,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search places error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtenir détails d'un lieu
 */

exports.getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;

    const place = await CatalogSearchService.getPlaceDetails(placeId);

    if (!place) {
      return res.status(404).json({ error: 'Lieu non trouvé' });
    }

    res.json(place);
  } catch (error) {
    console.error('Get place details error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Suggestions de recherche (autocomplete)
 */

exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await CatalogSearchService.getSearchSuggestions(q);

    res.json({ suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtenir catégories et sous-catégories
 */

exports.getCategories = async (req, res) => {
  try {
    const categories = await CatalogSearchService.getCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lieux populaires (trending)
 */

exports.getTrendingPlaces = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const places = await CatalogSearchService.getTrendingPlaces(limit);
    res.json({ places });
  } catch (error) {
    console.error('Get trending places error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Ajouter photo à un lieu
 */

exports.addPlacePhoto = async (req, res) => {
  try {
    const { placeId } = req.params;
    const { photoUrl, altText = '', order = 0 } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: 'URL photo requise' });
    }

    const photoId = await CatalogSearchService.addPlacePhoto(
      placeId,
      photoUrl,
      altText,
      order
    );

    res.status(201).json({
      message: 'Photo ajoutée',
      photoId
    });
  } catch (error) {
    console.error('Add place photo error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mettre à jour lieu
 */

exports.updatePlace = async (req, res) => {
  try {
    const { placeId } = req.params;
    const updateData = req.body;

    const result = await CatalogSearchService.updatePlace(placeId, updateData);

    if (!result.updated) {
      return res.status(400).json({ error: 'Aucune mise à jour effectuée' });
    }

    res.json({
      message: 'Lieu mis à jour',
      changes: result.changes
    });
  } catch (error) {
    console.error('Update place error:', error);
    res.status(500).json({ error: error.message });
  }
};