import { useState, useEffect } from 'react';
import { Wrench, Save } from 'lucide-react';
import { storage, type ServiceEntry } from '../services/storage';

export default function ServiceLog() {
  const [logs, setLogs] = useState<ServiceEntry[]>([]);
  const [odo, setOdo] = useState<number | ''>('');
  const [type, setType] = useState<'service' | 'repair' | 'accessory' | 'other'>('service');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const currentOdo = storage.getCurrentOdo();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    setLogs(storage.getServiceLogs());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!odo || !description || !cost) return;

    const newEntry = storage.addServiceLog({
      date: new Date().toISOString(),
      odo: Number(odo),
      type,
      description,
      cost: Number(cost),
      photoBase64: photo,
    });

    // If it's a service, update lastServiceOdo in settings
    if (type === 'service') {
      const settings = storage.getSettings();
      storage.saveSettings({ ...settings, lastServiceOdo: Number(odo) });
    }

    setLogs([newEntry, ...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    // Reset form
    setOdo('');
    setDescription('');
    setCost('');
    setPhoto(undefined);
    
    alert('Zapisano pomyślnie!');
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'service': return 'Serwis / Przegląd';
      case 'repair': return 'Naprawa awarii';
      case 'accessory': return 'Akcesoria';
      default: return 'Inne';
    }
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case 'service': return 'var(--color-success)';
      case 'repair': return 'var(--color-danger)';
      case 'accessory': return 'var(--color-primary)';
      default: return 'var(--color-warning)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Add Service/Expense Form */}
      <div className="glass-panel">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '20px' }}>
          <Wrench color="var(--color-primary)" /> Nowy wpis / Wydatek
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Typ wpisu</label>
            <select 
              className="input-field" 
              value={type} 
              onChange={(e) => setType(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="service">Serwis (Olej, klocki itp.)</option>
              <option value="repair">Naprawa usterki</option>
              <option value="accessory">Akcesoria / Tuning</option>
              <option value="other">Inne wydatki (np. myjnia)</option>
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Opis *</label>
            <input 
              type="text" 
              className="input-field" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="np. Wymiana oleju Motul 15W50"
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Przebieg (km) *</label>
              <input 
                type="number" 
                className="input-field" 
                value={odo} 
                onChange={(e) => setOdo(e.target.value ? Number(e.target.value) : '')}
                placeholder={`${currentOdo}`}
                required 
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Koszt (PLN) *</label>
              <input 
                type="number" 
                step="0.01"
                className="input-field" 
                value={cost} 
                onChange={(e) => setCost(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                required 
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Zdjęcie paragonu / części (opcjonalnie)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload}
                style={{ fontSize: '0.9rem', width: '100%' }}
              />
              {photo && (
                <div style={{ position: 'relative' }}>
                  <img src={photo} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  <button type="button" onClick={() => setPhoto(undefined)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer' }}>x</button>
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
            <Save size={20} /> Zapisz wpis
          </button>
        </form>
      </div>

      {/* History */}
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Historia serwisowa i wydatki</h3>
        
        {logs.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '30px' }}>
            Brak wpisów w historii.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.map((log) => {
              const dateObj = new Date(log.date);
              return (
                <div key={log.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px', borderLeft: `4px solid ${getTypeColor(log.type)}` }}>
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: getTypeColor(log.type), textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {getTypeLabel(log.type)}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{log.description}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {log.odo.toLocaleString()} km • {dateObj.toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <h4 style={{ margin: 0, color: 'var(--color-text)' }}>{log.cost.toFixed(2)}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>PLN</span>
                    </div>
                    {log.photoBase64 && (
                      <img 
                        src={log.photoBase64} 
                        alt="Złącznik" 
                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-glass-border)', cursor: 'pointer' }}
                        onClick={() => setFullscreenImage(log.photoBase64!)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {fullscreenImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
          onClick={() => setFullscreenImage(null)}
        >
          <img src={fullscreenImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} alt="Powiększenie" />
          <button 
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}
