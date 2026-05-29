/**
 * MOTEUR DE CALCUL TARIFAIRE TRANSPORT
 * Applique tous les paramètres:
 * - Tarif de base par véhicule
 * - Coefficient kilométrique
 * - Coefficient horaire
 * - Majoration nocturne (22h-6h) +25%
 * - Majoration week-end +10%
 * - Majoration saisonnière (juillet/août) +15%
 * - Supplément bagages
 */

const db = require('../config/database');

class TransportPricingEngine {
  /**
   * Calculer prix complet avec tous les paramètres
   */
  static async calculateFare(params) {
    const {
      vehicleType,
      distance, // en mètres
      duration, // en secondes
      pickupTime,
      bookingDate,
      passengerCount = 1
    } = params;

    // Étape 1: Récupérer configuration tarifaire pour type de véhicule
    const fareConfig = await this.getFareConfig(vehicleType);
    if (!fareConfig) {
      throw new Error(`Configuration tarifaire manquante pour ${vehicleType}`);
    }

    // Étape 2: Convertir unités
    const distanceKm = distance / 1000;
    const durationHours = duration / 3600;

    // Étape 3: Calculer tarif de base
    let baseFare = fareConfig.base_fare;

    // Étape 4: Ajouter distance
    const distanceFee = distanceKm * fareConfig.km_rate;

    // Étape 5: Ajouter temps
    const durationFee = durationHours * fareConfig.hour_rate;

    // Étape 6: Appliquer majorations

    // Majoration nocturne (22h - 6h): +25%
    const pickupHour = new Date(pickupTime).getHours();
    const nightMultiplier = (pickupHour >= 22 || pickupHour < 6) ? 1.25 : 1.0;

    // Majoration week-end: +10%
    const pickupDay = new Date(pickupTime).getDay();
    const weekendMultiplier = (pickupDay === 0 || pickupDay === 6) ? 1.10 : 1.0;

    // Majoration saisonnière (juillet/août): +15%
    const pickupMonth = new Date(pickupTime).getMonth();
    const seasonalMultiplier = (pickupMonth === 6 || pickupMonth === 7) ? 1.15 : 1.0;

    // Étape 7: Calculer sous-total
    let subtotal = baseFare + distanceFee + durationFee;

    // Appliquer tous les multiplicateurs
    subtotal = subtotal * nightMultiplier * weekendMultiplier * seasonalMultiplier;

    // Étape 8: Ajouter supplément bagages (si spécifié)
    const luggageFee = fareConfig.luggage_fee || 0;

    // Étape 9: Calculer total
    const total = subtotal + luggageFee;

    // Retourner détail complet
    return {
      breakdown: {
        baseFare: parseFloat(baseFare.toFixed(2)),
        distanceFee: parseFloat(distanceFee.toFixed(2)),
        durationFee: parseFloat(durationFee.toFixed(2)),
        subtotalBeforeSurcharge: parseFloat(subtotal.toFixed(2)),
      },
      surcharges: {
        night: pickupHour >= 22 || pickupHour < 6 ? '+25%' : 'none',
        weekend: pickupDay === 0 || pickupDay === 6 ? '+10%' : 'none',
        seasonal: pickupMonth === 6 || pickupMonth === 7 ? '+15%' : 'none',
        luggage: luggageFee > 0 ? parseFloat(luggageFee.toFixed(2)) : 'none'
      },
      total: parseFloat(total.toFixed(2)),
      currency: 'MAD',
      vehicleType,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMinutes: Math.round(durationHours * 60),
      pickupTime,
      timestamp: new Date()
    };
  }

  /**
   * Récupérer configuration tarifaire
   */
  static async getFareConfig(vehicleType) {
    const query = `
      SELECT *
      FROM transport_fare_config
      WHERE vehicle_type = ?
      LIMIT 1
    `;
    const [results] = await db.query(query, [vehicleType]);
    return results[0] || null;
  }

  /**
   * Récupérer toutes configurations
   */
  static async getAllFareConfigs() {
    const query = `SELECT * FROM transport_fare_config`;
    const [results] = await db.query(query);
    return results;
  }

  /**
   * Mettre à jour configuration tarifaire
   */
  static async updateFareConfig(config) {
    const {
      vehicleType,
      baseFare,
      kmRate,
      hourRate,
      nightSurcharge,
      weekendSurcharge,
      seasonalSurcharge,
      luggageFee
    } = config;

    const query = `
      INSERT INTO transport_fare_config
      (vehicle_type, base_fare, km_rate, hour_rate, night_surcharge, 
       weekend_surcharge, seasonal_surcharge, luggage_fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        base_fare = VALUES(base_fare),
        km_rate = VALUES(km_rate),
        hour_rate = VALUES(hour_rate),
        night_surcharge = VALUES(night_surcharge),
        weekend_surcharge = VALUES(weekend_surcharge),
        seasonal_surcharge = VALUES(seasonal_surcharge),
        luggage_fee = VALUES(luggage_fee)
    `;

    return db.query(query, [
      vehicleType,
      baseFare,
      kmRate,
      hourRate,
      nightSurcharge,
      weekendSurcharge,
      seasonalSurcharge,
      luggageFee
    ]);
  }

  /**
   * Initialiser configurations tarifaires par défaut
   */
  static async initializeDefaultConfigs() {
    const defaults = [
      {
        vehicleType: 'taxi',
        baseFare: 10,
        kmRate: 6.5,
        hourRate: 50,
        nightSurcharge: 0.25,
        weekendSurcharge: 0.10,
        seasonalSurcharge: 0.15,
        luggageFee: 5
      },
      {
        vehicleType: 'vtc',
        baseFare: 15,
        kmRate: 8,
        hourRate: 60,
        nightSurcharge: 0.20,
        weekendSurcharge: 0.10,
        seasonalSurcharge: 0.15,
        luggageFee: 0
      },
      {
        vehicleType: 'rental_with_driver',
        baseFare: 20,
        kmRate: 7,
        hourRate: 70,
        nightSurcharge: 0.15,
        weekendSurcharge: 0.10,
        seasonalSurcharge: 0.15,
        luggageFee: 0
      },
      {
        vehicleType: 'rental_without_driver',
        baseFare: 0,
        kmRate: 0.5,
        hourRate: 100,
        nightSurcharge: 0,
        weekendSurcharge: 0.10,
        seasonalSurcharge: 0.25,
        luggageFee: 0
      }
    ];

    for (const config of defaults) {
      await this.updateFareConfig(config);
    }
  }
}

module.exports = TransportPricingEngine;
