import { useState, useEffect, useRef } from 'react';
import { X, CloudRain, AlertTriangle, Navigation, Map as MapIcon, Fuel, Clock, Activity, Target } from 'lucide-react';
import { storage } from '../services/storage';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { weatherService } from '../services/weather';
import '../styles/drivingMode.css';

interface DrivingModeProps {
  onExit: () => void;
}

// Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function MapCenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, 14, { animate: true });
  }, [map, position]);
  return null;
}

export default function DrivingMode({ onExit }: DrivingModeProps) {
  const [speed, setSpeed] = useState<number | null>(null);
  const [time, setTime] = useState<string>('');
  
  // Trip data
  const [tripDistance, setTripDistance] = useState<number>(0);
  const [rideTimeSec, setRideTimeSec] = useState<number>(0);
  const [avgConsumption, setAvgConsumption] = useState<number>(0);
  const [tankCapacity, setTankCapacity] = useState<number>(13.5);
  
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [rainWarning, setRainWarning] = useState<boolean>(false);
  const [nearestGasDist, setNearestGasDist] = useState<number | null>(null);
  const [nearestGasCoords, setNearestGasCoords] = useState<{lat: number, lng: number} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [radarTimestamp, setRadarTimestamp] = useState<number>(0);
  const [liquidGlass, setLiquidGlass] = useState<boolean>(true);
  const [leanAngle, setLeanAngle] = useState<number | null>(null);
  const [needsOrientationPermission, setNeedsOrientationPermission] = useState<boolean>(false);

  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const lastWeatherCheck = useRef<number>(0);
  const lastGasCheck = useRef<number>(0);
  const lastCoord = useRef<{lat: number, lng: number} | null>(null);

  // Init settings & radar
  useEffect(() => {
    const settings = storage.getSettings();
    if (settings) {
      setTankCapacity(settings.tankCapacity || 13.5);
      setLiquidGlass(settings.liquidGlassEnabled !== false);
    }
    const consumption = storage.getAverageConsumption();
    if (consumption) {
      setAvgConsumption(consumption);
    }
    
    // Get latest radar layer for map
    weatherService.getLatestRadarTimestamp().then(ts => {
      setRadarTimestamp(ts);
    }).catch(e => console.error(e));

    // Request Wake Lock
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.error('Wake Lock error:', err);
        }
      }
    };
    requestWakeLock();

    // Orientation (Lean Angle) setup
    const handleOrientation = (event: DeviceOrientationEvent) => {
      let angle = 0;
      const orientation = (window.screen.orientation || {}).type || '';
      if (orientation.includes('landscape') || window.orientation === 90 || window.orientation === -90) {
        angle = event.beta || 0;
      } else {
        angle = event.gamma || 0;
      }
      
      // Limit to 90 degrees max to avoid weird flips
      if (angle > 90) angle = 90;
      if (angle < -90) angle = -90;
      
      setLeanAngle(Math.round(angle));
    };

    if (typeof (window as any).DeviceOrientationEvent !== 'undefined' && typeof (window as any).DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ requires user gesture to request permission
      setNeedsOrientationPermission(true);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (wakeLock.current !== null) {
        wakeLock.current.release().catch(console.error);
        wakeLock.current = null;
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const requestOrientationPermission = async () => {
    try {
      const permissionState = await (window as any).DeviceOrientationEvent.requestPermission();
      if (permissionState === 'granted') {
        setNeedsOrientationPermission(false);
        // have to re-declare handleOrientation here if we bind it, or just rely on a global one.
        // Actually, we can just bind an inline one for simplicity since we don't unbind it differently.
        window.addEventListener('deviceorientation', (event: DeviceOrientationEvent) => {
          let angle = 0;
          const orientation = (window.screen.orientation || {}).type || '';
          if (orientation.includes('landscape') || window.orientation === 90 || window.orientation === -90) {
            angle = event.beta || 0;
          } else {
            angle = event.gamma || 0;
          }
          if (angle > 90) angle = 90;
          if (angle < -90) angle = -90;
          setLeanAngle(Math.round(angle));
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Ride Timer & Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      // Increment ride time only if we have GPS signal or after first fix
      if (lastCoord.current !== null) {
        setRideTimeSec(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolokalizacja nie wspierana');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        setUserLoc({ lat: currentLat, lng: currentLng });

        if (pos.coords.speed !== null) {
          setSpeed(Math.round(pos.coords.speed * 3.6));
        } else {
          setSpeed(0);
        }

        if (lastCoord.current) {
          const dist = getDistanceFromLatLonInKm(
            lastCoord.current.lat, lastCoord.current.lng, 
            currentLat, currentLng
          );
          if (dist > 0.01) { // Only update if moved more than 10m
            setTripDistance(prev => prev + dist);
            lastCoord.current = { lat: currentLat, lng: currentLng };
          }
        } else {
          lastCoord.current = { lat: currentLat, lng: currentLng };
        }

        const now = Date.now();
        // Weather every 5 mins
        if (now - lastWeatherCheck.current > 300000) {
          checkWeather(currentLat, currentLng);
          lastWeatherCheck.current = now;
        }

        // Gas stations every 15 mins
        if (now - lastGasCheck.current > 900000) {
          checkGasStations(currentLat, currentLng);
          lastGasCheck.current = now;
        }
      },
      () => {
        setErrorMsg('Brak sygnału GPS');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Initial immediate checks
    navigator.geolocation.getCurrentPosition(pos => {
      checkWeather(pos.coords.latitude, pos.coords.longitude);
      checkGasStations(pos.coords.latitude, pos.coords.longitude);
    }, () => {}, { enableHighAccuracy: true });

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const checkWeather = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation`);
      const data = await res.json();
      if (data?.current?.precipitation !== undefined) {
        setRainWarning(data.current.precipitation > 0);
      }
    } catch (e) {
      console.error('Weather API error', e);
    }
  };

  const checkGasStations = async (lat: number, lng: number) => {
    try {
      const query = `[out:json];node(around:20000,${lat},${lng})["amenity"="fuel"];out 1;`;
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data?.elements?.length > 0) {
        const stLat = data.elements[0].lat;
        const stLon = data.elements[0].lon;
        setNearestGasDist(getDistanceFromLatLonInKm(lat, lng, stLat, stLon));
        setNearestGasCoords({lat: stLat, lng: stLon});
      }
    } catch (e) {
      console.error('Overpass API error', e);
    }
  };

  const estimatedFuelConsumed = avgConsumption > 0 ? (tripDistance / 100) * avgConsumption : 0;
  
  let estimatedRange = 0;
  if (avgConsumption > 0) {
    const theoreticalMaxRange = (tankCapacity / avgConsumption) * 100;
    estimatedRange = Math.max(0, theoreticalMaxRange - tripDistance);
  }

  const glassClass = liquidGlass ? 'dm-liquid-glass' : 'dm-glass';
  
  // Speedometer color logic
  let speedColor = 'var(--color-primary)';
  if (speed !== null) {
    if (speed >= 140) speedColor = '#ff3333';
    else if (speed >= 90) speedColor = '#ffcc00';
  }

  return (
    <div className={`dm-container ${rainWarning ? 'dm-rain-warning' : ''}`}>
      {/* Header */}
      <div className="dm-header">
        <div className="dm-header-time">{time}</div>
        <button 
          onClick={onExit}
          aria-label="Zamknij tryb jazdy"
          className="dm-close-btn"
        >
          <X size={24} />
        </button>
      </div>

      <div className="dm-layout">
        
        <div className="dm-left-pane">
          {/* Speedometer Area */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            
            {/* Left Lean Indicator */}
            <div style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', 
              opacity: (leanAngle !== null && leanAngle < -2) ? 1 : 0.3, 
              color: 'var(--color-primary)', transition: 'opacity 0.2s',
              width: '60px'
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                {leanAngle !== null && leanAngle < -2 ? Math.abs(leanAngle) : 0}°
              </div>
              <div style={{ fontSize: '0.7rem', letterSpacing: '2px' }}>LEWO</div>
            </div>

            {/* Speedometer Center */}
            <div className={`dm-speedometer ${glassClass}`} style={{ flex: '0 0 auto' }}>
              {errorMsg ? (
                <div style={{ color: '#ffcc00', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={40} />
                  <span>{errorMsg}</span>
                </div>
              ) : (
                <>
                  <div className="dm-speed-value" style={{ color: speedColor }}>
                    {speed !== null ? speed : '--'}
                  </div>
                  <div className="dm-speed-unit">KM/H</div>
                </>
              )}
            </div>

            {/* Right Lean Indicator */}
            <div style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', 
              opacity: (leanAngle !== null && leanAngle > 2) ? 1 : 0.3, 
              color: 'var(--color-primary)', transition: 'opacity 0.2s',
              width: '60px'
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                {leanAngle !== null && leanAngle > 2 ? leanAngle : 0}°
              </div>
              <div style={{ fontSize: '0.7rem', letterSpacing: '2px' }}>PRAWO</div>
            </div>

          </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff3333', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
                <CloudRain size={24} /> BURZA / DESZCZ!
              </div>
            )}
          </div>
        </div>

        <div className="dm-right-pane">
          {showMap ? (
            <div className="dm-map-container">
              <MapContainer 
                center={userLoc ? [userLoc.lat, userLoc.lng] : [52.069, 19.480]} 
                zoom={13} 
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                
                {radarTimestamp > 0 && (
                  <TileLayer
                    url={`https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/{z}/{x}/{y}/2/1_1.png`}
                    opacity={0.6}
                  />
                )}

                {userLoc && (
                  <>
                    <CircleMarker center={[userLoc.lat, userLoc.lng]} radius={8} color="var(--color-primary)" fillColor="var(--color-primary)" fillOpacity={1} />
                    <MapCenter position={[userLoc.lat, userLoc.lng]} />
                  </>
                )}
              </MapContainer>
            </div>
          ) : (
            <div className="dm-stats-grid">
              
              <div className={`dm-stat-card ${glassClass}`}>
                <div className="dm-stat-title"><Target size={18} /> TRIP</div>
                <div>
                  <span className="dm-stat-value">{tripDistance.toFixed(1)}</span> <span className="dm-stat-unit">km</span>
                </div>
              </div>

              <div className={`dm-stat-card ${glassClass}`}>
                <div className="dm-stat-title"><Clock size={18} /> CZAS JAZDY</div>
                <div className="dm-stat-value">{formatTime(rideTimeSec)}</div>
              </div>



              <div className={`dm-stat-card ${glassClass}`}>
                <div className="dm-stat-title"><Activity size={18} /> SPALANIE</div>
                <div>
                  <span className="dm-stat-value">{estimatedFuelConsumed.toFixed(1)}</span> <span className="dm-stat-unit">L</span>
                </div>
                {avgConsumption > 0 ? (
                  <div className="dm-stat-desc">Bazując na {avgConsumption.toFixed(1)} L/100km</div>
                ) : (
                  <div className="dm-stat-desc">Brak historii spalania</div>
                )}
              </div>

              <div className={`dm-stat-card ${glassClass}`}>
                <div className="dm-stat-title"><Fuel size={18} /> NAJBLIŻSZA CPN</div>
                <div>
                  <span className="dm-stat-value">
                    {nearestGasDist !== null ? nearestGasDist.toFixed(1) : '--'}
                  </span> <span className="dm-stat-unit">km</span>
                </div>
                {avgConsumption > 0 && (
                  <div className="dm-stat-desc">Zasięg max: {estimatedRange.toFixed(0)} km</div>
                )}
                {nearestGasCoords && (
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${nearestGasCoords.lat},${nearestGasCoords.lng}`, '_blank')}
                    style={{
                      marginTop: 'auto',
                      background: 'var(--color-primary)', border: 'none', borderRadius: '8px', padding: '8px',
                      color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifySelf: 'center', width: '100%', gap: '4px', cursor: 'pointer'
                    }}
                  >
                    <Navigation size={14} /> Prowadź
                  </button>
                )}
              </div>
            </div>
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
