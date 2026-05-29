import { Client } from '@googlemaps/js-client-library';
import NodeCache from 'node-cache';

interface DistanceMatrixResponse {
  distance: number; // en mètres
  duration: number; // en secondes
  status: string;
}

interface GeocodingResponse {
  lat: number;
  lng: number;
  address: string;
}

const googleMapsClient = new Client({
  key: process.env.GOOGLE_MAPS_API_KEY,
});

// Cache pour les résultats Google Maps (10 minutes TTL)
const mapsCache = new NodeCache({ stdTTL: 600 });

export class GoogleMapsService {
  /**
   * Calcule la distance entre deux points via Google Maps Distance Matrix API
   */
  static async calculateDistance(
    origin: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number },
  ): Promise<DistanceMatrixResponse> {
    try {
      // Formater les paramètres
      const originStr =
        typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
      const destinationStr =
        typeof destination === 'string'
          ? destination
          : `${destination.lat},${destination.lng}`;

      // Générer clé de cache
      const cacheKey = `distance_${originStr}_${destinationStr}`;

      // Vérifier le cache
      const cached = mapsCache.get(cacheKey);
      if (cached) {
        return cached as DistanceMatrixResponse;
      }

      // Appeler Google Maps Distance Matrix API
      const response = await googleMapsClient.distanceMatrix({
        origins: [originStr],
        destinations: [destinationStr],
        mode: 'driving',
        language: 'fr',
      });

      if (!response.rows || response.rows.length === 0) {
        throw new Error('Aucune route trouvée entre ces deux points');
      }

      const element = response.rows[0].elements[0];

      if (element.status !== 'OK') {
        throw new Error(`Erreur Google Maps: ${element.status}`);
      }

      const result: DistanceMatrixResponse = {
        distance: element.distance.value, // en mètres
        duration: element.duration.value, // en secondes
        status: element.status,
      };

      // Mettre en cache
      mapsCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Google Maps Distance Error:', error);
      throw error;
    }
  }

  /**
   * Géocode une adresse pour obtenir les coordonnées
   */
  static async geocodeAddress(address: string): Promise<GeocodingResponse> {
    try {
      const cacheKey = `geocode_${address}`;

      // Vérifier le cache
      const cached = mapsCache.get(cacheKey);
      if (cached) {
        return cached as GeocodingResponse;
      }

      // Appeler Google Maps Geocoding API
      const response = await googleMapsClient.geocode({
        address: address,
        language: 'fr',
      });

      if (!response.results || response.results.length === 0) {
        throw new Error('Adresse non trouvée');
      }

      const result = response.results[0];

      const geoResponse: GeocodingResponse = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        address: result.formatted_address,
      };

      // Mettre en cache
      mapsCache.set(cacheKey, geoResponse);

      return geoResponse;
    } catch (error) {
      console.error('Google Maps Geocoding Error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocoding : obtenir une adresse à partir des coordonnées
   */
  static async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const cacheKey = `reverse_geocode_${lat}_${lng}`;

      // Vérifier le cache
      const cached = mapsCache.get(cacheKey);
      if (cached) {
        return cached as string;
      }

      // Appeler Google Maps Reverse Geocoding
      const response = await googleMapsClient.reverseGeocode({
        latlng: { lat, lng },
        language: 'fr',
      });

      if (!response.results || response.results.length === 0) {
        throw new Error('Adresse non trouvée pour ces coordonnées');
      }

      const address = response.results[0].formatted_address;

      // Mettre en cache
      mapsCache.set(cacheKey, address);

      return address;
    } catch (error) {
      console.error('Google Maps Reverse Geocoding Error:', error);
      throw error;
    }
  }

  /**
   * Calcule la route avec étapes (waypoints)
   */
  static async calculateRoute(
    origin: string,
    destination: string,
    waypoints?: string[],
  ): Promise<any> {
    try {
      const response = await googleMapsClient.directions({
        origin,
        destination,
        waypoints: waypoints || [],
        language: 'fr',
      });

      if (!response.routes || response.routes.length === 0) {
        throw new Error('Aucune route trouvée');
      }

      return response.routes[0];
    } catch (error) {
      console.error('Google Maps Directions Error:', error);
      throw error;
    }
  }

  /**
   * Vérifier si deux points sont dans une zone de service (rayon maximal)
   */
  static async isWithinServiceArea(
    origin: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number },
    maxDistanceKm: number = 50,
  ): Promise<boolean> {
    try {
      const result = await this.calculateDistance(origin, destination);
      const distanceKm = result.distance / 1000;
      return distanceKm <= maxDistanceKm;
    } catch (error) {
      console.error('Service area check error:', error);
      return false;
    }
  }

  /**
   * Vider le cache (pour maintenance)
   */
  static clearCache(): void {
    mapsCache.flushAll();
    console.log('Google Maps cache cleared');
  }

  /**
   * Obtenir les statistiques du cache
   */
  static getCacheStats(): any {
    return mapsCache.getStats();
  }
}

export default GoogleMapsService;
