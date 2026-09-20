export interface Coordinates { lat: number; lng: number }
export type LocationFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export class LocationError extends Error {
  constructor(public reason: LocationFailure) { super(reason); }
}

export const LOCATION_TIMEOUT_MS = 10000;

/** One reading; only initial discovery may reuse a recent browser position. */
export function getCurrentUserLocation(options: { initial?: boolean } = {}): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new LocationError('unsupported')); return; }
    let settled = false;
    const finish = (coordinates?: Coordinates, reason: LocationFailure = 'unavailable') => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (coordinates) resolve(coordinates);
      else reject(new LocationError(reason));
    };
    // Some browsers exclude permission-prompt time from their native timeout.
    const deadline = setTimeout(() => finish(undefined, 'timeout'), LOCATION_TIMEOUT_MS);
    try {
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude: lat, longitude: lng } = position.coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          finish();
          return;
        }
        finish({ lat, lng });
      }, error => finish(undefined, error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable'), {
        maximumAge: options.initial ? 30000 : 0,
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT_MS,
      });
    } catch { finish(); }
  });
}
