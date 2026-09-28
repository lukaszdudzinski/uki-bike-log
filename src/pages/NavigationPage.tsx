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
import { storage } from '../services/storage';

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
    const allRoutes = storage.getRoutes();
    const homeRoute = allRoutes.find(r => r.category === 'home');
    const workRoute = allRoutes.find(r => r.category === 'work');
    const favorites = allRoutes.filter(r => r.category === 'favorite');
    const history = storage.getRouteHistory().slice(0, 3);

    const handleSelectDestination = (dest: string) => {
      setInputValue(dest);
      handleInitAudio();
      navControls.startNavigation(dest);
    };

    return (
      <div className="nav-container">
        <div className="nav-header">
          <span className="nav-header-title">🧭 Nawigacja</span>
          <button className="nav-btn nav-btn-close" onClick={handleExit}>✕</button>
        </div>

        <div className="nav-input-screen" style={{ overflowY: 'auto', justifyContent: 'flex-start', paddingTop: '20px' }}>
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

          {/* Szybki wybór: Dom, Praca, Ulubione */}
          {(homeRoute || workRoute || favorites.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Szybkie cele
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {homeRoute && (
                  <button
                    onClick={() => handleSelectDestination(homeRoute.address)}
                    style={{
                      padding: '8px 12px', background: 'rgba(76,175,80,0.15)', border: '1px solid #4caf50',
                      borderRadius: '8px', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <span>🏠</span> <strong>Dom</strong>
                  </button>
                )}
                {workRoute && (
                  <button
                    onClick={() => handleSelectDestination(workRoute.address)}
                    style={{
                      padding: '8px 12px', background: 'rgba(33,150,243,0.15)', border: '1px solid #2196f3',
                      borderRadius: '8px', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <span>💼</span> <strong>Praca</strong>
                  </button>
                )}
                {favorites.map(fav => (
                  <button
                    key={fav.id}
                    onClick={() => handleSelectDestination(fav.address)}
                    style={{
                      padding: '8px 12px', background: 'rgba(255,152,0,0.15)', border: '1px solid #ff9800',
                      borderRadius: '8px', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <span>⭐</span> <strong>{fav.name}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ostatnie przejazdy */}
          {history.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ostatnie z historii
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {history.map(h => (
                  <div
                    key={h.id}
                    onClick={() => handleSelectDestination(h.destinationAddress)}
                    style={{
                      padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      🕒 {h.destinationAddress}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, flexShrink: 0, marginLeft: '10px' }}>
                      {h.distanceKm} km
                    </span>
                  </div>
                ))}
              </div>
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

      {/* Baner ostrzeżenia o fotoradarze */}
      {navState.cameraAlert && (
        <div style={{
          background: 'linear-gradient(90deg, #d32f2f, #b71c1c)',
          color: '#fff',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 'bold',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(211,47,47,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📸</span>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                FOTORADAR za {navState.cameraAlert.distanceMeters} m
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                {navState.cameraAlert.camera.name}
              </div>
            </div>
          </div>
          <div style={{
            background: '#fff',
            color: '#d32f2f',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontWeight: 900,
            border: '3px solid #d32f2f',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            flexShrink: 0,
          }}>
            {navState.cameraAlert.camera.speedLimit}
          </div>
        </div>
      )}

      {/* Mapa Leaflet */}
      <div className="nav-map-wrapper">
        {/* Prędkościomierz GPS */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(0,0,0,0.85)',
          border: '2px solid rgba(255,255,255,0.2)',
          borderRadius: '14px',
          padding: '8px 12px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: '55px',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
            {navState.currentSpeedKmh}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', textTransform: 'uppercase', marginTop: '2px', fontWeight: 700 }}>
            km/h
          </span>
        </div>

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
          <div style={{ textAlign: 'left', minWidth: '75px' }}>
            <div className="nav-footer-stat" style={{ color: 'var(--color-primary)', fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 900 }}>
              {navState.currentSpeedKmh} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>km/h</span>
            </div>
            <div className="nav-footer-stat-label">Prędkość</div>
          </div>
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
