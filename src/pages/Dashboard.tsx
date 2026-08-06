import { useState, useEffect } from 'react';
import { storage, type BikeSettings } from '../services/storage';
import AlertsList from '../components/AlertsList';
import QuickActions from '../components/QuickActions';
import WeatherWidget from '../components/WeatherWidget';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  setIsDrivingMode: (val: boolean) => void;
}

export default function Dashboard({ setActiveTab, setIsDrivingMode }: DashboardProps) {
  const [odo, setOdo] = useState<number>(0);
  const [settings, setSettings] = useState<BikeSettings | null>(null);
  const [avgConsumption, setAvgConsumption] = useState<number | null>(null);

  useEffect(() => {
    setOdo(storage.getCurrentOdo());
    setSettings(storage.getSettings());
    setAvgConsumption(storage.getAverageConsumption());
  }, []);

  if (!settings) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ODO & Main Stats Card */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, var(--color-glass-bg) 0%, rgba(212, 175, 55, 0.05) 100%)',
        borderLeft: '4px solid var(--color-primary)'
      }}>
        <div>
          <p className="input-label" style={{ marginBottom: '4px' }}>Całkowity przebieg</p>
          <h2 style={{ fontSize: '2.5rem', margin: 0, fontFamily: 'monospace' }}>{odo.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>km</span></h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="input-label" style={{ marginBottom: '4px' }}>Śr. spalanie</p>
          <h3 style={{ margin: 0 }}>{avgConsumption ? `${avgConsumption.toFixed(2)} l/100` : '-- l/100'}</h3>
        </div>
      </div>

      <button 
        className="btn-primary" 
        style={{ padding: '16px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}
        onClick={() => setIsDrivingMode(true)}
      >
        <span style={{ fontSize: '1.5rem' }}>🏍️</span> Uruchom Tryb Jazdy
      </button>

      <WeatherWidget />

      <QuickActions setActiveTab={setActiveTab} />

      <AlertsList settings={settings} odo={odo} setSettings={setSettings} />

      {/* Awaria / SOS Panel */}
      <div style={{
        background: 'rgba(255, 60, 60, 0.1)',
        border: '1px solid var(--color-danger)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        marginTop: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🚨</span> AWARIA / ASSISTANCE
        </h3>
        
        {(!settings.insuranceHotline && !settings.policyNumber) ? (
          <div style={{ fontSize: '0.9rem', color: '#ccc', textAlign: 'center', padding: '10px 0' }}>
            Brak danych ubezpieczenia. <br/>
            <span 
              onClick={() => setActiveTab('settings')} 
              style={{ color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Kliknij tutaj, aby uzupełnić numer polisy i infolinii w Opcjach.
            </span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.9rem', color: '#fff' }}>
              {settings.insurerName && <div><strong>Ubezpieczyciel:</strong> {settings.insurerName}</div>}
              {settings.policyNumber && <div><strong>Nr Polisy:</strong> {settings.policyNumber}</div>}
            </div>
            {settings.insuranceHotline ? (
              <a 
                href={`tel:${settings.insuranceHotline.replace(/\s+/g, '')}`}
                style={{
                  display: 'block',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}
              >
                📞 Zadzwoń po pomoc ({settings.insuranceHotline})
              </a>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-warning)' }}>
                Brak numeru na infolinię. Uzupełnij w Opcjach.
              </div>
            )}
          </>
        )}
      </div>

      <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
        Uki Bike Log v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.x.x'} (Radar & Garaż)
      </p>

    </div>
  );
}
