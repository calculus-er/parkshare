/**
 * Map utility helpers for Leaflet + OpenStreetMap
 * Using Thunderforest Pioneer tiles
 */

/**
 * Haversine formula — calculates distance between two lat/lng points in km
 */
export function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get approximate ETA in minutes, assuming 30 km/h average urban speed
 */
export function getETAMinutes(distanceKm: number): number {
  const avgSpeedKmH = 30;
  return Math.round((distanceKm / avgSpeedKmH) * 60);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Get Thunderforest Pioneer tile URL
 */
export function getTileUrl(): string {
  const apiKey = process.env.NEXT_PUBLIC_THUNDERFOREST_API_KEY;
  if (apiKey) {
    return `https://tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=${apiKey}`;
  }
  // Fallback to OpenStreetMap if no Thunderforest key
  return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
}

/**
 * Get tile attribution
 */
export function getTileAttribution(): string {
  const apiKey = process.env.NEXT_PUBLIC_THUNDERFOREST_API_KEY;
  if (apiKey) {
    return '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';
  }
  return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
