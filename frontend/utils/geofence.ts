/** Distance in meters between two lat/lng points (Haversine). */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface GeofenceResult {
  inside: boolean;
  distance: number;
  reason?: string;
}

export function isInsideGeofence(
  userLat: number,
  userLng: number,
  libLat: number,
  libLng: number,
  radiusMeters: number,
  accuracy?: number
): GeofenceResult {
  if (accuracy != null && accuracy > 50) {
    return { inside: false, distance: 0, reason: "GPS signal too weak" };
  }
  const distance = haversineMeters(userLat, userLng, libLat, libLng);
  return { inside: distance <= radiusMeters, distance: Math.round(distance) };
}
