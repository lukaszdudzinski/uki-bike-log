import { useState, useEffect, useRef } from 'react';
import { X, CloudRain, Map as MapIcon, Camera, Navigation } from 'lucide-react';
import { storage } from '../services/storage';
import '../styles/drivingMode.css';

import { useWakeLock } from '../hooks/useWakeLock';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { useGeolocationTracker } from '../hooks/useGeolocationTracker';
import { useDrivingPOIs } from '../hooks/useDrivingPOIs';

import { DrivingSpeedometer } from '../components/driving/DrivingSpeedometer';
import { DrivingStats } from '../components/driving/DrivingStats';
import { DrivingMap } from '../components/driving/DrivingMap';
import { MinimizedDrivingView } from '../components/driving/MinimizedDrivingView';

interface DrivingModeProps {
  onExit: () => void;
}

export default function DrivingMode({ onExit }: DrivingModeProps) {
  const [time, setTime] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);
  
  // Settings state
  const [tankCapacity, setTankCapacity] = useState<number>(13.5);
  const [avgConsumption, setAvgConsumption] = useState<number>(0);
  const [liquidGlass, setLiquidGlass] = useState<boolean>(true);
  const weatherRadius = useRef<number>(10);

  // Initialize hooks
  useWakeLock();
  
  const { leanAngle, needsOrientationPermission, requestOrientationPermission } = useDeviceOrientation();
  
  const { 
    userLoc, 
    speed, 
    tripDistance, 
    rideTimeSec, 
    errorMsg, 
    gpsTrack, 
    exportGPX 
  } = useGeolocationTracker();

  const { 
    rainWarning, 
    nearestGasDist, 
    nearestGasCoords, 
    speedCameras, 
    cameraWarning, 
    radarUrl 
  } = useDrivingPOIs(userLoc, weatherRadius.current);

  // Init settings
  useEffect(() => {
    const settings = storage.getSettings();
    if (settings) {
      setTankCapacity(settings.tankCapacity || 13.5);
      setLiquidGlass(settings.liquidGlassEnabled !== false);
      weatherRadius.current = settings.rainWarningRadius || 10;
    }
    const consumption = storage.getAverageConsumption();
    if (consumption) {
      setAvgConsumption(consumption);
    }
  }, []);

  // Ride Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExit = () => {
    if (gpsTrack.length > 5 && tripDistance > 0.1) {
      if (confirm('Zakończyć jazdę? Czy chcesz pobrać przebytą trasę jako plik GPX?')) {
        exportGPX();
      }
    }
    onExit();
  };

  const estimatedFuelConsumed = avgConsumption > 0 ? (tripDistance / 100) * avgConsumption : 0;
  
  let estimatedRange = 0;
  if (avgConsumption > 0) {
    const theoreticalMaxRange = (tankCapacity / avgConsumption) * 100;
    estimatedRange = Math.max(0, theoreticalMaxRange - tripDistance);
  }

  const glassClass = liquidGlass ? 'dm-liquid-glass' : 'dm-glass';

  if (isMinimized) {
    return <MinimizedDrivingView tripDistance={tripDistance} onRestore={() => setIsMinimized(false)} />;
  }

  return (
    <div className="dm-container">
      {/* Header */}
      <div className="dm-header">
        <div className="dm-header-time">{time}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setIsMinimized(true)}
            className="dm-close-btn"
            style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
          >
            _
          </button>
          <button 
            onClick={handleExit}
            aria-label="Zamknij tryb jazdy"
            className="dm-close-btn"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="dm-layout">
        
        <div className="dm-left-pane">
          <DrivingSpeedometer 
            speed={speed} 
            errorMsg={errorMsg} 
            leanAngle={leanAngle} 
            glassClass={glassClass} 
          />

          {needsOrientationPermission && (
            <button onClick={requestOrientationPermission} className="btn-outline" style={{ margin: '15px auto', display: 'block', padding: '8px 16px', fontSize: '0.8rem' }}>
              Aktywuj żyroskop dla pochylenia
            </button>
          )}

          <div className="dm-controls">
            <button 
              onClick={() => setShowMap(!showMap)}
              className="dm-map-toggle"
              style={{
                background: showMap ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                color: showMap ? '#000' : 'white',
              }}
            >
              <MapIcon size={20} /> Mapa
            </button>

            {rainWarning && (
              <div className="dm-rain-warning-icon" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <CloudRain size={36} />
                  <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.7rem', color: '#fff', fontWeight: '900', textShadow: '0 0 2px black' }}>
                    {weatherRadius.current}
                  </span>
                </div>
              </div>
            )}
            
            {cameraWarning && (
              <div style={{
                background: 'var(--color-warning)', padding: '10px', borderRadius: '50%',
                display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#000',
                animation: 'pulse 1s infinite alternate', boxShadow: '0 0 15px var(--color-warning)'
              }}>
                <Camera size={30} />
              </div>
            )}
          </div>
        </div>

        <div className="dm-right-pane">
          {showMap ? (
            <DrivingMap 
              userLoc={userLoc} 
              radarUrl={radarUrl} 
              speedCameras={speedCameras} 
            />
          ) : (
            <DrivingStats 
              glassClass={glassClass}
              tripDistance={tripDistance}
              rideTimeSec={rideTimeSec}
              avgConsumption={avgConsumption}
              estimatedFuelConsumed={estimatedFuelConsumed}
              nearestGasDist={nearestGasDist}
              estimatedRange={estimatedRange}
              nearestGasCoords={nearestGasCoords}
            />
          )}
        </div>

      </div>

      {/* GPS Activity Indicator */}
      {!errorMsg && speed === null && (
        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Navigation size={12} className="spin" /> GPS...
        </div>
      )}
      <style>{`.spin { animation: spin 2s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
