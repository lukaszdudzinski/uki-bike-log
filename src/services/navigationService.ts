// src/services/navigationService.ts — v2 (po code review)
// FIX #4/#14/#24: dodano User-Agent, AbortController z timeoutem, obsługę błędów fetch

import type { Coordinates } from '../utils/geo';

const FETCH_TIMEOUT_MS = 10_000;
const APP_USER_AGENT = 'UkiBikeLog/1.0 (https://github.com/lukaszdudzinski/uki-bike-log)';

// ─── Typy OSRM ────────────────────────────────────────────────────────────────

interface OsrmManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
  exit?: number;
}

interface OsrmStep {
  maneuver: OsrmManeuver;
  distance: number;
  duration: number;
  name: string;
  ref?: string;
}

export interface NavStep {
  instruction: string;
  distanceToNext: number;
  durationToNext: number;
  streetName: string;
  icon: string;
  location: Coordinates;
  isArrival: boolean;
  roundaboutExit?: number;
}

export interface NavRoute {
  steps: NavStep[];
  totalDistance: number;
  totalDuration: number;
  polyline: Coordinates[];
}

// ─── FIX #21: Rozszerzony słownik manewrów (dodano 'use lane', 'off ramp', 'on ramp') ──

const MANEUVER_VERBS: Record<string, Record<string, string>> = {
  'turn': {
    'left': 'Skręć w lewo', 'right': 'Skręć w prawo',
    'slight left': 'Trzymaj się lewej strony', 'slight right': 'Trzymaj się prawej strony',
    'sharp left': 'Skręć ostro w lewo', 'sharp right': 'Skręć ostro w prawo',
    'uturn': 'Zawróć', 'straight': 'Jedź prosto', '': 'Jedź prosto',
  },
  'new name': {
    'left': 'Kontynuuj w lewo', 'right': 'Kontynuuj w prawo',
    'straight': 'Kontynuuj prosto', '': 'Kontynuuj',
  },
  'depart': { '': 'Ruszaj!', 'left': 'Ruszaj i trzymaj się lewej', 'right': 'Ruszaj i trzymaj się prawej' },
  'arrive': { '': 'Dotarłeś do celu!', 'left': 'Cel jest po lewej stronie', 'right': 'Cel jest po prawej stronie' },
  'merge': { 'left': 'Włącz się od lewej', 'right': 'Włącz się od prawej', 'slight left': 'Włącz się lekko od lewej', 'slight right': 'Włącz się lekko od prawej', '': 'Włącz się do ruchu' },
  'ramp':     { 'left': 'Zjedź zjazdem w lewo', 'right': 'Zjedź zjazdem w prawo', 'slight left': 'Trzymaj się lewego zjazdu', 'slight right': 'Trzymaj się prawego zjazdu', '': 'Zjedź zjazdem' },
  'on ramp':  { 'left': 'Wjedź na drogę szybkiego ruchu od lewej', 'right': 'Wjedź na drogę szybkiego ruchu od prawej', '': 'Wjedź na drogę szybkiego ruchu' },
  'off ramp': { 'left': 'Zjedź z drogi szybkiego ruchu w lewo', 'right': 'Zjedź z drogi szybkiego ruchu w prawo', '': 'Zjedź z drogi szybkiego ruchu' },
  'use lane': { 'left': 'Jedź lewym pasem', 'right': 'Jedź prawym pasem', 'straight': 'Jedź pasem prosto', '': 'Zmień pas' },
  'fork':     { 'left': 'Na rozwidleniu jedź w lewo', 'right': 'Na rozwidleniu jedź w prawo', 'slight left': 'Na rozwidleniu trzymaj się lewej', 'slight right': 'Na rozwidleniu trzymaj się prawej', '': 'Na rozwidleniu jedź prosto' },
  'end of road': { 'left': 'Na końcu drogi skręć w lewo', 'right': 'Na końcu drogi skręć w prawo', '': 'Na końcu drogi kontynuuj' },
  'continue': { 'straight': 'Kontynuuj jazdę prosto', 'left': 'Kontynuuj w lewo', 'right': 'Kontynuuj w prawo', '': 'Kontynuuj' },
  'roundabout': { '': 'Wjedź na rondo' },
  'exit roundabout': { '': 'Zjedź z ronda' },
  'rotary':       { '': 'Wjedź na rondo' },
  'exit rotary':  { '': 'Zjedź z ronda' },
  'notification': { '': 'Uwaga' },
};

// FIX #21: dodano 'uturn' w ICONS, 'use lane', 'off ramp', 'on ramp'
const MANEUVER_ICONS: Record<string, Record<string, string>> = {
  'turn':     { 'left': '↰', 'right': '↱', 'slight left': '↖', 'slight right': '↗', 'sharp left': '↙', 'sharp right': '↘', 'uturn': '↩', '': '↑', 'straight': '↑' },
  'depart':   { '': '🏁' },
  'arrive':   { '': '🏆' },
  'merge':    { '': '⬆', 'left': '↖', 'right': '↗' },
  'ramp':     { '': '↗', 'left': '↖', 'right': '↗' },
  'on ramp':  { '': '↗', 'left': '↖', 'right': '↗' },
  'off ramp': { '': '↘', 'left': '↙', 'right': '↘' },
  'use lane': { '': '🛣️', 'left': '↰', 'right': '↱', 'straight': '↑' },
  'fork':     { '': '↑', 'left': '↖', 'right': '↗' },
  'end of road': { '': '↑', 'left': '↰', 'right': '↱' },
  'continue': { '': '↑', 'straight': '↑', 'left': '↰', 'right': '↱' },
  'roundabout': { '': '🔄' },
  'exit roundabout': { '': '↱' },
  'rotary':   { '': '🔄' },
  'exit rotary': { '': '↱' },
  'new name': { '': '↑' },
};

// FIX #15: fallback to empty object, nie do 'continue'
function lookupManeuver(map: Record<string, Record<string, string>>, type: string, modifier: string, fallback: string): string {
  const byType = map[type] ?? {};
  return byType[modifier] ?? byType[''] ?? fallback;
}

function buildInstruction(step: OsrmStep): string {
  const { type, modifier = '', exit } = step.maneuver;
  let verb = lookupManeuver(MANEUVER_VERBS, type, modifier, 'Kontynuuj');

  if ((type === 'roundabout' || type === 'rotary') && exit) {
    // FIX #20: rozszerzona tablica ordinals
    const ordinals = ['', 'pierwszym', 'drugim', 'trzecim', 'czwartym', 'piątym', 'szóstym', 'siódmym', 'ósmym', 'dziewiątym', 'dziesiątym'];
    const ordinal = ordinals[exit] ?? `${exit}.`;
    verb = `Wjedź na rondo i zjedź ${ordinal} zjazdem`;
  }

  const street = step.name?.trim();
  const ref = step.ref?.trim();
  const streetLabel = street || ref || '';
  if (streetLabel && type !== 'arrive' && type !== 'depart') {
    return `${verb} w ${streetLabel}`;
  }
  return verb;
}

// ─── FIX #24: fetch z AbortController i timeoutem ───────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Główna funkcja tras ──────────────────────────────────────────────────────

export async function getRouteWithSteps(start: Coordinates, end: Coordinates): Promise<NavRoute> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson&steps=true&annotations=false`;

  let data: { routes?: { distance: number; duration: number; legs: { steps: OsrmStep[] }[]; geometry: { coordinates: [number, number][] } }[] };
  try {
    const res = await fetchWithTimeout(url);
    data = await res.json();
  } catch (err: unknown) {
    const msg = (err as Error).name === 'AbortError'
      ? 'Serwer tras nie odpowiedział na czas. Sprawdź połączenie.'
      : `Błąd pobierania trasy: ${(err as Error).message}`;
    throw new Error(msg);
  }

  if (!data.routes || data.routes.length === 0) {
    throw new Error('Brak dostępnej trasy dla podanego adresu.');
  }

  const route = data.routes[0];
  const polyline: Coordinates[] = route.geometry.coordinates.map(([lon, lat]) => ({ lat, lng: lon }));
  const rawSteps: OsrmStep[] = route.legs.flatMap(leg => leg.steps);

  const steps: NavStep[] = rawSteps.map(step => {
    const [lon, lat] = step.maneuver.location;
    return {
      instruction: buildInstruction(step),
      distanceToNext: step.distance,
      durationToNext: step.duration,
      streetName: step.name?.trim() || '',
      icon: lookupManeuver(MANEUVER_ICONS, step.maneuver.type, step.maneuver.modifier ?? '', '↑'),
      location: { lat, lng: lon },
      isArrival: step.maneuver.type === 'arrive',
      roundaboutExit: step.maneuver.exit,
    };
  });

  return { steps, totalDistance: route.distance, totalDuration: route.duration, polyline };
}

// ─── FIX #14: Nominatim z User-Agent i timeoutem ─────────────────────────────

export async function geocodeAddress(address: string): Promise<Coordinates> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

  let data: { lat: string; lon: string }[];
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept-Language': 'pl',
        'User-Agent': APP_USER_AGENT,
      },
    });
    data = await res.json();
  } catch (err: unknown) {
    const msg = (err as Error).name === 'AbortError'
      ? 'Geokodowanie nie odpowiedziało na czas. Sprawdź połączenie.'
      : `Błąd geokodowania: ${(err as Error).message}`;
    throw new Error(msg);
  }

  if (!data || data.length === 0) {
    throw new Error(`Nie znaleziono adresu: "${address}". Spróbuj podać pełniejszy adres.`);
  }

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
