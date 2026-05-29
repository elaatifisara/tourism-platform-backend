// Transport pricing calculation with all surcharges
// Based on specification: Base Rate + Duration Factor + Surcharges

class TransportPricingService {
  /**
   * Calculate transport pricing with all factors
   * @param {Object} params - Pricing parameters
   * @returns {Object} Detailed pricing breakdown
   */
  static calculatePrice(params) {
    const {
      vehicleType = 'classic', // classic, vtc, rental
      distance = 0, // in km
      duration = 0, // in minutes
      date = new Date(),
      luggage = 0, // number of extra suitcases beyond standard
    } = params;

    // Base rates per vehicle type (in currency)
    const baseRates = {
      classic: 50,    // Classic taxi
      vtc: 75,        // Vehicle with Driver
      rental: 100,    // Car rental per day
    };

    // Hourly coefficient for duration (converts minutes to hours and applies rate)
    const hourlyRate = 25; // per hour

    // Step 1: Calculate base price
    const basePrice = baseRates[vehicleType] || baseRates.classic;

    // Step 2: Duration factor (hours * hourly rate)
    const hours = Math.ceil(duration / 60);
    const durationCharge = hours * hourlyRate;

    // Step 3: Distance factor (km * rate per km)
    const ratePerKm = 2; // per km
    const distanceCharge = distance * ratePerKm;

    // Step 4: Night surcharge (+25% between 22:00 and 06:00)
    const nightSurcharge = this._calculateNightSurcharge(date, basePrice + durationCharge + distanceCharge);

    // Step 5: Weekend surcharge (+10% on Saturdays and Sundays)
    const weekendSurcharge = this._calculateWeekendSurcharge(date, basePrice + durationCharge + distanceCharge);

    // Step 6: Seasonal surcharge (+15% in July/August and vacation periods)
    const seasonalSurcharge = this._calculateSeasonalSurcharge(date, basePrice + durationCharge + distanceCharge);

    // Step 7: Luggage supplement (flat fee per extra suitcase)
    const luggageFee = luggage > 2 ? (luggage - 2) * 10 : 0; // $10 per suitcase beyond 2

    // Total calculation
    const subtotal = basePrice + durationCharge + distanceCharge;
    const totalSurcharges = nightSurcharge + weekendSurcharge + seasonalSurcharge + luggageFee;
    const totalPrice = subtotal + totalSurcharges;

    return {
      breakdown: {
        basePrice,
        durationCharge,
        distanceCharge,
        nightSurcharge,
        weekendSurcharge,
        seasonalSurcharge,
        luggageFee,
      },
      subtotal,
      totalSurcharges,
      totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimals
      currency: 'USD',
      validUntil: new Date(Date.now() + 15 * 60 * 1000), // Valid for 15 minutes
    };
  }

  /**
   * Calculate night surcharge (+25% between 22:00 and 06:00)
   */
  static _calculateNightSurcharge(date, baseAmount) {
    const hours = date.getHours();
    if (hours >= 22 || hours < 6) {
      return Math.round(baseAmount * 0.25 * 100) / 100;
    }
    return 0;
  }

  /**
   * Calculate weekend surcharge (+10% on Saturdays and Sundays)
   */
  static _calculateWeekendSurcharge(date, baseAmount) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 = Sunday, 6 = Saturday
      return Math.round(baseAmount * 0.1 * 100) / 100;
    }
    return 0;
  }

  /**
   * Calculate seasonal surcharge (+15% in July/August and vacation periods)
   */
  static _calculateSeasonalSurcharge(date, baseAmount) {
    const month = date.getMonth();
    // July (6) and August (7) are peak season
    // Also consider other vacation periods
    if (month === 6 || month === 7) {
      return Math.round(baseAmount * 0.15 * 100) / 100;
    }
    return 0;
  }

  /**
   * Get pricing estimate for display
   */
  static getPricingEstimate(params) {
    const pricing = this.calculatePrice(params);
    return {
      estimated: pricing.totalPrice,
      currency: pricing.currency,
      breakdown: pricing.breakdown,
      validUntil: pricing.validUntil,
    };
  }
}

module.exports = TransportPricingService;
