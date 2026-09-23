// src/utils/geo.ts
// Wspólne funkcje geolokalizacyjne używane przez nawigację i tracker

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Oblicza odległość między dwoma punktami GPS metodą Haversine.
 * Zwraca wynik w METRACH.
 */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000; // promień Ziemi w metrach
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const a2 =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;

  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}

/**
 * Oblicza odległość w kilometrach.
 */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  return haversineMeters(a, b) / 1000;
}

/**
 * Oblicza dystans punktu od odcinka (segment point-linia).
 * Używane do wykrywania odchylenia od trasy.
 * Zwraca odległość w metrach.
 */
export function distanceFromSegmentMeters(
  point: Coordinates,
  segStart: Coordinates,
  segEnd: Coordinates
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;

  // Uproszczona projekcja na płaszczyznę (ok. dla małych odległości < 100km)
  const cosLat = Math.cos(toRad((segStart.lat + segEnd.lat) / 2));

  const px = (point.lng - segStart.lng) * cosLat;
  const py = point.lat - segStart.lat;
  const dx = (segEnd.lng - segStart.lng) * cosLat;
  const dy = segEnd.lat - segStart.lat;

  const segLenSq = dx * dx + dy * dy;

  if (segLenSq === 0) {
    // Punkt == segment
    return haversineMeters(point, segStart);
  }

  let t = (px * dx + py * dy) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  const closestLat = segStart.lat + t * dy;
  const closestLng = segStart.lng + t * (segEnd.lng - segStart.lng);

  return haversineMeters(point, { lat: closestLat, lng: closestLng });
}

/**
 * Formatuje odległość do czytelnego tekstu po polsku.
 */
export function formatDistance(meters: number): string {
  if (meters < 50) return 'za chwilę';
  if (meters < 950) return `za ${Math.round(meters / 50) * 50} m`;
  const km = meters / 1000;
  if (km < 10) return `za ${km.toFixed(1).replace('.', ',')} km`;
  return `za ${Math.round(km)} km`;
}

/**
 * Formatuje czas w sekundach do czytelnego tekstu po polsku.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sek`;
  const min = Math.floor(seconds / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${min} min`;
  return `${h} godz ${m} min`;
}
