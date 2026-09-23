// src/services/navigationService.ts
// Serwis nawigacji turn-by-turn oparty na OSRM + Nominatim (bez nowych zależności)

import type { Coordinates } from '../utils/geo';

// ─── Typy OSRM ────────────────────────────────────────────────────────────────

interface OsrmManeuver {
  type: string;        // 'turn', 'depart', 'arrive', 'roundabout', 'fork', 'merge', ...
  modifier?: string;   // 'left', 'right', 'slight left', 'sharp right', 'straight', ...
  location: [number, number]; // [lon, lat] !
  exit?: number;       // numer wyjścia z ronda
  bearing_after?: number;
}

interface OsrmStep {
  maneuver: OsrmManeuver;
  distance: number;   // metry do następnego manewru
  duration: number;   // sekundy
  name: string;       // nazwa ulicy
  ref?: string;       // numer drogi (np. "A1", "S7")
}

interface OsrmLeg {
  steps: OsrmStep[];
  distance: number;
  duration: number;
}

interface OsrmRoute {
  distance: number;
  duration: number;
  legs: OsrmLeg[];
  geometry: {
    coordinates: [number, number][]; // [lon, lat] !
  };
}

// ─── Typ wewnętrzny kroku nawigacji ───────────────────────────────────────────

export interface NavStep {
  instruction: string;         // po polsku, np. "Skręć w lewo w ulicę Marszałkowską"
  distanceToNext: number;      // metry do następnego manewru
  durationToNext: number;      // sekundy
  streetName: string;          // nazwa następnej ulicy
  icon: string;                // emoji kierunku
  location: Coordinates;       // GPS punktu manewru (LAT, LNG)
  isArrival: boolean;
  roundaboutExit?: number;
}

export interface NavRoute {
  steps: NavStep[];
  totalDistance: number;   // metry
  totalDuration: number;   // sekundy
  polyline: Coordinates[]; // punkty do narysowania na mapie
}

// ─── Słownik manewrów → Polski ────────────────────────────────────────────────

const MANEUVER_VERBS: Record<string, Record<string, string>> = {
  'turn': {
    'left':         'Skręć w lewo',
    'right':        'Skręć w prawo',
    'slight left':  'Trzymaj się lewej strony',
    'slight right': 'Trzymaj się prawej strony',
    'sharp left':   'Skręć ostro w lewo',
    'sharp right':  'Skręć ostro w prawo',
    'uturn':        'Zawróć',
    'straight':     'Jedź prosto',
    '':             'Jedź prosto',
  },
  'new name': {
    'left':         'Kontynuuj w lewo',
    'right':        'Kontynuuj w prawo',
    'straight':     'Kontynuuj prosto',
    '':             'Kontynuuj',
  },
  'depart': {
    '':             'Ruszaj!',
    'left':         'Ruszaj i trzymaj się lewej',
    'right':        'Ruszaj i trzymaj się prawej',
  },
  'arrive': {
    '':             'Dotarłeś do celu!',
    'left':         'Cel jest po lewej stronie',
    'right':        'Cel jest po prawej stronie',
  },
  'merge': {
    'left':         'Włącz się od lewej',
    'right':        'Włącz się od prawej',
    'slight left':  'Włącz się lekko od lewej',
    'slight right': 'Włącz się lekko od prawej',
    '':             'Włącz się do ruchu',
  },
  'ramp': {
    'left':         'Zjedź zjazdem w lewo',
    'right':        'Zjedź zjazdem w prawo',
    'slight left':  'Trzymaj się lewego zjazdu',
    'slight right': 'Trzymaj się prawego zjazdu',
    '':             'Zjedź zjazdem',
  },
  'fork': {
    'left':         'Na rozwidleniu jedź w lewo',
    'right':        'Na rozwidleniu jedź w prawo',
    'slight left':  'Na rozwidleniu trzymaj się lewej',
    'slight right': 'Na rozwidleniu trzymaj się prawej',
    '':             'Na rozwidleniu jedź prosto',
  },
  'end of road': {
    'left':         'Na końcu drogi skręć w lewo',
    'right':        'Na końcu drogi skręć w prawo',
    '':             'Na końcu drogi kontynuuj',
  },
  'continue': {
    'straight':     'Kontynuuj jazdę prosto',
    'left':         'Kontynuuj w lewo',
    'right':        'Kontynuuj w prawo',
    '':             'Kontynuuj',
  },
  'roundabout': {
    '':             'Wjedź na rondo',
  },
  'exit roundabout': {
    '':             'Zjedź z ronda',
  },
  'rotary': {
    '':             'Wjedź na rondo',
  },
  'exit rotary': {
    '':             'Zjedź z ronda',
  },
  'notification': {
    '':             'Uwaga',
  },
};

const MANEUVER_ICONS: Record<string, Record<string, string>> = {
  'turn': {
    'left': '↰', 'right': '↱', 'slight left': '↖', 'slight right': '↗',
    'sharp left': '↙', 'sharp right': '↘', 'uturn': '↩', '': '↑', 'straight': '↑',
  },
  'depart':          { '': '🏁' },
  'arrive':          { '': '🏆' },
  'merge':           { '': '⬆', 'left': '↖', 'right': '↗' },
  'ramp':            { '': '↗', 'left': '↖', 'right': '↗' },
  'fork':            { '': '↑', 'left': '↖', 'right': '↗' },
  'end of road':     { '': '↑', 'left': '↰', 'right': '↱' },
  'continue':        { '': '↑', 'straight': '↑', 'left': '↰', 'right': '↱' },
  'roundabout':      { '': '🔄' },
  'exit roundabout': { '': '↱' },
  'rotary':          { '': '🔄' },
  'exit rotary':     { '': '↱' },
  'new name':        { '': '↑' },
};

function lookupManeuver(map: Record<string, Record<string, string>>, type: string, modifier: string, fallback: string): string {
  const byType = map[type] ?? map['continue'] ?? {};
  return byType[modifier] ?? byType[''] ?? fallback;
}

function buildInstruction(step: OsrmStep): string {
  const { type, modifier = '', exit } = step.maneuver;
  let verb = lookupManeuver(MANEUVER_VERBS, type, modifier, 'Kontynuuj');

  // Ronda z numerem wyjścia
  if ((type === 'roundabout' || type === 'rotary') && exit) {
    const ordinals = ['', 'pierwszym', 'drugim', 'trzecim', 'czwartym', 'piątym', 'szóstym'];
    const ordinal = ordinals[exit] ?? `${exit}.`;
    verb = `Wjedź na rondo i zjedź ${ordinal} zjazdem`;
  }

  // Dodaj nazwę ulicy (jeśli istnieje i to nie przyjazd do celu)
  const street = step.name?.trim();
  const ref = step.ref?.trim();
  const streetLabel = street || ref || '';
  if (streetLabel && type !== 'arrive' && type !== 'depart') {
    return `${verb} w ${streetLabel}`;
  }

  return verb;
}

// ─── Główna funkcja pobierająca trasę z krokami ───────────────────────────────

export async function getRouteWithSteps(
  start: Coordinates,
  end: Coordinates
): Promise<NavRoute> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson&steps=true&annotations=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('Brak dostępnej trasy dla podanego adresu.');
  }

  const route: OsrmRoute = data.routes[0];

  // Polyline: OSRM zwraca [lon, lat], zamieniamy na {lat, lng}
  const polyline: Coordinates[] = route.geometry.coordinates.map(
    ([lon, lat]) => ({ lat, lng: lon })
  );

  // Spłaszczamy steps ze wszystkich legs
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

  return {
    steps,
    totalDistance: route.distance,
    totalDuration: route.duration,
    polyline,
  };
}

// ─── Geokodowanie adresu (Nominatim) ─────────────────────────────────────────

export async function geocodeAddress(address: string): Promise<Coordinates> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'pl' } });
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const data = await res.json();
  if (!data || data.length === 0) {
    throw new Error(`Nie znaleziono adresu: "${address}"`);
  }

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}
