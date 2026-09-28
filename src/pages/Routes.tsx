import { useState, useEffect } from 'react';
import { storage, type RouteEntry } from '../services/storage';
import { weatherService, type Coordinates } from '../services/weather';
import { Map as MapIcon, MapPin, Trash2, Plus, Crosshair, CloudRain, Star, Home, Briefcase, Navigation, Edit2, Check, X } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, useMap, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

function MapBounds({ route }: { route: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (route && route.length > 0) map.fitBounds(route, { padding: [50, 50] });
  }, [map, route]);
  return null;
}

function MapCenter({ center }: { center: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], map.getZoom());
  }, [map, center]);
  return null;
}

interface RoutesProps {
  onStartNavigation?: (address: string) => void;
}

// ─── Kategorie i ich wizualne atrybuty ───────────────────────────────────────

const CATEGORY_META: Record<string, { icon: typeof Home; label: string; emoji: string; color: string }> = {
  home:     { icon: Home,       label: 'Dom',       emoji: '🏠', color: '#4caf50' },
  work:     { icon: Briefcase,  label: 'Praca',     emoji: '💼', color: '#2196f3' },
  favorite: { icon: Star,       label: 'Ulubione',  emoji: '⭐', color: '#ff9800' },
  custom:   { icon: MapPin,     label: 'Trasa',     emoji: '📍', color: 'var(--color-primary)' },
};

// ─── Komponent główny ────────────────────────────────────────────────────────

export default function Routes({ onStartNavigation }: RoutesProps) {
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState<RouteEntry['category']>('custom');

  // Map state
  const [userLoc, setUserLoc] = useState<Coordinates | null>(null);
  const [targetLoc, setTargetLoc] = useState<Coordinates | null>(null);
  const [routePolyline, setRoutePolyline] = useState<[number, number][] | null>(null);
  const [radarUrl, setRadarUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');

  useEffect(() => {
    setRoutes(storage.getRoutes());
    weatherService.getLatestRadarUrl().then(url => { if (url) setRadarUrl(url); });
  }, []);

  const refreshRoutes = () => setRoutes([...storage.getRoutes()]);

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const handleAddRoute = () => {
    if (!newName || !newAddress) { alert('Podaj nazwę i adres trasy!'); return; }
    storage.addRoute({ name: newName, address: newAddress, category: newCategory });
    refreshRoutes();
    setNewName(''); setNewAddress(''); setNewCategory('custom'); setShowAddForm(false);
  };

  const handleDeleteRoute = (id: string) => {
    if (confirm('Usunąć tę trasę?')) {
      storage.deleteRoute(id);
      setRoutes(routes.filter(r => r.id !== id));
    }
  };

  const handleStartEdit = (route: RouteEntry) => {
    setEditingId(route.id);
    setEditName(route.name);
    setEditAddress(route.address);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || !editAddress.trim()) return;
    storage.updateRoute(id, { name: editName.trim(), address: editAddress.trim() });
    setEditingId(null);
    refreshRoutes();
  };

  const handleToggleFavorite = (route: RouteEntry) => {
    const newCat = route.category === 'favorite' ? 'custom' : 'favorite';
    storage.updateRoute(route.id, { category: newCat });
    refreshRoutes();
  };

  // ─── Nawigacja zewnętrzna ──────────────────────────────────────────────────

  const navigateTo = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  const launchYanosik = () => window.open('yanosik://', '_blank');

  const scanWeatherOnRoute = async (address: string) => {
    setIsScanning(true); setScanStatus('Pobieram lokalizację GPS...'); setRoutePolyline(null); setTargetLoc(null);
    try {
      const currentLoc = await weatherService.getCurrentLocation(); setUserLoc(currentLoc);
      setScanStatus('Geokodowanie celu (szukam na mapie)...');
      const target = await weatherService.geocodeAddress(address); setTargetLoc(target);
      setScanStatus('Wytyczam trasę (OSRM)...');
      const route = await weatherService.getRoute(currentLoc, target); setRoutePolyline(route);
      setScanStatus('');
    } catch (e: unknown) {
      alert((e as Error).message || 'Wystąpił błąd podczas skanowania trasy.');
      setScanStatus('');
    } finally { setIsScanning(false); }
  };

  // ─── Podział tras na kategorie ─────────────────────────────────────────────

  const homeRoute = routes.find(r => r.category === 'home');
  const workRoute = routes.find(r => r.category === 'work');
  const favorites = routes.filter(r => r.category === 'favorite');
  const customRoutes = routes.filter(r => !r.category || r.category === 'custom');

  // ─── Quick shortcut tile (Dom / Praca) ────────────────────────────────────

  const renderQuickTile = (
    route: RouteEntry | undefined,
    category: 'home' | 'work',
    onSetup: () => void
  ) => {
    const meta = CATEGORY_META[category];
    if (!route) {
      return (
        <button
          className="glass-panel"
          style={{
            flex: 1, padding: '16px', border: `1px dashed rgba(255,255,255,0.2)`, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            color: 'var(--color-text-muted)', background: 'none',
          }}
          onClick={onSetup}
        >
          <meta.icon size={28} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ustaw {meta.label}</span>
        </button>
      );
    }

    return (
      <div
        className="glass-panel"
        style={{
          flex: 1, padding: '14px', cursor: 'pointer',
          borderLeft: `3px solid ${meta.color}`,
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1.2rem' }}>{meta.emoji}</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{meta.label}</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {route.address}
        </p>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <button
            style={{ flex: 1, padding: '8px', background: meta.color, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            onClick={() => onStartNavigation?.(route.address)}
          >
            🧭 Nawiguj
          </button>
          <button
            style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer' }}
            onClick={() => navigateTo(route.address)}
          >
            Mapy
          </button>
        </div>
      </div>
    );
  };

  // ─── Ustawienie Dom/Praca ──────────────────────────────────────────────────

  const [setupCategory, setSetupCategory] = useState<'home' | 'work' | null>(null);
  const [setupAddress, setSetupAddress] = useState('');

  const handleSaveSetup = () => {
    if (!setupAddress.trim() || !setupCategory) return;
    // Usuń poprzedni wpis tej kategorii
    const existing = routes.find(r => r.category === setupCategory);
    if (existing) storage.deleteRoute(existing.id);
    const label = setupCategory === 'home' ? 'Dom' : 'Praca';
    storage.addRoute({ name: label, address: setupAddress.trim(), category: setupCategory });
    refreshRoutes();
    setSetupCategory(null); setSetupAddress('');
  };

  // ─── Render route card ─────────────────────────────────────────────────────

  const renderRouteCard = (route: RouteEntry) => {
    const meta = CATEGORY_META[route.category ?? 'custom'];
    const isExpanded = expandedRouteId === route.id;
    const isEditing = editingId === route.id;

    return (
      <div key={route.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isEditing ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '8px', fontSize: '0.9rem' }} />
              <input className="input-field" value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{ padding: '8px', fontSize: '0.9rem' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={{ padding: '6px 12px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => handleSaveEdit(route.id)}><Check size={16} /></button>
                <button style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setEditingId(null)}><X size={16} /></button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}>
              <h4 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1rem' }}>{meta.emoji}</span> {route.name}
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{route.address}</p>
            </div>
          )}

          {!isEditing && (
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(route); }}
                style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: route.category === 'favorite' ? '#ff9800' : 'var(--color-text-muted)' }}
                title={route.category === 'favorite' ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              >
                <Star size={18} fill={route.category === 'favorite' ? '#ff9800' : 'none'} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleStartEdit(route); }}
                style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }}
                style={{ background: 'none', border: 'none', padding: '6px', color: 'var(--color-danger)', cursor: 'pointer' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {isExpanded && !isEditing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', borderTop: '1px solid var(--color-glass-border)', paddingTop: '12px' }}>
            <button
              className="btn-primary"
              onClick={() => onStartNavigation?.(route.address)}
              style={{ padding: '14px', fontSize: '1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <Navigation size={20} /> Nawiguj w aplikacji
            </button>
            <button
              className="btn-outline"
              onClick={() => scanWeatherOnRoute(route.address)}
              style={{ padding: '12px', fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              disabled={isScanning}
            >
              <Crosshair size={18} /> {isScanning ? 'Skanowanie...' : 'Skanuj trasę na Radarze'}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-outline" onClick={() => launchYanosik()} style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>
                Yanosik
              </button>
              <button className="btn-outline" onClick={() => navigateTo(route.address)} style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>
                Mapy Google
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Szybkie skróty: Dom & Praca ──────────────────────────────────── */}
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Navigation size={18} color="var(--color-primary)" /> Szybka nawigacja
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          {renderQuickTile(homeRoute, 'home', () => setSetupCategory('home'))}
          {renderQuickTile(workRoute, 'work', () => setSetupCategory('work'))}
        </div>
      </div>

      {/* ── Modal ustawienia Dom/Praca ──────────────────────────────────── */}
      {setupCategory && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: `3px solid ${CATEGORY_META[setupCategory].color}` }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {CATEGORY_META[setupCategory].emoji} Ustaw adres: {CATEGORY_META[setupCategory].label}
          </h3>
          <input
            className="input-field"
            type="text"
            placeholder={setupCategory === 'home' ? 'np. ul. Kwiatowa 5, Kraków' : 'np. ul. Biurowa 10, Warszawa'}
            value={setupAddress}
            onChange={e => setSetupAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveSetup()}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ flex: 1, padding: '12px' }} onClick={handleSaveSetup}>Zapisz</button>
            <button className="btn-outline" style={{ padding: '12px' }} onClick={() => { setSetupCategory(null); setSetupAddress(''); }}>Anuluj</button>
          </div>
        </div>
      )}

      {/* ── Radar pogodowy ────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
            <CloudRain color="var(--color-primary)" size={20} /> Radar Pogodowy
          </h2>
        </div>
        <div style={{ height: '250px', width: '100%', position: 'relative', zIndex: 0 }}>
          <MapContainer
            center={userLoc ? [userLoc.lat, userLoc.lng] : [52.069, 19.480]}
            zoom={6}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
            {radarUrl && <TileLayer url={radarUrl} opacity={0.8} maxNativeZoom={7} />}
            {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} />}
            {targetLoc && <Marker position={[targetLoc.lat, targetLoc.lng]} />}
            {routePolyline && <Polyline positions={routePolyline} color="var(--color-primary)" weight={4} opacity={0.8} />}
            <MapBounds route={routePolyline} />
            <MapCenter center={userLoc && !routePolyline ? userLoc : null} />
          </MapContainer>
        </div>
        {scanStatus && (
          <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.5)', color: 'var(--color-primary)', fontSize: '0.85rem', textAlign: 'center' }}>
            {scanStatus}
          </div>
        )}
      </div>

      {/* ── Ulubione trasy ────────────────────────────────────────────────── */}
      {favorites.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 10px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Star size={18} color="#ff9800" /> Ulubione ({favorites.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {favorites.map(renderRouteCard)}
          </div>
        </div>
      )}

      {/* ── Wszystkie trasy ────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapIcon size={18} color="var(--color-primary)" /> Wszystkie trasy ({customRoutes.length})
          </h3>
          <button
            className="btn-primary"
            style={{ padding: '8px 14px', display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.85rem' }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Anuluj' : <><Plus size={16} /> Dodaj</>}
          </button>
        </div>

        {showAddForm && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
            <h4 style={{ margin: 0 }}>Nowa trasa</h4>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Nazwa</label>
              <input type="text" className="input-field" value={newName} onChange={e => setNewName(e.target.value)} placeholder="np. Kumpel Jarek, Zakopane" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Adres docelowy</label>
              <input type="text" className="input-field" value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Miasto, ulica lub koordynaty GPS" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Kategoria</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['custom', 'favorite', 'home', 'work'] as const).map(cat => {
                  const m = CATEGORY_META[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setNewCategory(cat)}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        background: newCategory === cat ? m.color : 'rgba(255,255,255,0.06)',
                        color: newCategory === cat ? '#000' : '#fff',
                        border: newCategory === cat ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {m.emoji} {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button className="btn-primary" onClick={handleAddRoute}>Zapisz trasę</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {customRoutes.length === 0 && favorites.length === 0 && !homeRoute && !workRoute ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px 0' }}>
              Nie masz jeszcze żadnych tras. Ustaw adres domu, pracy lub dodaj nową trasę!
            </p>
          ) : customRoutes.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '10px 0', fontSize: '0.85rem' }}>
              Brak tras w tej kategorii. Kliknij „Dodaj" aby utworzyć.
            </p>
          ) : (
            customRoutes.map(renderRouteCard)
          )}
        </div>
      </div>

    </div>
  );
}
