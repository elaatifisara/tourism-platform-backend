const express = require('express');
const router = express.Router();
const favoritesController = require('./favorites.controller');
const { verifyToken } = require('../../middleware/auth');

/**
 * Toutes les routes nécessitent l'authentification
 */

// Ajouter aux favoris
router.post('/:placeId', verifyToken, favoritesController.addFavorite);

// Supprimer des favoris
router.delete('/:placeId', verifyToken, favoritesController.removeFavorite);

// Vérifier si en favori
router.get('/:placeId/check', verifyToken, favoritesController.isFavorite);

// Obtenir tous les favoris
router.get('/', verifyToken, favoritesController.getUserFavorites);

// Rechercher dans les favoris
router.get('/search', verifyToken, favoritesController.searchFavorites);

// Compter favoris
router.get('/count', verifyToken, favoritesController.countFavorites);

// Favoris par catégorie
router.get('/categories', verifyToken, favoritesController.getFavoritesByCategory);

module.exports = router;
