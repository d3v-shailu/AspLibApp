import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { haversineMeters } from "../utils/geofence";

export interface LocationFix {
  lat: number;
  lng: number;
  accuracy?: number;
}

/**
 * Watches the device position and reports the distance to a target point.
 * Updates every ~2s while mounted.
 */
export function useGeofence(targetLat?: number, targetLng?: number) {
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const request = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Location permission denied. Enable it to check in.");
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await request();
      if (!ok || cancelled) return;
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        (pos) => {
          if (cancelled) return;
          setFix({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? undefined,
          });
          setError(null);
        }
      );
    })().catch(() => setError("Could not start location tracking"));

    return () => {
      cancelled = true;
      watchRef.current?.remove();
    };
  }, [request]);

  const distance =
    fix && targetLat != null && targetLng != null
      ? Math.round(haversineMeters(fix.lat, fix.lng, targetLat, targetLng))
      : null;

  return { fix, distance, error, requestPermission: request };
}
