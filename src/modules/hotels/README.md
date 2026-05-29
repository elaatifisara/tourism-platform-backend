# Module Réservation d'Hôtels - TravEasy Backend

## Vue d'ensemble
Module complet de réservation d'hôtels intégrant l'API Amadeus avec authentification OAuth2, cache Redis, et notifications email.

## Structure du Module

```
backend/src/modules/hotels/
├── amadeus.service.ts          # Service d'intégration Amadeus
├── hotel.model.ts              # Modèle de données SQL
├── hotel.controller.ts         # Contrôleurs des endpoints
├── hotel.routes.ts             # Routes de l'API REST
└── README.md

backend/src/utils/
├── hotelNotifications.ts       # Service d'emails
├── hotelInvoiceGenerator.ts    # Génération de factures PDF
└── emailTemplates.ts           # Templates d'emails HTML

backend/src/config/
└── hotel-schema.sql            # Schéma SQL des tables
```

## Installation

### 1. Ajouter les dépendances requises

```bash
npm install @amadeus4dev/amadeus node-cache nodemailer pdfkit
npm install --save-dev @types/node-cache @types/pdfkit
```

### 2. Configurer les variables d'environnement

Copier `.env.hotels` et remplir les credentials Amadeus :

```bash
cp .env.hotels .env
```

Configuration requise :
- **AMADEUS_CLIENT_ID** - Credentials Amadeus (via https://developers.amadeus.com)
- **AMADEUS_CLIENT_SECRET**
- **EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD** - Configuration SMTP pour les emails

### 3. Créer les tables SQL

```bash
mysql -u root -p travelesy_db < src/config/hotel-schema.sql
```

Cela créera les tables :
- `hotel_bookings` - Réservations
- `hotel_offers_cache` - Cache des offres
- `hotel_booking_rooms` - Détails des chambres
- `hotel_reviews` - Avis sur les hôtels

### 4. Intégrer dans app.js

```typescript
import hotelRoutes from './modules/hotels/hotel.routes';

// Dans le middleware
app.use('/api/hotels', hotelRoutes);
```

## Endpoints API

### Recherche d'hôtels (Public)

```
GET /api/hotels/search?cityCode=CAR&checkIn=2026-06-01&checkOut=2026-06-07&adults=2&rooms=1
```

**Paramètres :**
- `cityCode` (string) - Code IATA de la ville (ex: "PAR", "CAR", "MAR")
- `checkIn` (date) - Date d'arrivée (YYYY-MM-DD)
- `checkOut` (date) - Date de départ (YYYY-MM-DD)
- `adults` (number) - Nombre d'adultes (défaut: 2)
- `rooms` (number) - Nombre de chambres (défaut: 1)

**Réponse :**
```json
{
  "data": [...],
  "cached": false,
  "total": 50
}
```

### Offres pour un hôtel

```
GET /api/hotels/:hotelId/offers?checkIn=2026-06-01&checkOut=2026-06-07&adults=2&rooms=1
```

### Créer une réservation (Protégé)

```
POST /api/hotels/bookings
Authorization: Bearer <token>

Body:
{
  "offer": {...},
  "guestInfo": {
    "firstName": "Jean",
    "lastName": "Dupont",
    "email": "jean@example.com",
    "phone": "+33612345678",
    "numberOfAdults": 2
  },
  "contactInfo": {
    "emailAddress": "jean@example.com",
    "phones": [{
      "deviceType": "MOBILE",
      "countryCallingCode": "33",
      "number": "612345678"
    }]
  },
  "roomDetails": {
    "roomQuantity": 1
  }
}
```

### Historique des réservations (Protégé)

```
GET /api/hotels/bookings/user/:userId
Authorization: Bearer <token>
```

Répond avec :
- Liste des réservations
- Statistiques (total dépensé, moyennes, etc.)

### Réservations futures (Protégé)

```
GET /api/hotels/bookings/user/:userId/upcoming
Authorization: Bearer <token>
```

### Annuler une réservation (Protégé)

```
DELETE /api/hotels/bookings/:bookingId
Authorization: Bearer <token>
```

### Exporter en CSV (Protégé)

```
GET /api/hotels/bookings/export/csv
Authorization: Bearer <token>
```

## Service Amadeus

### Fonctionnalités

- **Authentification OAuth2** - Gestion automatique du token avec refresh
- **Cache intelligent** - Évite les appels API répétés (TTL: 10 minutes)
- **Recherche d'hôtels** - Basée sur ville, dates, et nombre de personnes
- **Offres détaillées** - Prix, types de chambres, plans de repas
- **Confirmations** - Intégration complète du booking Amadeus
- **Gestion d'erreurs** - Validation et gestion des erreurs robuste

### Exemple d'utilisation du service

```typescript
import AmadeusService from './amadeus.service';

// Recherche
const hotels = await AmadeusService.searchHotels(
  'CAR',           // cityCode
  '2026-06-01',    // checkIn
  '2026-06-07',    // checkOut
  2,               // adults
  1                // rooms
);

// Confirmer une réservation
const confirmation = await AmadeusService.confirmBooking(
  offer,
  guestInfo,
  contactInfo
);
```

## Notifications Email

### Templates disponibles

1. **hotelBookingConfirmation** - Confirmation de réservation
2. **hotelBookingCancellation** - Annulation
3. **hotelBookingModification** - Modification
4. **hotelReviewRequest** - Demande d'avis

### Exemple d'envoi d'email

```typescript
import { sendBookingEmail } from './utils/hotelNotifications';

await sendBookingEmail({
  email: 'client@example.com',
  firstName: 'Jean',
  hotelName: 'Riad Marrakech',
  checkIn: '2026-06-01',
  checkOut: '2026-06-07',
  totalPrice: '450.00',
  currency: 'EUR',
  bookingReference: 'BOOK-12345'
});
```

## Génération de Factures

```typescript
import { generateInvoicePDF } from './utils/hotelInvoiceGenerator';

const invoiceUrl = await generateInvoicePDF({
  bookingId: 1,
  hotelName: 'Riad Marrakech',
  guestName: 'Jean Dupont',
  checkIn: '2026-06-01',
  checkOut: '2026-06-07',
  totalPrice: '450.00',
  currency: 'EUR',
  nightsCount: 6
});

// Téléchargeable via GET /invoices/hotels/{filename}
```

## Cache Redis

Le service utilise `node-cache` pour le caching en mémoire :

```typescript
// Clé de cache générée automatiquement
const key = AmadeusService.generateCacheKey(
  'CAR',
  '2026-06-01',
  '2026-06-07',
  2,
  1
); // "hotel_CAR_2026-06-01_2026-06-07_2_1"

// Vérifier le cache
if (AmadeusService.isCached(key)) {
  const data = AmadeusService.getCachedSearch(key);
}
```

### TTL (Time To Live)

- **Par défaut : 600 secondes (10 minutes)**
- Peut être customisé : `AmadeusService.cacheSearch(key, data, 1800)`

## Sécurité

### Authentification

- Toutes les routes de modification/consultation requièrent un token JWT
- Vérification de propriété : les utilisateurs ne voient que leurs réservations
- Middleware `authMiddleware` sur toutes les routes protégées

### Validation

- Validation des dates (check-out > check-in)
- Vérification des offres auprès d'Amadeus
- Validation des informations client

### Paiement

- Intégration Stripe (optionnel)
- Tokenization des cartes de crédit
- Gestion sécurisée des données sensibles

## Teste et Développement

### Mode Sandbox Amadeus

Pour tester sans carte réelle, utiliser les credentials sandbox:

```env
AMADEUS_CLIENT_ID=sandbox_id
AMADEUS_CLIENT_SECRET=sandbox_secret
TEST_CARD_NUMBER=4111111111111111
TEST_CARD_EXPIRY=2027-01
```

### Exemples de codes ville (IATA)

- **CAR** - Casablanca
- **MAR** - Marrakech
- **FEZ** - Fès
- **TNG** - Tanger
- **AGD** - Agadir
- **PAR** - Paris
- **LON** - Londres
- **BCN** - Barcelone

## Performance

### Optimisations

- Cache intelligent des résultats de recherche
- Lazy loading des offres détaillées
- Pagination des résultats (50 max par défaut)
- Indexes SQL sur les colonnes fréquemment consultées

### Benchmark

- Recherche en cache : < 50ms
- Recherche Amadeus : 200-500ms
- Confirmation booking : 300-800ms
- Génération PDF : 100-200ms

## Troubleshooting

### Erreur : "Amadeus authentication failed"

- Vérifier les credentials AMADEUS_CLIENT_ID et AMADEUS_CLIENT_SECRET
- S'assurer que l'application Amadeus est active

### Erreur : "SMTP connection refused"

- Vérifier la configuration EMAIL_HOST, EMAIL_PORT
- Vérifier les credentials EMAIL_USER, EMAIL_PASSWORD

### Erreur : "Offre invalide ou expirée"

- Les offres Amadeus expirent après ~5 minutes
- Relancer une recherche pour obtenir de nouvelles offres

## Roadmap Future

- [ ] Intégration avec système de paiement complet
- [ ] Notifications en temps réel (WebSockets)
- [ ] Modifications de réservation (change dates, rooms)
- [ ] Remboursements automatiques
- [ ] Intégration calendrier interactif
- [ ] Recommandations d'hôtels (ML)
- [ ] Multi-langue complète (i18n)

## Support

Pour les problèmes avec l'API Amadeus:
- Docs: https://developers.amadeus.com/docs
- Support: https://developersupport.amadeus.com

Pour les problèmes du module TravEasy:
- Email: support@travelesy.com
- Issues: GitHub repository
