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

    </div>
  );
}
