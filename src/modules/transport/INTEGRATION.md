/**
 * INTÉGRATION DU MODULE TRANSPORT DANS app.js
 * 
 * Ajouter les lignes suivantes à backend/src/app.js
 */

// ============================================================
// 1. AJOUTER L'IMPORT DES ROUTES DE TRANSPORT
// ============================================================
// Ajouter après les autres imports de routes (vers le haut du fichier):

import transportRoutes from './modules/transport/transport.routes.js';

// ============================================================
// 2. AJOUTER LE MIDDLEWARE DES ROUTES DE TRANSPORT
// ============================================================
// Ajouter après les autres middlewares de routes (avant app.listen()):

// Routes de transport
app.use('/api/transport', transportRoutes);

// ============================================================
// EXEMPLE COMPLET (contexte dans app.js):
// ============================================================
/*
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// Middleware
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import catalogRoutes from './modules/catalog/catalog.routes.js';
import transportRoutes from './modules/transport/transport.routes.js';  // <- AJOUTER
import rentalRoutes from './modules/rentals/rental.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/transport', transportRoutes);  // <- AJOUTER
app.use('/api/rentals', rentalRoutes);
app.use('/api/payment', paymentRoutes);

// Middleware d'erreur
app.use(errorHandler);

// Serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur TravEasy démarré sur le port ${PORT}`);
});
*/

// ============================================================
// 3. DÉPENDANCES NPM REQUISES
// ============================================================
/*
Installation requise dans le dossier backend:

npm install @googlemaps/js-client-library
npm install node-cache

npm install --save-dev @types/node-cache

Versions recommandées:
- @googlemaps/js-client-library@1.1.19+
- node-cache@5.1.2+
*/

// ============================================================
// 4. VARIABLES D'ENVIRONNEMENT REQUISES
// ============================================================
/*
Ajouter à .env:

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Obtenir une clé:
# 1. Aller sur https://console.cloud.google.com/
# 2. Créer un nouveau projet
# 3. Activer les APIs:
#    - Maps JavaScript API
#    - Distance Matrix API
#    - Geocoding API
#    - Directions API
# 4. Créer une clé API
# 5. (Optionnel) Restreindre par IP ou domaine
*/

// ============================================================
// 5. SCHEMA SQL
// ============================================================
/*
Exécuter dans MySQL:

mysql -u root -p travEasy_db < src/config/transport-schema.sql

Cela crée les tables:
- fare_config (configuration tarifaire)
- transport_bookings (réservations)
- drivers (chauffeurs)
- driver_reviews (avis sur les chauffeurs)
- route_cache (cache des trajets)
- transport_promotions (codes promo)
- transport_incidents (incidents/réclamations)

Les données par défaut sont :
- Taxi: 15 DH de base, 10 DH/km, 0.50 DH/min
- VTC: 25 DH de base, 12 DH/km, 0.75 DH/min
- Chauffeur: 35 DH de base, 14 DH/km, 1.00 DH/min
*/

// ============================================================
// 6. WORKFLOW COMPLET D'UNE RÉSERVATION
// ============================================================
/*
FLOW CLIENT:

1. Client cherche un trajet
   POST /api/transport/calculate-fare
   - Envoie: type véhicule, départ, destination, passagers, bagages, date/heure
   - Reçoit: tarif détaillé avec décomposition
   
2. Client confirme et crée la réservation
   POST /api/transport/bookings
   - Envoie: toutes les infos du trajet + tarif confirmé
   - Backend: recalcule le tarif (tolérance 5%) et assigne un chauffeur
   - Reçoit: confirmation avec ID réservation
   
3. Client peut suivre ses réservations
   GET /api/transport/bookings/user/:userId
   GET /api/transport/bookings/user/:userId/upcoming
   
4. Client peut annuler sa réservation
   PUT /api/transport/bookings/:id/cancel
   
5. Après le trajet, client peut noter le chauffeur
   [API à créer pour les avis]

CALCUL TARIFAIRE:

Tarif = Base + (km × prix/km) + (min × prix/min)
Tarif = max(Tarif, minimum)

Majorations :
- Nuit (22h-6h): +25%
- Weekend (sam/dim): +10%
- Saisonnier (juil/août): +15%
- Bagages (> 2): 5 DH chacun

TVA 20% appliquée au total
*/

// ============================================================
// 7. ENDPOINTS DISPONNIBLES
// ============================================================
/*
PUBLIC (pas d'authentification):
POST   /api/transport/calculate-fare                      (Calculer tarif)
GET    /api/transport/drivers/available                   (Chauffeurs dispo)
GET    /api/transport/routes/stats                        (Stats d'une route)
GET    /api/transport/price-history                       (Historique prix)

PROTÉGÉS (authentification requise):
POST   /api/transport/bookings                            (Créer réservation)
GET    /api/transport/bookings/:id                        (Détail réservation)
GET    /api/transport/bookings/user/:userId               (Historique)
GET    /api/transport/bookings/user/:userId/upcoming      (Futures réservations)
PUT    /api/transport/bookings/:id/cancel                 (Annuler)
GET    /api/transport/user/stats                          (Stats utilisateur)
GET    /api/transport/bookings/export/csv                 (Export CSV)
*/

// ============================================================
// 8. TESTS AVEC POSTMAN/CURL
// ============================================================
/*
# 1. Calculer un tarif (pas d'auth)
curl -X POST "http://localhost:5000/api/transport/calculate-fare" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "taxi",
    "origin": "Casablanca",
    "destination": "Marrakech",
    "passengers": 2,
    "luggage": 1,
    "bookingDateTime": "2026-06-01T22:30:00"
  }'

RÉPONSE ATTENDUE:
{
  "data": {
    "baseFare": 15,
    "distanceFare": 240,
    "nightSurcharge": 64,
    "weekendSurcharge": 26,
    "seasonalSurcharge": 39,
    "luggageSurcharge": 0,
    "subtotal": 384,
    "tax": 76.8,
    "total": 460.8,
    "distance": 239,
    "duration": 240,
    "estimatedTime": "4h"
  }
}

# 2. Créer une réservation (avec auth)
curl -X POST "http://localhost:5000/api/transport/bookings" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "taxi",
    "pickupAddress": "Aéroport de Casablanca",
    "pickupLat": 33.3675,
    "pickupLng": -7.5898,
    "destinationAddress": "Medina, Marrakech",
    "destinationLat": 31.6295,
    "destinationLng": -8.0089,
    "scheduledTime": "2026-06-01T14:30:00",
    "passengers": 2,
    "luggage": 1,
    "totalFare": 156.50
  }'

# 3. Récupérer l'historique
curl "http://localhost:5000/api/transport/bookings/user/1" \
  -H "Authorization: Bearer eyJhbGc..."

# 4. Annuler une réservation
curl -X PUT "http://localhost:5000/api/transport/bookings/123/cancel" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"reason": "Plans changés"}'

# 5. Obtenir les chauffeurs disponibles
curl "http://localhost:5000/api/transport/drivers/available?lat=33.5&lng=-7.5&vehicleType=taxi&date=2026-06-01T10:00:00"

# 6. Historique de prix d'une route
curl "http://localhost:5000/api/transport/price-history?pickup=Casablanca&destination=Marrakech"
*/

// ============================================================
// 9. CONFIGURATION TARIFAIRE PERSONNALISÉE
// ============================================================
/*
Pour modifier les tarifs, mettre à jour la table fare_config:

UPDATE fare_config 
SET base_fare = 20, price_per_km = 12 
WHERE vehicle_type = 'taxi';

Ou via SQL directement:

mysql -u root -p travEasy_db
> USE travEasy_db;
> SELECT * FROM fare_config;
> UPDATE fare_config SET base_fare = 20 WHERE vehicle_type = 'taxi';
> COMMIT;
*/

// ============================================================
// 10. GESTION DES ERREURS
// ============================================================
/*
Le controller inclut la gestion complète des erreurs:

400 - Paramètres manquants/invalides
     "vehicleType invalide : taxi, vtc ou chauffeur"
     
401 - Authentification requise
     "Authentification requise"
     
403 - Accès non autorisé
     "Accès non autorisé"
     
404 - Ressource non trouvée
     "Réservation non trouvée"
     
500 - Erreur serveur
     "Erreur lors du calcul du tarif"

Tous les appels loggent les erreurs à la console pour debugging.
*/

// ============================================================
// 11. OPTIMISATIONS GOOGLE MAPS
// ============================================================
/*
Pour éviter les dépassements de quota Google Maps:

1. Cache intelligent (10 min TTL)
   - Les résultats des mêmes trajets sont en cache
   - Cache automatiquement clair après 10 minutes
   
2. Batch requests
   - Utiliser le Distance Matrix API pour plusieurs trajets à la fois
   
3. Monitoring
   - Vérifier la console pour "Google Maps cache cleared"
   - Utiliser GoogleMapsService.getCacheStats() pour stats

4. Quotas typiques Google Maps:
   - Distance Matrix: 100 requests/10 sec
   - Geocoding: 50 requests/sec
   - Avec cache: 99%+ des requêtes servent depuis cache
*/

// ============================================================
// 12. MONITORING & LOGS
// ============================================================
/*
Logs disponibles:

Calcul tarifaire:
"Calculate Fare completed: distance=239km, fare=460.8 MAD"

Réservation créée:
"Booking created: ID=123, driver assigned: true"

Annulation:
"Booking cancelled: ID=123, reason=Plans changés"

Erreurs Google Maps:
"Google Maps Distance Error: Invalid cityCode"

Ces logs sont utiles pour:
- Debugging des problèmes
- Monitoring des performances
- Audit des actions
*/

// ============================================================
// 13. EXEMPLE DE CHAUFFEUR À CRÉER
// ============================================================
/*
Pour ajouter un chauffeur dans la BD:

INSERT INTO drivers (
  name, email, phone, id_number, license_number, 
  license_expiry, vehicle_type, license_plate, 
  vehicle_brand, vehicle_model, vehicle_color,
  latitude, longitude, status, verified, active
) VALUES (
  'Ahmed Ben Ali', 'ahmed@example.com', '+212612345678',
  'M123456', 'P123456789', '2027-06-01',
  'taxi', 'AB-1234-CD', 'Toyota', 'Camry',
  'Blanc', 33.5, -7.5, 'available', 1, 1
);
*/

// ============================================================
// 14. ROADMAP FUTURE
// ============================================================
/*
Phase 1 (Complétée): Infrastructure de base
✓ Service Google Maps
✓ Calcul tarifaire
✓ CRUD réservations
✓ Gestion chauffeurs

Phase 2 (À faire): Paiement & Notifications
[ ] Intégration Stripe
[ ] Emails de confirmation
[ ] SMS notifications
[ ] Webhooks de paiement

Phase 3 (À faire): Temps réel
[ ] WebSockets pour GPS
[ ] Notifications push
[ ] Chat client-chauffeur

Phase 4 (À faire): Intelligence
[ ] Matching dynamique
[ ] Recommandations de prix
[ ] Prévisions de demande
[ ] Surge pricing

Phase 5 (À faire): Frontend
[ ] Page de recherche de trajets
[ ] Carte interactive
[ ] Historique et avis
[ ] Système de notation
*/

export default /* integration instructions */;
