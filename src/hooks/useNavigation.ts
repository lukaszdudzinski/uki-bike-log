// src/hooks/useNavigation.ts — v2 (po code review)
// FIX #1: poprawione deps w useCallback
// FIX #2: AbortController + mounted ref zapobiega setState po unmount
// FIX #3: windowed polyline search przez distanceFromPolylineMeters
// FIX #5: voiceschanged listener, poprawny wybór głosu PL
// FIX #6: setInterval keepalive tylko gdy navigating
// FIX #7: advancedGuardRef - debounce geofencingu
// FIX #8: poprawiony tekst ogłoszenia "za 300 metrów"
// FIX #12: throttle setState co 500ms zamiast co GPS fix
// FIX #13: jedna pętla zamiast dwóch reduce
// FIX #18: Wake Lock API
// FIX #23: isMuted zachowany między sesjami

import { useState, useRef, useCallback, useEffect } from 'react';
import type { NavStep, NavRoute } from '../services/navigationService';
import { getRouteWithSteps, geocodeAddress } from '../services/navigationService';
import { haversineMeters, distanceFromPolylineMeters } from '../utils/geo';
import type { Coordinates } from '../utils/geo';

const GEOFENCE_THRESHOLD_SLOW = 30;
const GEOFENCE_THRESHOLD_FAST = 70;
const OFF_ROUTE_THRESHOLD = 150;
const OFF_ROUTE_SECONDS = 12;
const ANNOUNCE_DISTANCE_FAR = 300;
const ANNOUNCE_DISTANCE_NEAR = 80;
const STATE_THROTTLE_MS = 500; // FIX #12: throttle re-renderów

export interface NavigationState {
  route: NavRoute | null;
  currentStepIndex: number;
  currentStep: NavStep | null;
  nextStep: NavStep | null;
  distanceToNextManeuver: number;
  totalRemainingDistance: number;
  totalRemainingDuration: number;
  userPosition: Coordinates | null;
  gpsAccuracy: number | null;
  status: 'idle' | 'loading' | 'navigating' | 'rerouting' | 'arrived' | 'error';
  errorMessage: string | null;
  isMuted: boolean;
}

export interface NavigationControls {
  startNavigation: (destination: string) => Promise<void>;
  stopNavigation: () => void;
  toggleMute: () => void;
  initAudio: () => void;
}

export function useNavigation(): [NavigationState, NavigationControls] {
  const [state, setState] = useState<NavigationState>({
    route: null, currentStepIndex: 0, currentStep: null, nextStep: null,
    distanceToNextManeuver: 0, totalRemainingDistance: 0, totalRemainingDuration: 0,
    userPosition: null, gpsAccuracy: null, status: 'idle', errorMessage: null, isMuted: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const routeRef = useRef<NavRoute | null>(null);
  const currentStepRef = useRef<number>(0);
  const destinationRef = useRef<string>('');
  const isMutedRef = useRef<boolean>(false);
  const audioUnlockedRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);          // FIX #2
  const abortControllerRef = useRef<AbortController | null>(null); // FIX #2
  const wakeLockRef = useRef<WakeLockSentinel | null>(null); // FIX #18

  // FIX #7: guard zapobiega wielokrotnemu wywołaniu advanceStep
  const advancedGuardRef = useRef<boolean>(false);

  // FIX #12: throttle setState dla pozycji GPS
  const lastStateUpdateRef = useRef<number>(0);

  // FIX #3: śledzenie ostatnio poznanego indeksu segmentu (windowed search)
  const polylineHintRef = useRef<number>(0);

  const announcedFarRef = useRef<boolean>(false);
  const announcedNearRef = useRef<boolean>(false);
  const lastSpokenRef = useRef<string>('');
  const offRouteSinceRef = useRef<number | null>(null);
  const isReroutingRef = useRef<boolean>(false);

  // FIX #5: voiceschanged – przechowuje listę głosów asynchronicznie
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
  }, []);

  // FIX #18: Wake Lock – aktywuj podczas nawigacji
  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
    } catch { /* iOS może odrzucić – ignorujemy */ }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // ─── Speech ────────────────────────────────────────────────────────────────

  const speak = useCallback((text: string) => {
    if (isMutedRef.current || !audioUnlockedRef.current || !mountedRef.current) return;
    if (text === lastSpokenRef.current) return;
    if (!('speechSynthesis' in window)) return;
    lastSpokenRef.current = text;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    utterance.rate = 1.05;
    utterance.volume = 1.0;
    const plVoice = voicesRef.current.find(v => v.lang.startsWith('pl')); // FIX #5
    if (plVoice) utterance.voice = plVoice;
    window.speechSynthesis.speak(utterance);
  }, []);

  const initAudio = useCallback(() => {
    if (audioUnlockedRef.current || !('speechSynthesis' in window)) return;
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    audioUnlockedRef.current = true;
  }, []);

  // FIX #6: keepalive SpeechSynthesis TYLKO gdy status nawigowania
  useEffect(() => {
    if (state.status !== 'navigating') return;
    const interval = setInterval(() => {
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [state.status]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ─── Advance Step ─────────────────────────────────────────────────────────

  // FIX #1: dodano stopWatching do tablicy deps
  const advanceStep = useCallback(() => {
    const route = routeRef.current;
    if (!route || !mountedRef.current) return;

    const nextIndex = currentStepRef.current + 1;
    currentStepRef.current = nextIndex;
    advancedGuardRef.current = false; // FIX #7: reset guard po awansie
    announcedFarRef.current = false;
    announcedNearRef.current = false;
    lastSpokenRef.current = '';

    const nextStep = route.steps[nextIndex] ?? null;
    const afterNext = route.steps[nextIndex + 1] ?? null;

    // FIX #13: jedna pętla zamiast dwóch reduce
    let remainingDist = 0, remainingDur = 0;
    for (let i = nextIndex; i < route.steps.length; i++) {
      remainingDist += route.steps[i].distanceToNext;
      remainingDur += route.steps[i].durationToNext;
    }

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

    if (nextStep?.isArrival) { speak('Dotarłeś do celu!'); stopWatching(); releaseWakeLock(); }
    else if (nextStep) speak(nextStep.instruction);
  }, [speak, stopWatching, releaseWakeLock]);

  // ─── Rerouting ────────────────────────────────────────────────────────────

  // FIX #2: abort controller + mounted check
  const rerouteFromPosition = useCallback(async (pos: Coordinates) => {
    if (isReroutingRef.current || !mountedRef.current) return;
    isReroutingRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, status: 'rerouting' }));
    speak('Przeliczam trasę');

    try {
      const dest = await geocodeAddress(destinationRef.current);
      if (!mountedRef.current) return;
      const newRoute = await getRouteWithSteps(pos, dest);
      if (!mountedRef.current) return;

      routeRef.current = newRoute;
      currentStepRef.current = 0;
      polylineHintRef.current = 0;
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
      if (!mountedRef.current) return;
      speak('Nie udało się przeliczyć trasy');
      setState(prev => ({ ...prev, status: 'navigating' }));
    } finally {
      isReroutingRef.current = false;
      offRouteSinceRef.current = null;
    }
  }, [speak]);

  // ─── GPS watchPosition ────────────────────────────────────────────────────

  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const route = routeRef.current;
        if (!route || !mountedRef.current) return;

        const userPos: Coordinates = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const speed = pos.coords.speed ?? 0;

        // Aktualizuj pozycję zawsze (lekkie setState)
        setState(prev => ({ ...prev, userPosition: userPos, gpsAccuracy: pos.coords.accuracy }));

        const stepIdx = currentStepRef.current;
        const step = route.steps[stepIdx];
        if (!step) return;

        const distToManeuver = haversineMeters(userPos, step.location);

        // FIX #3: windowed off-route detection
        if (route.polyline.length > 1 && !isReroutingRef.current) {
          const { distance: minSegDist, nearestIndex } = distanceFromPolylineMeters(
            userPos, route.polyline, polylineHintRef.current
          );
          polylineHintRef.current = nearestIndex; // zaktualizuj hint

          if (minSegDist > OFF_ROUTE_THRESHOLD) {
            if (offRouteSinceRef.current === null) offRouteSinceRef.current = Date.now();
            else if (Date.now() - offRouteSinceRef.current > OFF_ROUTE_SECONDS * 1000) {
              rerouteFromPosition(userPos);
              return;
            }
          } else {
            offRouteSinceRef.current = null;
          }
        }

        // FIX #8: poprawiony tekst ogłoszenia głosowego
        if (distToManeuver <= ANNOUNCE_DISTANCE_FAR && !announcedFarRef.current && !step.isArrival) {
          speak(`Za 300 metrów ${step.instruction}`);
          announcedFarRef.current = true;
        }
        if (distToManeuver <= ANNOUNCE_DISTANCE_NEAR && !announcedNearRef.current) {
          speak(step.isArrival ? 'Dotarłeś do celu!' : step.instruction);
          announcedNearRef.current = true;
        }

        // FIX #7: geofencing z guard'em przed wielokrotnym wywołaniem
        const threshold = speed > 13 ? GEOFENCE_THRESHOLD_FAST : GEOFENCE_THRESHOLD_SLOW;
        if (distToManeuver <= threshold && !advancedGuardRef.current) {
          advancedGuardRef.current = true;
          advanceStep();
          return;
        }

        // FIX #12: throttle setState dla statystyk (max raz na 500ms)
        const now = Date.now();
        if (now - lastStateUpdateRef.current < STATE_THROTTLE_MS) return;
        lastStateUpdateRef.current = now;

        // FIX #13: jedna pętla
        let remainingDist = distToManeuver, remainingDur = 0;
        for (let i = stepIdx; i < route.steps.length; i++) {
          if (i > stepIdx) remainingDist += route.steps[i].distanceToNext;
          remainingDur += route.steps[i].durationToNext;
        }

        setState(prev => ({
          ...prev,
          distanceToNextManeuver: distToManeuver,
          totalRemainingDistance: remainingDist,
          totalRemainingDuration: remainingDur,
        }));
      },
      (err) => {
        if (!mountedRef.current) return;
        console.error('[Navigation] GPS error:', err);
        setState(prev => ({ ...prev, errorMessage: 'Błąd GPS: ' + err.message }));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
    );
  }, [advanceStep, rerouteFromPosition, speak]);

  // ─── Start nawigacji ──────────────────────────────────────────────────────

  const startNavigation = useCallback(async (destination: string) => {
    stopWatching();
    abortControllerRef.current?.abort();
    destinationRef.current = destination;
    polylineHintRef.current = 0;

    setState(prev => ({ ...prev, status: 'loading', errorMessage: null, currentStepIndex: 0 }));

    try {
      const startPos = await new Promise<Coordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 10_000 }
        );
      });

      if (!mountedRef.current) return;
      const endPos = await geocodeAddress(destination);
      if (!mountedRef.current) return;
      const route = await getRouteWithSteps(startPos, endPos);
      if (!mountedRef.current) return;

      routeRef.current = route;
      currentStepRef.current = 0;
      announcedFarRef.current = false;
      announcedNearRef.current = false;

      setState(prev => ({
        ...prev,
        route, currentStepIndex: 0,
        currentStep: route.steps[0] ?? null,
        nextStep: route.steps[1] ?? null,
        totalRemainingDistance: route.totalDistance,
        totalRemainingDuration: route.totalDuration,
        userPosition: startPos, status: 'navigating',
      }));

      if (route.steps[0]) speak(route.steps[0].instruction);
      startWatching();
      acquireWakeLock();
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, status: 'error', errorMessage: (err as Error).message }));
    }
  }, [stopWatching, startWatching, speak, acquireWakeLock]);

  // ─── Stop nawigacji ────────────────────────────────────────────────────────

  // FIX #23: zachowaj isMuted między sesjami
  const stopNavigation = useCallback(() => {
    stopWatching();
    abortControllerRef.current?.abort();
    window.speechSynthesis?.cancel();
    releaseWakeLock();
    routeRef.current = null;
    currentStepRef.current = 0;
    setState(prev => ({
      route: null, currentStepIndex: 0, currentStep: null, nextStep: null,
      distanceToNextManeuver: 0, totalRemainingDistance: 0, totalRemainingDuration: 0,
      userPosition: null, gpsAccuracy: null, status: 'idle', errorMessage: null,
      isMuted: prev.isMuted, // FIX #23: zachowaj wyciszenie
    }));
  }, [stopWatching, releaseWakeLock]);

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    if (isMutedRef.current) window.speechSynthesis?.cancel();
  }, []);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopWatching();
      abortControllerRef.current?.abort();
      window.speechSynthesis?.cancel();
      releaseWakeLock();
    };
  }, [stopWatching, releaseWakeLock]);

  return [state, { startNavigation, stopNavigation, toggleMute, initAudio }];
}
