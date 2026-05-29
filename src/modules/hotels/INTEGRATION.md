/**
 * INTÉGRATION POUR app.js
 * 
 * Ajouter les lignes suivantes à backend/src/app.js
 */

// ============================================================
// 1. AJOUTER L'IMPORT DES ROUTES D'HÔTELS
// ============================================================
// Ajouter après les autres imports de routes (vers le haut du fichier):

import hotelRoutes from './modules/hotels/hotel.routes.js';

// ============================================================
// 2. AJOUTER LE MIDDLEWARE DES ROUTES D'HÔTELS
// ============================================================
// Ajouter après les autres middlewares de routes (avant app.listen()):

// Routes des hôtels
app.use('/api/hotels', hotelRoutes);

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
import transportRoutes from './modules/transport/transport.routes.js';
import rentalRoutes from './modules/rentals/rental.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import hotelRoutes from './modules/hotels/hotel.routes.js';  // <- AJOUTER

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/hotels', hotelRoutes);  // <- AJOUTER

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

npm install @amadeus4dev/amadeus
npm install node-cache
npm install nodemailer
npm install pdfkit

npm install --save-dev @types/node-cache @types/pdfkit

Versions recommandées:
- @amadeus4dev/amadeus@3.0.0+
- node-cache@5.1.2+
- nodemailer@6.9.0+
- pdfkit@0.13.0+
*/

// ============================================================
// 4. VARIABLES D'ENVIRONNEMENT REQUISES
// ============================================================
/*
Ajouter à .env:

# Amadeus API
AMADEUS_CLIENT_ID=your_client_id
AMADEUS_CLIENT_SECRET=your_client_secret

# Email SMTP
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_user
EMAIL_PASSWORD=your_password
EMAIL_FROM=noreply@travelesy.com

# Optional: Stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Optional: Redis
REDIS_HOST=localhost
REDIS_PORT=6379
*/

// ============================================================
// 5. SCHEMA SQL
// ============================================================
/*
Exécuter dans MySQL:

mysql -u root -p travelesy_db < src/config/hotel-schema.sql

Cela crée les tables:
- hotel_bookings
- hotel_offers_cache
- hotel_booking_rooms
- hotel_reviews
Et modifie:
- payments (ajout de hotel_booking_id)
*/

// ============================================================
// 6. TESTS AVEC POSTMAN/CURL
// ============================================================
/*
# 1. Recherche d'hôtels (public)
curl -X GET "http://localhost:5000/api/hotels/search?cityCode=CAR&checkIn=2026-06-01&checkOut=2026-06-07&adults=2&rooms=1"

# 2. Offres pour un hôtel (public)
curl -X GET "http://localhost:5000/api/hotels/IATA001/offers?checkIn=2026-06-01&checkOut=2026-06-07&adults=2&rooms=1"

# 3. Créer une réservation (protégé)
curl -X POST "http://localhost:5000/api/hotels/bookings" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "offer": {...},
    "guestInfo": {...},
    "contactInfo": {...}
  }'

# 4. Récupérer historique (protégé)
curl -X GET "http://localhost:5000/api/hotels/bookings/user/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Annuler une réservation (protégé)
curl -X DELETE "http://localhost:5000/api/hotels/bookings/123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
*/

// ============================================================
// 7. STRUCTURE COMPLÈTE DES ENDPOINTS
// ============================================================
/*
Routes disponibles (après intégration):

PUBLIC:
GET    /api/hotels/search                              (Rechercher des hôtels)
GET    /api/hotels/:hotelId/offers                      (Offres détaillées)

PROTÉGÉES (authentification requise):
POST   /api/hotels/bookings                             (Créer réservation)
GET    /api/hotels/bookings/user/:userId                (Historique)
GET    /api/hotels/bookings/user/:userId/upcoming       (Futures réservations)
DELETE /api/hotels/bookings/:bookingId                  (Annuler)
GET    /api/hotels/bookings/export/csv                  (Export CSV)
*/

// ============================================================
// 8. FLUX COMPLET D'UNE RÉSERVATION
// ============================================================
/*
1. Utilisateur recherche des hôtels
   → GET /api/hotels/search
   → Service Amadeus cherche dans API
   → Résultats cachés 10 minutes
   
2. Utilisateur sélectionne un hôtel et demande les offres
   → GET /api/hotels/:hotelId/offers
   → Récupère les offres disponibles (prix, chambres, etc)
   
3. Utilisateur crée une réservation
   → POST /api/hotels/bookings
   → Valide l'offre auprès d'Amadeus
   → Crée un enregistrement dans la BD
   → Confirme la réservation sur Amadeus
   → Envoie un email de confirmation
   → Génère une facture PDF
   
4. Utilisateur peut consulter son historique
   → GET /api/hotels/bookings/user/:userId
   → Retourne toutes les réservations de l'utilisateur
   → Inclut les statistiques (total dépensé, etc)
   
5. Utilisateur peut annuler (avant check-in)
   → DELETE /api/hotels/bookings/:bookingId
   → Marque comme 'cancelled' en BD
   → Envoie email d'annulation
*/

// ============================================================
// 9. GESTION DES ERREURS
// ============================================================
/*
Le controller inclut la gestion complète des erreurs:

400 - Paramètres manquants/invalides
401 - Authentification requise
403 - Accès non autorisé (pas le propriétaire)
404 - Réservation non trouvée
500 - Erreur serveur

Tous les endpoints retournent un JSON avec la structure:
{
  "error": "Message d'erreur",
  "message": "Détails additionnels"
}
ou
{
  "data": {...},
  "total": 50,
  "cached": false
}
*/

// ============================================================
// 10. MONITORING ET LOGS
// ============================================================
/*
Tous les appels sont loggés à la console:
- Recherches Amadeus
- Confirmations de réservation
- Emails envoyés
- Factures générées
- Erreurs détaillées

Pour déboguer:
- Vérifier les logs de console
- Utiliser des outils comme Postman
- Consulter les tables SQL directement
- Vérifier les credentials Amadeus

Logs typiques:
"Search Hotels Error: Invalid cityCode"
"Email envoyé: <message-id>"
"Facture générée: /path/to/hotel_invoice_1_123456789.pdf"
*/

export default /* integration instructions */;
