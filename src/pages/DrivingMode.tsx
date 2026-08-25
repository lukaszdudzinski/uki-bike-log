import { useState, useEffect, useRef } from 'react';
import { X, CloudRain, AlertTriangle, Navigation, Map as MapIcon, Fuel, Clock, Activity, Target, Camera } from 'lucide-react';
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
    // Zachowujemy obecny poziom zoomu użytkownika, centrujemy tylko pozycję
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);
  return null;
}

export default function DrivingMode({ onExit }: DrivingModeProps) {
  const [speed, setSpeed] = useState<number | null>(null);
  const [time, setTime] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  
  // Trip data
  const [tripDistance, setTripDistance] = useState<number>(0);
  const [rideTimeSec, setRideTimeSec] = useState<number>(0);
  const [avgConsumption, setAvgConsumption] = useState<number>(0);
  const [tankCapacity, setTankCapacity] = useState<number>(13.5);
  
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [rainWarning, setRainWarning] = useState<boolean>(false);
  const [nearestGasDist, setNearestGasDist] = useState<number | null>(null);
  const [nearestGasCoords, setNearestGasCoords] = useState<{lat: number, lng: number} | null>(null);
  const [speedCameras, setSpeedCameras] = useState<{lat: number, lng: number}[]>([]);
  const [cameraWarning, setCameraWarning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [radarUrl, setRadarUrl] = useState<string | null>(null);
  const [liquidGlass, setLiquidGlass] = useState<boolean>(true);
  const [leanAngle, setLeanAngle] = useState<number | null>(null);
  const [needsOrientationPermission, setNeedsOrientationPermission] = useState<boolean>(false);

  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const lastWeatherCheck = useRef<number>(0);
  const lastGasCheck = useRef<number>(0);
  const lastCameraCheck = useRef<number>(0);
  const cameraWarningRef = useRef<boolean>(false);
  const camerasCacheRef = useRef<{lat: number, lng: number}[]>([]);
  const lastCoord = useRef<{lat: number, lng: number} | null>(null);
  const weatherRadius = useRef<number>(10);
  const gpsTrackRef = useRef<{lat: number, lng: number, ele: number | null, time: string}[]>([]);

  // Init settings & radar
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
    
    // Get latest radar layer for map
    weatherService.getLatestRadarUrl().then(url => {
      setRadarUrl(url);
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
            // Save to GPX track
            gpsTrackRef.current.push({
              lat: currentLat,
              lng: currentLng,
              ele: pos.coords.altitude,
              time: new Date(pos.timestamp).toISOString()
            });
          }
        } else {
          lastCoord.current = { lat: currentLat, lng: currentLng };
          gpsTrackRef.current.push({
            lat: currentLat,
            lng: currentLng,
            ele: pos.coords.altitude,
            time: new Date(pos.timestamp).toISOString()
          });
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

        // Speed cameras cache every 15 mins
        if (now - lastCameraCheck.current > 900000) {
          checkCameras(currentLat, currentLng);
          lastCameraCheck.current = now;
        }

        // Real-time camera proximity check
        if (camerasCacheRef.current.length > 0) {
          let minD = 9999;
          for (const cam of camerasCacheRef.current) {
            const d = getDistanceFromLatLonInKm(currentLat, currentLng, cam.lat, cam.lng);
            if (d < minD) minD = d;
          }
          if (minD < 0.8 && !cameraWarningRef.current) {
            cameraWarningRef.current = true;
            setCameraWarning(true);
            try {
              // Beep sound
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioContext.createOscillator();
              osc.type = 'square';
              osc.frequency.setValueAtTime(800, audioContext.currentTime);
              osc.connect(audioContext.destination);
              osc.start();
              osc.stop(audioContext.currentTime + 0.5);
            } catch (e) {}
          } else if (minD >= 0.8 && cameraWarningRef.current) {
            cameraWarningRef.current = false;
            setCameraWarning(false);
          }
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
      checkCameras(pos.coords.latitude, pos.coords.longitude);
    }, () => {}, { enableHighAccuracy: true });

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const checkCameras = async (lat: number, lng: number) => {
    try {
      const query = `[out:json];node(around:20000,${lat},${lng})["highway"="speed_camera"];out;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.elements && data.elements.length > 0) {
          const cameras = data.elements.map((el: any) => ({ lat: el.lat, lng: el.lon }));
          camerasCacheRef.current = cameras;
          setSpeedCameras(cameras);
        }
      }
    } catch (e) {
      console.error('Failed to fetch speed cameras:', e);
    }
  };

  const checkWeather = async (lat: number, lng: number) => {
    try {
      const radiusKm = weatherRadius.current;
      
      // Calculate 4 points around the user (N, S, E, W) at given radius
      // 1 degree lat = ~111km
      const latOffset = radiusKm / 111;
      // 1 degree lng = ~111km * cos(lat)
      const lngOffset = radiusKm / (111 * Math.cos(lat * (Math.PI / 180)));
      
      const points = [
        { lat, lng }, // Center
        { lat: lat + latOffset, lng }, // North
        { lat: lat - latOffset, lng }, // South
        { lat, lng: lng + lngOffset }, // East
        { lat, lng: lng - lngOffset }, // West
      ];
      
      const lats = points.map(p => p.lat.toFixed(4)).join(',');
      const lngs = points.map(p => p.lng.toFixed(4)).join(',');
      
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=precipitation`);
      const data = await res.json();
      
      let isRaining = false;
      // Open-Meteo returns array when multiple coordinates are requested
      if (Array.isArray(data)) {
        isRaining = data.some(d => d.current?.precipitation > 0);
      } else if (data?.current?.precipitation !== undefined) {
        // Fallback if only one coordinate was somehow processed
        isRaining = data.current.precipitation > 0;
      }
      
      setRainWarning(isRaining);
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

  const handleExit = () => {
    if (gpsTrackRef.current.length > 5 && tripDistance > 0.1) {
      if (confirm('Zakończyć jazdę? Czy chcesz pobrać przebytą trasę jako plik GPX?')) {
        exportGPX();
      }
    }
    onExit();
  };

  const exportGPX = () => {
    const track = gpsTrackRef.current;
    if (track.length === 0) return;

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Uki's Bike Log" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Trasa motocyklowa - ${new Date().toLocaleDateString()}</name>
    <trkseg>
`;
    track.forEach(pt => {
      gpx += `      <trkpt lat="${pt.lat}" lon="${pt.lng}">
        ${pt.ele !== null ? `<ele>${pt.ele}</ele>` : ''}
        <time>${pt.time}</time>
      </trkpt>\n`;
    });
    gpx += `    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UkiBikeLog_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', border: '2px solid var(--color-primary)',
          backdropFilter: 'blur(10px)', padding: '12px 24px', borderRadius: '30px',
          display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10000,
          color: 'var(--color-primary)', fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}
      >
        <Navigation size={20} className="spin" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1rem', lineHeight: '1' }}>Wróć do jazdy</span>
          <span style={{ fontSize: '0.7rem', color: '#fff', opacity: 0.8 }}>Trip: {tripDistance.toFixed(1)} km</span>
        </div>
      </div>
    );
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
            <div className="dm-map-container">
              <MapContainer 
                center={userLoc ? [userLoc.lat, userLoc.lng] : [52.069, 19.480]} 
                zoom={13} 
                minZoom={2}
                maxZoom={18}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                zoomControl={true}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                
                {radarUrl && (
                  <TileLayer
                    url={radarUrl}
                    opacity={0.8}
                    maxNativeZoom={7}
                  />
                )}

                {speedCameras.map((cam, i) => (
                  <CircleMarker key={i} center={[cam.lat, cam.lng]} radius={6} color="var(--color-warning)" fillColor="var(--color-warning)" fillOpacity={0.8} />
                ))}

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
