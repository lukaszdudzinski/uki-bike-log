import { useState, useEffect } from 'react';
import { storage, type RouteEntry } from '../services/storage';
import { Map, MapPin, Trash2, Plus } from 'lucide-react';

export default function Routes() {
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    setRoutes(storage.getRoutes());
  }, []);

  const handleAddRoute = () => {
    if (!newName || !newAddress) {
      alert('Podaj nazwę i adres trasy!');
      return;
    }
    const added = storage.addRoute({ name: newName, address: newAddress });
    setRoutes([...routes, added]);
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
    // Encodes the address for Google Maps
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  const launchYanosik = () => {
    window.open('yanosik://', '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Map color="var(--color-primary)" /> Moje Trasy
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
                    onClick={() => launchYanosik()}
                    style={{ padding: '16px', fontSize: '1.1rem', fontWeight: 'bold' }}
                  >
                    1. Uruchom Yanosika w tle
                  </button>
                  <button 
                    className="btn-outline" 
                    onClick={() => navigateTo(route.address)}
                    style={{ padding: '16px', fontSize: '1.1rem', fontWeight: 'bold' }}
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
