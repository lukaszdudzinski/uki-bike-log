// src/hooks/useNavigation.ts
// Hook zarządzający stanem nawigacji turn-by-turn:
// watchPosition GPS, geofencing, komunikaty głosowe, reroutowanie

import { useState, useRef, useCallback, useEffect } from 'react';
import type { NavStep, NavRoute } from '../services/navigationService';
import { getRouteWithSteps, geocodeAddress } from '../services/navigationService';
import { haversineMeters, distanceFromSegmentMeters } from '../utils/geo';
import type { Coordinates } from '../utils/geo';

// ─── Stałe ───────────────────────────────────────────────────────────────────

const GEOFENCE_THRESHOLD_SLOW = 30;  // metry (< 50 km/h)
const GEOFENCE_THRESHOLD_FAST = 70;  // metry (>= 50 km/h)
const OFF_ROUTE_THRESHOLD = 150;     // metry od trasy → reroutuj
const OFF_ROUTE_SECONDS = 12;        // ile sekund poza trasą zanim reroutujemy
const ANNOUNCE_DISTANCE_FAR = 300;   // metry → pierwsze ogłoszenie
const ANNOUNCE_DISTANCE_NEAR = 80;   // metry → ogłoszenie bezpośrednie

// ─── Typy ────────────────────────────────────────────────────────────────────

export interface NavigationState {
  // Dane trasy
  route: NavRoute | null;
  currentStepIndex: number;
  currentStep: NavStep | null;
  nextStep: NavStep | null;

  // Odległości
  distanceToNextManeuver: number;
  totalRemainingDistance: number;
  totalRemainingDuration: number;

  // Pozycja
  userPosition: Coordinates | null;
  gpsAccuracy: number | null;

  // Status
  status: 'idle' | 'loading' | 'navigating' | 'rerouting' | 'arrived' | 'error';
  errorMessage: string | null;

  // Audio
  isMuted: boolean;
}

export interface NavigationControls {
  startNavigation: (destination: string) => Promise<void>;
  stopNavigation: () => void;
  toggleMute: () => void;
  initAudio: () => void; // musi być wywołane przez user gesture na iOS
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNavigation(): [NavigationState, NavigationControls] {
  const [state, setState] = useState<NavigationState>({
    route: null,
    currentStepIndex: 0,
    currentStep: null,
    nextStep: null,
    distanceToNextManeuver: 0,
    totalRemainingDistance: 0,
    totalRemainingDuration: 0,
    userPosition: null,
    gpsAccuracy: null,
    status: 'idle',
    errorMessage: null,
    isMuted: false,
  });

  // Refy – nie powodują re-renderu przy zmianie
  const watchIdRef = useRef<number | null>(null);
  const routeRef = useRef<NavRoute | null>(null);
  const currentStepRef = useRef<number>(0);
  const destinationRef = useRef<string>('');
  const isMutedRef = useRef<boolean>(false);
  const audioUnlockedRef = useRef<boolean>(false);

  // Flagi komunikatów głosowych (reset przy zmianie kroku)
  const announcedFarRef = useRef<boolean>(false);
  const announcedNearRef = useRef<boolean>(false);
  const lastSpokenRef = useRef<string>('');

  // Off-route detection
  const offRouteSinceRef = useRef<number | null>(null);
  const isReroutingRef = useRef<boolean>(false);

  // ─── Speech ────────────────────────────────────────────────────────────────

  const speak = useCallback((text: string) => {
    if (isMutedRef.current) return;
    if (!audioUnlockedRef.current) return;
    if (text === lastSpokenRef.current) return;
    if (!('speechSynthesis' in window)) return;

    lastSpokenRef.current = text;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = 1.05;
    utterance.volume = 1.0;

    // Wybierz głos polski jeśli dostępny
    const voices = window.speechSynthesis.getVoices();
    const plVoice = voices.find(v => v.lang.startsWith('pl'));
    if (plVoice) utterance.voice = plVoice;

    window.speechSynthesis.speak(utterance);
  }, []);

  // iOS wymaga user gesture przed speak() – wywołaj initAudio() przy tapnięciu
  const initAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    if (!('speechSynthesis' in window)) return;
    // Puste wypowiedź "odblokowuje" audio context na iOS
    const u = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(u);
    audioUnlockedRef.current = true;
  }, []);

  // iOS milknie po ~15 sek gdy ekran w tle – keepalive
  useEffect(() => {
    const interval = setInterval(() => {
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  // ─── Zaawansowanie do następnego kroku ────────────────────────────────────

  const advanceStep = useCallback(() => {
    const route = routeRef.current;
    if (!route) return;

    const nextIndex = currentStepRef.current + 1;
    currentStepRef.current = nextIndex;

    announcedFarRef.current = false;
    announcedNearRef.current = false;
    lastSpokenRef.current = '';

    const nextStep = route.steps[nextIndex] ?? null;
    const afterNext = route.steps[nextIndex + 1] ?? null;

    // Oblicz pozostały dystans i czas
    const remainingDist = route.steps
      .slice(nextIndex)
      .reduce((sum, s) => sum + s.distanceToNext, 0);
    const remainingDur = route.steps
      .slice(nextIndex)
      .reduce((sum, s) => sum + s.durationToNext, 0);

    setState(prev => ({
      ...prev,
      currentStepIndex: nextIndex,
      currentStep: nextStep,
      nextStep: afterNext,
      distanceToNextManeuver: nextStep?.distanceToNext ?? 0,
      totalRemainingDistance: remainingDist,
      totalRemainingDuration: remainingDur,
      status: nextStep?.isArrival ? 'arrived' : 'navigating',
    }));

    if (nextStep?.isArrival) {
      speak('Dotarłeś do celu!');
      stopWatching();
    } else if (nextStep) {
      speak(nextStep.instruction);
    }
  }, [speak]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reroutowanie ──────────────────────────────────────────────────────────

  const rerouteFromPosition = useCallback(async (pos: Coordinates) => {
    if (isReroutingRef.current) return;
    isReroutingRef.current = true;

    setState(prev => ({ ...prev, status: 'rerouting' }));
    speak('Przeliczam trasę');

    try {
      const dest = await geocodeAddress(destinationRef.current);
      const newRoute = await getRouteWithSteps(pos, dest);

      routeRef.current = newRoute;
      currentStepRef.current = 0;
      announcedFarRef.current = false;
      announcedNearRef.current = false;

      setState(prev => ({
        ...prev,
        route: newRoute,
        currentStepIndex: 0,
        currentStep: newRoute.steps[0] ?? null,
        nextStep: newRoute.steps[1] ?? null,
        totalRemainingDistance: newRoute.totalDistance,
        totalRemainingDuration: newRoute.totalDuration,
        status: 'navigating',
      }));

      speak('Trasa przeliczona');
    } catch {
      speak('Nie udało się przeliczyć trasy');
      setState(prev => ({ ...prev, status: 'navigating' }));
    } finally {
      isReroutingRef.current = false;
      offRouteSinceRef.current = null;
    }
  }, [speak]);

  // ─── GPS watchPosition ─────────────────────────────────────────────────────

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const route = routeRef.current;
        if (!route) return;

        const userPos: Coordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const speed = pos.coords.speed ?? 0; // m/s

        setState(prev => ({
          ...prev,
          userPosition: userPos,
          gpsAccuracy: pos.coords.accuracy,
        }));

        const stepIdx = currentStepRef.current;
        const step = route.steps[stepIdx];
        if (!step) return;

        // 1. Dystans do punktu manewru
        const distToManeuver = haversineMeters(userPos, step.location);

        // 2. Sprawdź off-route (dystans od aktualnego segmentu trasy)
        if (route.polyline.length > 1 && !isReroutingRef.current) {
          let minSegDist = Infinity;
          for (let i = 0; i < route.polyline.length - 1; i++) {
            const d = distanceFromSegmentMeters(userPos, route.polyline[i], route.polyline[i + 1]);
            if (d < minSegDist) minSegDist = d;
          }

          if (minSegDist > OFF_ROUTE_THRESHOLD) {
            if (offRouteSinceRef.current === null) {
              offRouteSinceRef.current = Date.now();
            } else if (Date.now() - offRouteSinceRef.current > OFF_ROUTE_SECONDS * 1000) {
              rerouteFromPosition(userPos);
              return;
            }
          } else {
            offRouteSinceRef.current = null;
          }
        }

        // 3. Komunikaty głosowe (progowe)
        if (distToManeuver <= ANNOUNCE_DISTANCE_FAR && !announcedFarRef.current && !step.isArrival) {
          const distText = distToManeuver >= 250 ? 'za 300 metrów' : 'za 100 metrów';
          speak(`${distText} ${step.instruction}`);
          announcedFarRef.current = true;
        }

        if (distToManeuver <= ANNOUNCE_DISTANCE_NEAR && !announcedNearRef.current) {
          speak(step.isArrival ? 'Dotarłeś do celu!' : step.instruction);
          announcedNearRef.current = true;
        }

        // 4. Geofencing – minęliśmy punkt skrętu
        const threshold = speed > 13 ? GEOFENCE_THRESHOLD_FAST : GEOFENCE_THRESHOLD_SLOW;
        if (distToManeuver <= threshold) {
          advanceStep();
          return;
        }

        // 5. Oblicz pozostałości i zaktualizuj stan
        const remainingDist = route.steps
          .slice(stepIdx)
          .reduce((sum, s, i) => sum + (i === 0 ? distToManeuver : s.distanceToNext), 0);
        const remainingDur = route.steps
          .slice(stepIdx)
          .reduce((sum, s) => sum + s.durationToNext, 0);

        setState(prev => ({
          ...prev,
          distanceToNextManeuver: distToManeuver,
          totalRemainingDistance: remainingDist,
          totalRemainingDuration: remainingDur,
        }));
      },
      (err) => {
        console.error('[Navigation] GPS error:', err);
        setState(prev => ({
          ...prev,
          errorMessage: 'Błąd GPS: ' + err.message,
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10_000,
      }
    );
  }, [advanceStep, rerouteFromPosition, speak]);

  // ─── Start nawigacji ───────────────────────────────────────────────────────

  const startNavigation = useCallback(async (destination: string) => {
    stopWatching();
    destinationRef.current = destination;

    setState(prev => ({
      ...prev,
      status: 'loading',
      errorMessage: null,
      currentStepIndex: 0,
    }));

    try {
      // 1. Pobierz aktualną pozycję
      const startPos = await new Promise<Coordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 10_000 }
        );
      });

      // 2. Geokoduj cel
      const endPos = await geocodeAddress(destination);

      // 3. Pobierz trasę z krokami
      const route = await getRouteWithSteps(startPos, endPos);

      routeRef.current = route;
      currentStepRef.current = 0;
      announcedFarRef.current = false;
      announcedNearRef.current = false;

      setState(prev => ({
        ...prev,
        route,
        currentStepIndex: 0,
        currentStep: route.steps[0] ?? null,
        nextStep: route.steps[1] ?? null,
        totalRemainingDistance: route.totalDistance,
        totalRemainingDuration: route.totalDuration,
        userPosition: startPos,
        status: 'navigating',
      }));

      // 4. Ogłoś pierwszy krok
      if (route.steps[0]) {
        speak(route.steps[0].instruction);
      }

      // 5. Uruchom śledzenie GPS
      startWatching();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nieznany błąd';
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: msg,
      }));
    }
  }, [stopWatching, startWatching, speak]);

  // ─── Stop nawigacji ────────────────────────────────────────────────────────

  const stopNavigation = useCallback(() => {
    stopWatching();
    window.speechSynthesis?.cancel();
    routeRef.current = null;
    currentStepRef.current = 0;
    setState({
      route: null,
      currentStepIndex: 0,
      currentStep: null,
      nextStep: null,
      distanceToNextManeuver: 0,
      totalRemainingDistance: 0,
      totalRemainingDuration: 0,
      userPosition: null,
      gpsAccuracy: null,
      status: 'idle',
      errorMessage: null,
      isMuted: false,
    });
  }, [stopWatching]);

  // ─── Toggle mute ───────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    if (isMutedRef.current) {
      window.speechSynthesis?.cancel();
    }
  }, []);

  // Cleanup przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      stopWatching();
      window.speechSynthesis?.cancel();
    };
  }, [stopWatching]);

  return [state, { startNavigation, stopNavigation, toggleMute, initAudio }];
}
