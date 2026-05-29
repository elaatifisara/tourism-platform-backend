/**
 * CALCUL TARIFAIRE DÉTERMINISTE - DÉTAILS TECHNIQUES
 * 
 * Ce document explique le système de tarification du module transport TravEasy
 */

// ============================================================
// FORMULE DE TARIFICATION COMPLÈTE
// ============================================================

/*
TARIF = TARIF_BASE + TARIF_DISTANCE + TARIF_TEMPS
TARIF = max(TARIF, TARIF_MINIMUM)

TARIF_BASE = baseFare du type de véhicule
TARIF_DISTANCE = distance_en_km × price_per_km
TARIF_TEMPS = duration_en_minutes × price_per_minute

MAJORATIONS (appliquées en cascade sur le TARIF):

  IF (heure >= 22 OR heure < 6) THEN
    TARIF += TARIF × 0.25  // +25% majoration nocturne
  
  IF (jour = samedi OR jour = dimanche) THEN
    TARIF += TARIF × 0.10  // +10% majoration weekend
  
  IF (mois = juillet OR mois = août) THEN
    TARIF += TARIF × 0.15  // +15% majoration saisonnière

SUPPLÉMENT BAGAGES:
  IF (nombre_valises > 2) THEN
    TARIF += (nombre_valises - 2) × 5 DH

TVA:
  TVA = TARIF × 0.20
  TARIF_FINAL = TARIF + TVA
*/

// ============================================================
// EXEMPLES DE CALCULS
// ============================================================

/*
EXEMPLE 1: Trajet taxi dimanche matin (pas de majoration nuit/saison)
- Distance: 10 km
- Durée: 20 minutes
- Passagers: 1
- Bagages: 1
- Date/Heure: dimanche 10h00

Calcul:
  TARIF_BASE = 15 DH
  TARIF_DISTANCE = 10 km × 10 DH/km = 100 DH
  TARIF_TEMPS = 20 min × 0.50 DH/min = 10 DH
  SUBTOTAL = max(15 + 100 + 10, 30) = 125 DH
  
  MAJORATION_NUIT = 0 (10h est jour)
  MAJORATION_WEEKEND = 125 × 0.10 = 12.50 DH (dimanche)
  MAJORATION_SAISONNIER = 0 (pas juillet/août)
  SUPPLÉMENT_BAGAGES = 0 (1 valise < 2)
  
  TOTAL_AVANT_TVA = 125 + 0 + 12.50 + 0 + 0 = 137.50 DH
  TVA = 137.50 × 0.20 = 27.50 DH
  TARIF_FINAL = 137.50 + 27.50 = 165 DH

===

EXEMPLE 2: Trajet VTC nuit en juillet avec 4 valises
- Distance: 240 km (Casablanca -> Marrakech)
- Durée: 4h (240 minutes)
- Passagers: 2
- Bagages: 4
- Date/Heure: samedi 23h30 en juillet

Calcul:
  TARIF_BASE = 25 DH
  TARIF_DISTANCE = 240 km × 12 DH/km = 2880 DH
  TARIF_TEMPS = 240 min × 0.75 DH/min = 180 DH
  SUBTOTAL = max(25 + 2880 + 180, 50) = 3085 DH
  
  MAJORATION_NUIT = 3085 × 0.25 = 771.25 DH (23h30)
  MAJORATION_WEEKEND = (3085 + 771.25) × 0.10 = 385.625 DH (samedi)
  MAJORATION_SAISONNIER = (3085 + 771.25 + 385.625) × 0.15 = 634.594 DH (juillet)
  SUPPLÉMENT_BAGAGES = (4 - 2) × 5 = 10 DH
  
  TOTAL_AVANT_TVA = 3085 + 771.25 + 385.625 + 634.594 + 10 = 4886.469 DH
  TVA = 4886.469 × 0.20 = 977.294 DH
  TARIF_FINAL = 4886.469 + 977.294 = 5863.763 ≈ 5863.76 DH

===

EXEMPLE 3: Tarif minimum (course courte)
- Distance: 1 km
- Durée: 5 minutes
- Type: taxi
- Date/Heure: lundi 15h

Calcul:
  TARIF_BASE = 15 DH
  TARIF_DISTANCE = 1 km × 10 DH/km = 10 DH
  TARIF_TEMPS = 5 min × 0.50 DH/min = 2.50 DH
  SUBTOTAL = max(15 + 10 + 2.50, 30) = 30 DH (applique le minimum)
  
  MAJORATION_NUIT = 0 (15h)
  MAJORATION_WEEKEND = 0 (lundi)
  MAJORATION_SAISONNIER = 0 (février)
  SUPPLÉMENT_BAGAGES = 0
  
  TOTAL_AVANT_TVA = 30 DH
  TVA = 30 × 0.20 = 6 DH
  TARIF_FINAL = 30 + 6 = 36 DH
*/

// ============================================================
// MAJORATIONS DÉTAILLÉES
// ============================================================

/*
MAJORATION NOCTURNE (+25%):
  Heure de démarrage entre 22h00 et 06h00
  Raison: Demande accrue la nuit, sécurité renforcée requise
  
  Heures affectées: 22, 23, 0, 1, 2, 3, 4, 5
  
  Exemple: 22h30 → majoration appliquée
           06h00 → pas de majoration (limite basse inclusive)
           21h59 → pas de majoration

MAJORATION WEEKEND (+10%):
  Jour = samedi OU jour = dimanche
  Raison: Demande accrue les weekends
  
  Jours affectés: samedi (6), dimanche (0)
  Autres jours: pas de majoration

MAJORATION SAISONNIÈRE (+15%):
  Juillet (mois=6) OU Août (mois=7)
  Raison: Haute saison touristique au Maroc
  
  Périodes affectées: du 1er juillet au 31 août
  Autres périodes: pas de majoration
  
  Note: Les vacances scolaires peuvent être ajoutées ultérieurement

SUPPLÉMENT BAGAGES:
  Si nombre_valises > 2: coût additionnel = (nombre_valises - 2) × 5 DH
  
  Exemples:
    - 0 valises → 0 DH
    - 1 valise → 0 DH
    - 2 valises → 0 DH
    - 3 valises → 5 DH
    - 4 valises → 10 DH
    - 5 valises → 15 DH
    
  Note: Ce supplément est fixe, pas en pourcentage
*/

// ============================================================
// ORDRE D'APPLICATION DES MAJORATIONS
// ============================================================

/*
L'ordre d'application IMPORTE car les majorations se cumulent:

CORRECT (cascade):
  1. Tarif de base = base + distance + temps
  2. Appliquer majoration nuit: tarif += tarif × 0.25
  3. Appliquer majoration weekend: tarif += tarif × 0.10
  4. Appliquer majoration saisonnier: tarif += tarif × 0.15
  5. Ajouter supplément bagages: tarif += (valises - 2) × 5
  6. Ajouter TVA: tarif += tarif × 0.20

INCORRECT (multiplication simple):
  tarif = tarif × 1.25 × 1.10 × 1.15  // MAUVAIS - compounding mal contrôlé
*/

// ============================================================
// CAS LIMITES & ARRONDIS
// ============================================================

/*
ARRONDI:
  - Les tarifs sont arrondis à 2 décimales
  - Format: round(tarif, 2)
  - Exemple: 5863.763 → 5863.76
  
TARIF MINIMUM:
  - Appliqué AVANT majorations
  - Chaque type de véhicule a son minimum
  - Le minimum est déjà appliqué dans le max()

MAJORATIONS À ZÉRO:
  - Si pas de condition, majoration = 0 DH
  - max() garantit pas de tarif négatif

LIMITES HORAIRES:
  - Nuit: [22h00 - 06h00[  (06h00 exclus)
  - Si heure >= 22 OR heure < 6: majoration nuit
  - Exemple: 05h59 → majoration / 06h00 → pas de maj
  
LIMITES MENSUELLES:
  - Juillet: mois = 6 (0-indexed en Python, 1-indexed en SQL)
  - Août: mois = 7
  - En JS/TS: date.getMonth() retourne 0-11, donc juillet=6, août=7

ACCUMULATION DE MAJORATIONS:
  - Les majorations se cumulent (ex: nuit + weekend + saison)
  - Elles s'appliquent en cascade, pas en multiplication simultanée
*/

// ============================================================
// CONFIGURATION TARIFAIRE PAR TYPE
// ============================================================

/*
TYPE: TAXI (traditionnel jaune)
  baseFare: 15 DH
  pricePerKm: 10 DH
  pricePerMinute: 0.50 DH
  minFare: 30 DH
  
  Cas d'usage: Trajets urbains courants
  Distance typique: 0-20 km
  Clientèle: Tourismes locaux, trajets quotidiens

TYPE: VTC (Voiture de Tourisme avec Chauffeur)
  baseFare: 25 DH
  pricePerKm: 12 DH
  pricePerMinute: 0.75 DH
  minFare: 50 DH
  
  Cas d'usage: Service premium urbain
  Distance typique: 0-30 km
  Clientèle: Touristes aisés, déplacements affaires
  Différences: Plus confortable, chauffeur professionnel

TYPE: CHAUFFEUR (voiture avec chauffeur privé)
  baseFare: 35 DH
  pricePerKm: 14 DH
  pricePerMinute: 1.00 DH
  minFare: 70 DH
  
  Cas d'usage: Longue distance, transferts aéroport
  Distance typique: 20-250 km
  Clientèle: Touristes internationaux, groupes
  Différences: Service haut de gamme, trajets longs
*/

// ============================================================
// VALIDATION DES TARIFS (CÔTÉ SERVEUR)
// ============================================================

/*
Quand un client crée une réservation, le serveur recalcule le tarif.

TOLÉRANCE ACCEPTÉE: 5%

Validation:
  tarif_serveur = calculateFare(...)
  tarif_client = tarif_envoyé_par_client
  
  tolerance = tarif_serveur × 0.05
  
  IF abs(tarif_client - tarif_serveur) > tolerance:
    REJETER la réservation avec erreur 400
  ELSE:
    ACCEPTER la réservation
    UTILISER le tarif_serveur (pas celui du client)

Raison:
  - Évite les manipulations du client
  - Accepte les petites imprécisions (arrondis)
  - Protège le business model
*/

// ============================================================
// HISTORIQUE DE PRIX & STATISTIQUES
// ============================================================

/*
Tous les tarifs sont enregistrés dans la BD:

Champs enregistrés:
  - distance_km: distance réelle calculée par Google Maps
  - estimated_duration: durée estimée (minutes)
  - base_fare: tarif de base appliqué
  - distance_fare: partie distance du tarif
  - time_fare: partie temps du tarif
  - night_surcharge: majoration nuit (0 si pas applicable)
  - weekend_surcharge: majoration weekend
  - seasonal_surcharge: majoration saisonnier
  - luggage_surcharge: supplément bagages
  - subtotal: total avant TVA
  - tax: montant TVA
  - total_fare: tarif final payé

Utilité:
  - Permet analyser les tendances de prix
  - Aide à optimiser les tarifs
  - Facilite l'audit et la conformité
  - Permet recalculer/vérifier les factures

Requête pour histque:
  SELECT 
    DATE(booking_date) as date,
    vehicle_type,
    AVG(total_fare) as avg_price,
    MIN(total_fare) as min_price,
    MAX(total_fare) as max_price,
    COUNT(*) as bookings
  FROM transport_bookings
  WHERE pickup_address = ? AND destination_address = ?
  GROUP BY DATE(booking_date), vehicle_type
  ORDER BY date DESC
*/

// ============================================================
// NOTES D'IMPLÉMENTATION
// ============================================================

/*
1. PRÉCISION NUMÉRIQUE:
   - Utiliser DECIMAL(10,2) en SQL (pas FLOAT)
   - Arrondis à 2 décimales avant affichage/paiement

2. GESTION DES FUSEAUX HORAIRES:
   - Toutes les dates en UTC en BD
   - Convertir en fuseau Maroc (UTC+1) pour majorations nuit
   - JS: new Date().getHours() utilise fuseau du navigateur/serveur

3. CACHE DES TARIFS:
   - Résultats Google Maps en cache 10 min
   - Routes populaires précalculées
   - Actualiser tarifs si config change

4. MODIFICATION DES TARIFS:
   - Les modifications n'affectent que les NOUVEAUX trajets
   - Les trajets existants conservent leur tarif enregistré
   - Utile pour audits et garantir la transparence

5. EXTENSIONS FUTURES:
   - Surge pricing (prix dynamique)
   - Tarifs par période horaire (off-peak, peak)
   - Tarifs par zone géographique
   - Réductions fidélité
   - Codes promo et coupons
*/

export default /* tarification technical details */;
