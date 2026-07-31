import { useState, useEffect } from 'react';
import { storage, type RouteEntry } from '../services/storage';
import { weatherService, type Coordinates } from '../services/weather';
import { Map as MapIcon, MapPin, Trash2, Plus, Crosshair, CloudRain } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, useMap, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

function MapBounds({ route }: { route: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (route && route.length > 0) {
      map.fitBounds(route, { padding: [50, 50] });
    }
  }, [map, route]);
  return null;
}

function MapCenter({ center }: { center: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 10);
    }
  }, [map, center]);
  return null;
}

export default function Routes() {
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Map state
  const [userLoc, setUserLoc] = useState<Coordinates | null>(null);
  const [targetLoc, setTargetLoc] = useState<Coordinates | null>(null);
  const [routePolyline, setRoutePolyline] = useState<[number, number][] | null>(null);
  const [radarTimestamp, setRadarTimestamp] = useState<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');

  useEffect(() => {
    setRoutes(storage.getRoutes());
    // Load latest radar timestamp on mount
    weatherService.getLatestRadarTimestamp().then(ts => {
      if (ts) setRadarTimestamp(ts);
    });
  }, []);

  const handleAddRoute = () => {
    if (!newName || !newAddress) {
      alert('Podaj nazwę i adres trasy!');
      return;
    }
    // storage.addRoute mutates the internal cache.routes array.
    storage.addRoute({ name: newName, address: newAddress });
    // So we just need to get the updated array.
    setRoutes([...storage.getRoutes()]);
    setNewName('');
    setNewAddress('');
    setShowAddForm(false);
  };

  const handleDeleteRoute = (id: string) => {
    if (confirm('Usunąć tę trasę z ulubionych?')) {
      storage.deleteRoute(id);
      setRoutes(routes.filter(r => r.id !== id));
    }
  };

  const navigateTo = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  const launchYanosik = () => {
    window.open('yanosik://', '_blank');
  };

  const scanWeatherOnRoute = async (address: string) => {
    setIsScanning(true);
    setScanStatus('Pobieram lokalizację GPS...');
    setRoutePolyline(null);
    setTargetLoc(null);
    
    try {
      const currentLoc = await weatherService.getCurrentLocation();
      setUserLoc(currentLoc);

      setScanStatus('Geokodowanie celu (szukam na mapie)...');
      const target = await weatherService.geocodeAddress(address);
      setTargetLoc(target);

      setScanStatus('Wytyczam trasę (OSRM)...');
      const route = await weatherService.getRoute(currentLoc, target);
      setRoutePolyline(route);

      setScanStatus(''); // Success!
    } catch (e: any) {
      alert(e.message || 'Wystąpił błąd podczas skanowania trasy.');
      setScanStatus('');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Weather Radar Map Section */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CloudRain color="var(--color-primary)" /> Radar Pogodowy
          </h2>
        </div>
        
        <div style={{ height: '300px', width: '100%', position: 'relative', zIndex: 0 }}>
          <MapContainer 
            center={userLoc ? [userLoc.lat, userLoc.lng] : [52.069, 19.480]} 
            zoom={6} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            {/* Dark Matter Base Map */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            
            {/* RainViewer Radar Layer */}
            {radarTimestamp > 0 && (
              <TileLayer
                url={`https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/{z}/{x}/{y}/2/1_1.png`}
                opacity={0.6}
              />
            )}

            {/* Route & Markers */}
            {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} />}
            {targetLoc && <Marker position={[targetLoc.lat, targetLoc.lng]} />}
            {routePolyline && <Polyline positions={routePolyline} color="var(--color-primary)" weight={4} opacity={0.8} />}
            
            <MapBounds route={routePolyline} />
            <MapCenter center={userLoc && !routePolyline ? userLoc : null} />
          </MapContainer>
        </div>
        
        {scanStatus && (
          <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.5)', color: 'var(--color-primary)', fontSize: '0.9rem', textAlign: 'center' }}>
            {scanStatus}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapIcon color="var(--color-primary)" /> Moje Trasy
        </h2>
        <button 
          className="btn-primary" 
          style={{ padding: '8px 16px', display: 'flex', gap: '4px', alignItems: 'center' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? <span>Anuluj</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={18} /> Dodaj</span>}
        </button>
      </div>

      {showAddForm && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: 0 }}>Nowa trasa</h3>
          
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Nazwa (np. Baza wypadowa)</label>
            <input 
              type="text" 
              className="input-field" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Wpisz nazwę"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Adres docelowy (np. Zakopane)</label>
            <input 
              type="text" 
              className="input-field" 
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Miasto, ulica lub GPS"
            />
          </div>

          <button className="btn-primary" onClick={handleAddRoute}>Zapisz trasę</button>
        </div>
      )}

      {/* Routes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {routes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '20px' }}>
            Nie masz jeszcze żadnych tras. Dodaj pierwszą!
          </p>
        ) : (
          routes.map(route => (
            <div key={route.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div 
                  style={{ flex: 1, cursor: 'pointer' }} 
                  onClick={() => setExpandedRouteId(expandedRouteId === route.id ? null : route.id)}
                >
                  <h4 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={18} color="var(--color-primary)" /> {route.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{route.address}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }}
                  style={{ 
                    background: 'none', border: 'none', padding: '8px', 
                    color: 'var(--color-danger)', cursor: 'pointer' 
                  }}
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {expandedRouteId === route.id && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--color-glass-border)', paddingTop: '16px' }}>
                  <button 
                    className="btn-primary" 
                    onClick={() => scanWeatherOnRoute(route.address)}
                    style={{ padding: '16px', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    disabled={isScanning}
                  >
                    <Crosshair size={20} /> {isScanning ? 'Skanowanie...' : 'Skanuj trasę na Radarze'}
                  </button>
                  <button 
                    className="btn-outline" 
                    onClick={() => launchYanosik()}
                    style={{ padding: '12px', fontSize: '1rem' }}
                  >
                    1. Uruchom Yanosika w tle
                  </button>
                  <button 
                    className="btn-outline" 
                    onClick={() => navigateTo(route.address)}
                    style={{ padding: '12px', fontSize: '1rem' }}
                  >
                    2. Nawiguj (Mapy Google)
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
