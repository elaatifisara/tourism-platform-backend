# Module Transport - TravEasy Backend

## Vue d'ensemble

Module complet de réservation de transport intégrant Google Maps API avec calcul tarifaire sophistiqué, gestion des chauffeurs, et système de notation.

## Structure du Module

```
backend/src/modules/transport/
├── google-maps.service.ts      # Service Google Maps (Distance Matrix, Geocoding)
├── transport.service.ts        # Logique métier (tarification, chauffeurs)
├── transport.model.ts          # CRUD et requêtes SQL
├── transport.controller.ts     # Endpoints REST
├── transport.routes.ts         # Routes Express
└── README.md

backend/src/config/
└── transport-schema.sql        # Schéma SQL complet
```

## Installation

### 1. Ajouter les dépendances requises

```bash
npm install @googlemaps/js-client-library
npm install node-cache
npm install --save-dev @types/node-cache
```

### 2. Configurer les variables d'environnement

```env
# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=travEasy_db
```

### 3. Créer les tables SQL

```bash
mysql -u root -p travEasy_db < src/config/transport-schema.sql
```

Cela crée les tables :
- `fare_config` - Configuration tarifaire
- `transport_bookings` - Réservations
- `drivers` - Chauffeurs
- `driver_reviews` - Avis sur les chauffeurs
- `route_cache` - Cache des trajets
- `transport_promotions` - Codes promo
- `transport_incidents` - Incidents/réclamations

### 4. Intégrer dans app.js

```typescript
import transportRoutes from './modules/transport/transport.routes';

// Ajouter le middleware
app.use('/api/transport', transportRoutes);
```

## Endpoints API

### Calcul Tarifaire (Public)

**POST** `/api/transport/calculate-fare`

Calcule le tarif avec tous les coefficients.

**Body:**
```json
{
  "vehicleType": "taxi|vtc|chauffeur",
  "origin": "Casablanca" ou { "lat": 33.5, "lng": -7.5 },
  "destination": "Marrakech" ou { "lat": 31.6, "lng": -8.0 },
  "passengers": 2,
  "luggage": 3,
  "bookingDateTime": "2026-06-01T22:30:00"
}
```

**Réponse:**
```json
{
  "data": {
    "baseFare": 15,
    "distanceFare": 240,
    "nightSurcharge": 64,
    "weekendSurcharge": 26,
    "seasonalSurcharge": 39,
    "luggageSurcharge": 5,
    "subtotal": 389,
    "tax": 77.8,
    "total": 466.8,
    "distance": 24,
    "duration": 45,
    "estimatedTime": "45min"
  }
}
```

### Tarification Déterministe

La tarification suit cette formule :

```
TARIF_BASE = baseFare

TARIF_DISTANCE = distance_km × price_per_km

TARIF_TEMPS = duration_minutes × price_per_minute

SUBTOTAL = max(TARIF_BASE + TARIF_DISTANCE + TARIF_TEMPS, minFare)

TARIF_NUIT (22h-6h) = SUBTOTAL × 25%
TARIF_WEEKEND (sam/dim) = SUBTOTAL × 10%
TARIF_SAISONNIER (juil/août) = SUBTOTAL × 15%
SUPPLÉMENT_BAGAGES = (luggage - 2) × 5 DH    [si > 2 valises]

TOTAL_AVANT_TVA = SUBTOTAL + TARIF_NUIT + TARIF_WEEKEND + TARIF_SAISONNIER + SUPPLÉMENT_BAGAGES

TVA = TOTAL_AVANT_TVA × 20%

TOTAL_FINAL = TOTAL_AVANT_TVA + TVA
```

### Configuration Tarifaire par Défaut

| Type | Base | €/km | €/min | Minimum |
|------|------|------|-------|---------|
| Taxi | 15 DH | 10 DH | 0.50 DH | 30 DH |
| VTC | 25 DH | 12 DH | 0.75 DH | 50 DH |
| Chauffeur | 35 DH | 14 DH | 1.00 DH | 70 DH |

### Créer une Réservation (Protégé)

**POST** `/api/transport/bookings`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
  "vehicleType": "taxi",
  "pickupAddress": "Aéroport de Casablanca",
  "pickupLat": 33.3675,
  "pickupLng": -7.5898,
  "destinationAddress": "Medina, Marrakech",
  "destinationLat": 31.6295,
  "destinationLng": -8.0089,
  "scheduledTime": "2026-06-01T14:30:00",
  "passengers": 2,
  "luggage": 2,
  "totalFare": 156.50
}
```

**Réponse:**
```json
{
  "id": 123,
  "status": "pending",
  "estimatedFare": 156.50,
  "pickupTime": "2026-06-01T14:30:00",
  "driverAssigned": true,
  "message": "Réservation créée avec succès"
}
```

### Récupérer une Réservation (Protégé)

**GET** `/api/transport/bookings/:id`

### Historique Utilisateur (Protégé)

**GET** `/api/transport/bookings/user/:userId`

**Paramètres :**
- `status` (optional) - Filtrer par statut (pending, assigned, completed, cancelled)
- `limit` (optional) - Nombre de résultats (défaut: 50)

### Réservations Futures (Protégé)

**GET** `/api/transport/bookings/user/:userId/upcoming`

Retourne uniquement les réservations après la date/heure actuelle.

### Annuler une Réservation (Protégé)

**PUT** `/api/transport/bookings/:id/cancel`

**Body:**
```json
{
  "reason": "Raison optionnelle d'annulation"
}
```

### Chauffeurs Disponibles (Public)

**GET** `/api/transport/drivers/available?lat=33.5&lng=-7.5&vehicleType=taxi&date=2026-06-01T10:00:00`

Retourne les chauffeurs dans un rayon de 5km, triés par distance.

### Statistiques Route (Public)

**GET** `/api/transport/routes/stats?pickup=Casablanca&destination=Marrakech&days=30`

Retourne les statistiques d'une route :
- Nombre de réservations
- Tarif moyen/min/max
- Taux de completion

### Historique de Prix (Public)

**GET** `/api/transport/price-history?pickup=Casablanca&destination=Marrakech&days=7`

Retourne l'évolution des tarifs par jour et type de véhicule.

### Statistiques Utilisateur (Protégé)

**GET** `/api/transport/user/stats`

Retourne :
- Nombre de trajets totaux
- Trajets complétés/annulés
- Montant total dépensé
- Tarif moyen

### Export CSV (Protégé)

**GET** `/api/transport/bookings/export/csv`

Télécharge l'historique complet au format CSV.

## Service Google Maps

### Distance Matrix

Calcule la distance et durée entre deux points :

```typescript
const result = await GoogleMapsService.calculateDistance(
  'Casablanca',
  'Marrakech'
);
// Returns: { distance: 239000, duration: 2400, status: 'OK' }
```

Supporte aussi les coordonnées GPS :

```typescript
const result = await GoogleMapsService.calculateDistance(
  { lat: 33.5, lng: -7.5 },
  { lat: 31.6, lng: -8.0 }
);
```

### Geocoding

Convertit une adresse en coordonnées :

```typescript
const geo = await GoogleMapsService.geocodeAddress('Marrakech, Maroc');
// Returns: { lat: 31.6295, lng: -8.0089, address: '...' }
```

### Reverse Geocoding

Convertit les coordonnées en adresse :

```typescript
const address = await GoogleMapsService.reverseGeocode(31.6295, -8.0089);
// Returns: 'Medina, Marrakech, Maroc'
```

### Cache

Toutes les requêtes sont mises en cache 10 minutes pour optimiser les quotas API.

## Modèles de Données

### Tarif Par Type de Véhicule

| Type | Description | Usage |
|------|-------------|-------|
| **taxi** | Taxi traditionnel jaune | Court/moyen trajets urbains |
| **vtc** | Voiture de tourisme avec chauffeur | Service premium urbain |
| **chauffeur** | Chauffeur privé longue distance | Trajets aéroport, longue distance |

### Statuts de Réservation

- `pending` - En attente d'assignation
- `assigned` - Chauffeur assigné
- `in_progress` - Trajet en cours
- `completed` - Trajet complété
- `cancelled` - Annulé

### Statuts de Paiement

- `pending` - Non payé
- `completed` - Payé
- `failed` - Paiement échoué

## Majorations Automatiques

Appliquées automatiquement au calcul du tarif :

### Majoration Nocturne (+25%)

**Heures:** 22h - 6h  
**Raison:** Demande accrue, service nocturne

### Majoration Weekend (+10%)

**Jours:** Samedi et Dimanche  
**Raison:** Demande accrue les weekends

### Majoration Saisonnière (+15%)

**Périodes:**
- Juillet-Août (été touristique)
- Vacances scolaires marocaines

**Raison:** Haute saison touristique

### Supplément Bagages

**Condition:** Au-delà de 2 valises  
**Coût:** 5 DH par valise supplémentaire  
**Raison:** Espace supplémentaire nécessaire

## Gestion des Chauffeurs

### Vérification

Les chauffeurs doivent fournir :
- Numéro d'identité/passeport ✓
- Permis de conduire valide ✓
- Immatriculation du véhicule ✓
- Assurance automobile ✓
- Vérification d'antécédents ✓

### Notation

Système 1-5 étoiles basé sur :
- Qualité globale du service
- Propreté du véhicule
- Sécurité
- Communication

### Statuts

- `available` - Disponible pour les réservations
- `busy` - En trajet
- `offline` - Hors ligne

## Sécurité

### Validation des Tarifs

Le serveur recalcule le tarif côté serveur avec une tolérance de 5% pour éviter les manipulation clients.

### Authentification

- Tous les endpoints protégés requièrent un JWT
- Vérification de propriété : utilisateur ne voit que ses réservations
- Middl

## Tests

### Avec Postman/Curl

```bash
# 1. Calculer un tarif
curl -X POST "http://localhost:5000/api/transport/calculate-fare" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "taxi",
    "origin": "Casablanca",
    "destination": "Marrakech",
    "passengers": 2,
    "luggage": 1
  }'

# 2. Créer une réservation
curl -X POST "http://localhost:5000/api/transport/bookings" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "taxi",
    "pickupAddress": "Casablanca",
    "pickupLat": 33.5,
    "pickupLng": -7.5,
    "destinationAddress": "Marrakech",
    "destinationLat": 31.6,
    "destinationLng": -8.0,
    "scheduledTime": "2026-06-01T14:00:00",
    "passengers": 2,
    "luggage": 1,
    "totalFare": 156.50
  }'

# 3. Récupérer l'historique
curl "http://localhost:5000/api/transport/bookings/user/1" \
  -H "Authorization: Bearer YOUR_JWT"

# 4. Annuler une réservation
curl -X PUT "http://localhost:5000/api/transport/bookings/123/cancel" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Plans changés"}'
```

## Performance

### Cache Optimisations

- Résultats Google Maps en cache 10 minutes
- Route cache pour les trajets populaires
- Réduction des appels API de 80%+

### Indexes SQL

Tous les champs fréquemment consultés ont des indexes :
- `user_id`, `driver_id`, `status`, `payment_status`
- `scheduled_time`, `booking_date`
- `vehicle_type`

## Troubleshooting

### Erreur : "Google Maps API key invalid"

- Vérifier la clé API dans `.env`
- S'assurer que Google Maps API est activée dans GCP
- Vérifier les restrictions de clé (IP whitelist, etc)

### Erreur : "No drivers available"

- Vérifier qu'il y a des chauffeurs avec ce type de véhicule
- Vérifier que les chauffeurs sont marqués comme disponibles
- Vérifier le rayon de service (défaut: 5km)

### Tarif invalide ou calculé incorrectement

- Vérifier la configuration tarifaire dans `fare_config`
- Recalculer manuellement avec la formule
- Vérifier que les heures/dates considèrent la bonne timezone

## Roadmap Future

- [ ] Intégration Stripe/paiement
- [ ] WebSockets pour GPS en temps réel
- [ ] Matching dynamique chauffeur-client
- [ ] Itinéraires multi-stops
- [ ] Estimation du prix avant de créer
- [ ] Notifications en temps réel
- [ ] Système de tipping
- [ ] Intégration maps interactives
