const router = require("express").Router();
const catalogController = require("./catalog.controller");
const { verifyToken } = require("../../middleware/auth");

/**
 * CRUD BASIQUE
 */

// Créer un nouveau lieu (admin only)
router.post("/", verifyToken, catalogController.createPlace);

// Obtenir tous les lieux (CRUD ancien endpoint)
router.get("/all", catalogController.getAllPlaces);

/**
 * RECHERCHE AVANCÉE
 */

// Endpoint principal de recherche avec filtres
router.get("/search", catalogController.searchPlaces);

// Suggestions de recherche (autocomplete)
router.get("/suggestions", catalogController.getSearchSuggestions);

// Catégories et sous-catégories
router.get("/categories", catalogController.getCategories);

// Lieux populaires (trending)
router.get("/trending", catalogController.getTrendingPlaces);

// Détails d'un lieu
router.get("/:placeId", catalogController.getPlaceDetails);

/**
 * OPÉRATIONS SUR PHOTOS
 */

// Ajouter une photo à un lieu
router.post("/:placeId/photos", verifyToken, catalogController.addPlacePhoto);

/**
 * OPÉRATIONS DE MISE À JOUR
 */

// Mettre à jour un lieu
router.put("/:placeId", verifyToken, catalogController.updatePlace);

module.exports = router;