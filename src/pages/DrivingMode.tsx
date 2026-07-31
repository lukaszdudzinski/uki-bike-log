import { useState, useEffect, useRef } from 'react';
import { X, CloudRain, AlertTriangle, Navigation, Map as MapIcon, Fuel, Clock, Activity, Target } from 'lucide-react';
import { storage } from '../services/storage';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { weatherService } from '../services/weather';

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
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [radarTimestamp, setRadarTimestamp] = useState<number>(0);

  const watchId = useRef<number | null>(null);
  const lastWeatherCheck = useRef<number>(0);
  const lastGasCheck = useRef<number>(0);
  const lastCoord = useRef<{lat: number, lng: number} | null>(null);

  // Init settings & radar
  useEffect(() => {
    const settings = storage.getSettings();
    if (settings) {
      setTankCapacity(settings.tankCapacity || 13.5);
    }
    const consumption = storage.getAverageConsumption();
    if (consumption) {
      setAvgConsumption(consumption);
    }
    
    // Get latest radar layer for map
    weatherService.getLatestRadarTimestamp().then(ts => {
      setRadarTimestamp(ts);
    }).catch(e => console.error(e));
  }, []);

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

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: rainWarning ? '#8b0000' : '#121212',
        color: '#ffffff', zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        padding: '20px', paddingBottom: '30px',
        animation: rainWarning ? 'flash 2s infinite' : 'none',
        transition: 'background-color 1s ease',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes flash { 0% { background-color: #8b0000; } 50% { background-color: #ff0000; } 100% { background-color: #8b0000; } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{time}</div>
        <button 
          onClick={onExit}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
            width: '44px', height: '44px', display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: 'white', cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
        
        {/* Speedometer (Span 2 cols) */}
        <div style={{ gridColumn: 'span 2', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '24px', padding: '20px' }}>
          {errorMsg ? (
            <div style={{ color: '#ffcc00', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={40} />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '7rem', fontWeight: '900', lineHeight: 1, color: 'var(--color-primary)' }}>
                {speed !== null ? speed : '--'}
              </div>
              <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', marginTop: '5px' }}>KM/H</div>
            </>
          )}
        </div>

        {/* Trip Meter */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Target size={18} /> TRIP</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tripDistance.toFixed(1)} <span style={{fontSize: '1rem', color: '#888'}}>km</span></div>
        </div>

        {/* Ride Timer */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={18} /> CZAS JAZDY</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>{formatTime(rideTimeSec)}</div>
        </div>

        {/* Fuel Prediction */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={18} /> SPALANIE (SZAC.)</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{estimatedFuelConsumed.toFixed(1)} <span style={{fontSize: '1rem', color: '#888'}}>L</span></div>
          {avgConsumption > 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#888' }}>Bazując na {avgConsumption.toFixed(1)} L/100km</div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#888' }}>Brak historii spalania</div>
          )}
        </div>

        {/* Nearest Gas Station */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Fuel size={18} /> NAJBLIŻSZA CPN</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {nearestGasDist !== null ? nearestGasDist.toFixed(1) : '--'} <span style={{fontSize: '1rem', color: '#888'}}>km</span>
          </div>
          {avgConsumption > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#888' }}>Zasięg max: {estimatedRange.toFixed(0)} km</div>
          )}
        </div>
      </div>

      {/* Bottom Controls / Warnings */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        <button 
          onClick={() => setShowMap(!showMap)}
          style={{
            background: showMap ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: '12px', padding: '12px 20px',
            color: showMap ? '#000' : 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
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

      {/* Mini Map Modal */}
      {showMap && (
        <div style={{
          position: 'absolute', bottom: '80px', left: '20px', right: '20px', height: '300px',
          borderRadius: '20px', overflow: 'hidden', border: '2px solid var(--color-primary)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 100
        }}>
          <MapContainer 
            center={userLoc ? [userLoc.lat, userLoc.lng] : [52.069, 19.480]} 
            zoom={13} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            {/* Minimalist Radar Layer from RainViewer */}
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
      )}

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
