const TransportModel = require('./transport.model');
const GoogleMaps = require('./googleMaps');

class TransportService {
  static async calculateFare({ vehicleType = 'taxi', origin, destination, numBags = 0, pickupTime = null }) {
    // Get distance via Google Maps
    const dm = await GoogleMaps.getDistanceAndDuration(origin, destination);
    const distanceKm = (dm.distanceMeters || 0) / 1000;

    // Load fare config
    const config = await TransportModel.getFareConfig(vehicleType) || {
      base_fare: 20,
      per_km: 4,
      baggage_fee: 10
    };

    // Base fare calculation
    let fare = parseFloat(config.base_fare) + parseFloat(config.per_km) * distanceKm;

    // Prepare breakdown
    const breakdown = {
      base_fare: parseFloat(config.base_fare),
      distance_km: distanceKm,
      per_km_rate: parseFloat(config.per_km),
      baggage_fee_total: 0,
      multipliers: [],
      subtotal: fare
    };

    // Baggage fee beyond 2 bags
    if (numBags > 2) {
      const extra = numBags - 2;
      const baggageFee = parseFloat(config.baggage_fee || 0) * extra;
      breakdown.baggage_fee_total = baggageFee;
      fare += baggageFee;
    }

    // Determine pickup time
    const dt = pickupTime ? new Date(pickupTime) : new Date();
    const hour = dt.getHours();
    const day = dt.getDay(); // 0 Sun - 6 Sat
    const month = dt.getMonth() + 1; // 1-12

    // Night surcharge 22h-6h +25%
    if (hour >= 22 || hour < 6) {
      breakdown.multipliers.push({ name: 'night', factor: 1.25 });
      fare *= 1.25;
    }

    // Weekend surcharge Sat(6)/Sun(0) +10%
    if (day === 6 || day === 0) {
      breakdown.multipliers.push({ name: 'weekend', factor: 1.10 });
      fare *= 1.10;
    }

    // Seasonal surcharge July/August +15% (simple check)
    if (month === 7 || month === 8) {
      breakdown.multipliers.push({ name: 'seasonal', factor: 1.15 });
      fare *= 1.15;
    }

    breakdown.subtotal = parseFloat((fare).toFixed(2));
    breakdown.total = breakdown.subtotal;

    return {
      distanceMeters: dm.distanceMeters,
      durationSeconds: dm.durationSeconds,
      fare_amount: parseFloat(breakdown.total.toFixed(2)),
      fare_breakdown: breakdown
    };
  }

  static async createBooking(userId, payload) {
    // payload: vehicleType, origin{addr/lat/lng}, destination, numBags, pickupTime
    const calc = await this.calculateFare(payload);

    // find an available driver (best-effort)
    const driver = await TransportModel.findAvailableDriver(payload.vehicleType).catch(() => null);

    const bookingData = {
      user_id: userId,
      driver_id: driver ? driver.id : null,
      vehicle_type: payload.vehicleType,
      origin_address: payload.origin.address || null,
      origin_lat: payload.origin.lat || null,
      origin_lng: payload.origin.lng || null,
      dest_address: payload.destination.address || null,
      dest_lat: payload.destination.lat || null,
      dest_lng: payload.destination.lng || null,
      distance_meters: calc.distanceMeters,
      duration_seconds: calc.durationSeconds,
      fare_amount: calc.fare_amount,
      fare_breakdown: calc.fare_breakdown,
      status: 'confirmed'
    };

    const booking = await TransportModel.createBooking(bookingData);
    return { booking, driver };
  }
}

module.exports = TransportService;
