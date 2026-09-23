// src/pages/NavigationPage.tsx
// Pełnoekranowy widok nawigacji turn-by-turn
// Wzorzec: identyczny jak DrivingMode (position: fixed, z-index: 9999)

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/navigation.css';
import { useNavigation } from '../hooks/useNavigation';
import { formatDistance, formatDuration } from '../utils/geo';
import type { Coordinates } from '../utils/geo';

// ─── Subkomponent: auto-centrowanie mapy na pozycji użytkownika ───────────────

function MapController({ position }: { position: Coordinates | null }) {
  const map = useMap();
  const prevPos = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (!position) return;
    if (
      prevPos.current &&
      Math.abs(position.lat - prevPos.current.lat) < 0.00001 &&
      Math.abs(position.lng - prevPos.current.lng) < 0.00001
    ) return;
    prevPos.current = position;
    map.setView([position.lat, position.lng], 16, { animate: true, duration: 0.5 });
  }, [position, map]);

  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NavigationPageProps {
  initialDestination?: string; // opcjonalny pre-fill
  onExit: () => void;
}

// ─── Komponent główny ─────────────────────────────────────────────────────────

export default function NavigationPage({ initialDestination = '', onExit }: NavigationPageProps) {
  const [navState, navControls] = useNavigation();
  const [inputValue, setInputValue] = useState(initialDestination);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Inicjalizacja audio przy pierwszym tapnięciu (iOS wymaga user gesture)
  const handleInitAudio = () => {
    navControls.initAudio();
    setAudioInitialized(true);
  };

  // Automatycznie startuj nawigację jeśli podano cel z zewnątrz
  useEffect(() => {
    if (initialDestination && initialDestination.trim()) {
      setInputValue(initialDestination);
    }
  }, [initialDestination]);

  const handleStart = () => {
    if (!inputValue.trim()) return;
    handleInitAudio();
    navControls.startNavigation(inputValue.trim());
  };

  const handleExit = () => {
    navControls.stopNavigation();
    onExit();
  };

  const isNavigating = navState.status === 'navigating' || navState.status === 'rerouting' || navState.status === 'arrived';
  const isLoading = navState.status === 'loading';

  // ─── Widok: formularz wpisania celu ─────────────────────────────────────────
  if (!isNavigating && !isLoading) {
    return (
      <div className="nav-container">
        <div className="nav-header">
          <span className="nav-header-title">🧭 Nawigacja</span>
          <button className="nav-btn nav-btn-close" onClick={handleExit}>✕</button>
        </div>

        <div className="nav-input-screen">
          <div className="nav-input-label">Dokąd jedziemy? 🏍️</div>

          <input
            className="nav-input-field"
            type="text"
            placeholder="np. Wawel, Kraków lub pełny adres"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            autoFocus
          />

          {navState.errorMessage && (
            <div className="nav-error">⚠️ {navState.errorMessage}</div>
          )}

          <button
            className="nav-start-btn"
            onClick={handleStart}
            disabled={!inputValue.trim()}
          >
            🧭 Wyznacz trasę i nawiguj
          </button>

          {!audioInitialized && (
            <div className="nav-audio-hint">
              💡 Dotknij „Wyznacz trasę", aby odblokować komunikaty głosowe na iOS
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Widok: ładowanie trasy ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="nav-container">
        <div className="nav-header">
          <span className="nav-header-title">Wyznaczam trasę...</span>
          <button className="nav-btn nav-btn-close" onClick={handleExit}>✕</button>
        </div>
        <div className="nav-loading">
          <div className="nav-spinner" />
          <span>Pobieram trasę i inicjuję GPS...</span>
        </div>
      </div>
    );
  }

  // ─── Widok: aktywna nawigacja ────────────────────────────────────────────────
  const { currentStep, nextStep, distanceToNextManeuver, totalRemainingDistance, totalRemainingDuration, route, userPosition, gpsAccuracy, status, isMuted } = navState;

  const bannerClass = [
    'nav-maneuver-banner',
    status === 'rerouting' ? 'rerouting' : '',
    status === 'arrived' ? 'arrived' : '',
  ].filter(Boolean).join(' ');

  const defaultCenter: [number, number] = userPosition
    ? [userPosition.lat, userPosition.lng]
    : [52.2297, 21.0122]; // Warszawa fallback

  return (
    <div className="nav-container">

      {/* Nagłówek */}
      <div className="nav-header">
        <span className="nav-header-title">
          {status === 'rerouting' ? '🔄 Przeliczam trasę...' : `🧭 ${inputValue}`}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {gpsAccuracy !== null && (
            <span className={`nav-header-gps ${gpsAccuracy > 20 ? 'weak' : ''}`}>
              📡 {Math.round(gpsAccuracy)}m
            </span>
          )}
          <button className="nav-btn nav-btn-close" onClick={handleExit}>✕</button>
        </div>
      </div>

      {/* Baner manewru */}
      <div className={bannerClass}>
        <div className="nav-maneuver-icon">
          {status === 'arrived' ? '🏆' : status === 'rerouting' ? '🔄' : (currentStep?.icon ?? '↑')}
        </div>
        <div className="nav-maneuver-text-block">
          {status === 'arrived' ? (
            <div className="nav-maneuver-instruction">Dotarłeś do celu!</div>
          ) : status === 'rerouting' ? (
            <div className="nav-maneuver-instruction">Przeliczam nową trasę...</div>
          ) : (
            <>
              <div className="nav-maneuver-distance">
                {formatDistance(distanceToNextManeuver)}
              </div>
              <div className="nav-maneuver-instruction">
                {currentStep?.instruction ?? '...'}
              </div>
              {currentStep?.streetName && (
                <div className="nav-maneuver-street">{currentStep.streetName}</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mapa Leaflet */}
      <div className="nav-map-wrapper">
        <MapContainer
          center={defaultCenter}
          zoom={16}
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapController position={userPosition} />

          {/* Trasa */}
          {route && (
            <Polyline
              positions={route.polyline.map(p => [p.lat, p.lng] as [number, number])}
              color="var(--color-primary, #c9a84c)"
              weight={5}
              opacity={0.85}
            />
          )}

          {/* Pozycja użytkownika */}
          {userPosition && (
            <>
              <CircleMarker
                center={[userPosition.lat, userPosition.lng]}
                radius={10}
                fillColor="#00aaff"
                color="#fff"
                weight={3}
                fillOpacity={1}
              />
              {/* Halo dokładności GPS */}
              {gpsAccuracy && gpsAccuracy < 100 && (
                <Circle
                  center={[userPosition.lat, userPosition.lng]}
                  radius={gpsAccuracy}
                  fillColor="#00aaff"
                  fillOpacity={0.1}
                  color="#00aaff"
                  weight={1}
                  opacity={0.3}
                />
              )}
            </>
          )}
        </MapContainer>
      </div>

      {/* Dolny pasek */}
      <div className="nav-footer">
        <div className="nav-footer-row">
          <div>
            <div className="nav-footer-stat">{(totalRemainingDistance / 1000).toFixed(1).replace('.', ',')} km</div>
            <div className="nav-footer-stat-label">Pozostało</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="nav-footer-stat">{formatDuration(totalRemainingDuration)}</div>
            <div className="nav-footer-stat-label">Szac. czas</div>
          </div>
          <button
            className={`nav-btn nav-btn-mute ${isMuted ? 'muted' : ''}`}
            onClick={navControls.toggleMute}
            title={isMuted ? 'Włącz głos' : 'Wycisz'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>

        {nextStep && !nextStep.isArrival && (
          <div className="nav-next-step">
            Następnie: <strong>{nextStep.icon} {nextStep.instruction}</strong>
          </div>
        )}
      </div>

    </div>
  );
}
