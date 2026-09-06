import { useNavigate } from 'react-router-dom';
import { useGarage } from '../contexts/GarageContext';

import { SettingsProfile } from '../components/settings/SettingsProfile';
import { SettingsReminders } from '../components/settings/SettingsReminders';
import { SettingsGarage } from '../components/settings/SettingsGarage';
import { SettingsVehicle } from '../components/settings/SettingsVehicle';

interface SettingsProps {
  isDark: boolean;
  setIsDark: (val: boolean) => void;
}

export default function Settings({ isDark, setIsDark }: SettingsProps) {
  const { activeBike } = useGarage();
  const navigate = useNavigate();

  if (!activeBike) return null;

  return (
    <div className="glass-panel" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SettingsProfile activeBikeId={activeBike.id} />
      
      <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '8px 0' }} />
      <SettingsReminders />

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '8px 0' }} />
      <SettingsGarage />

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '8px 0' }} />
      <SettingsVehicle activeBikeId={activeBike.id} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
        <button className="btn-outline" onClick={() => setIsDark(!isDark)}>
          Zmień motyw na {isDark ? 'Jasny' : 'Ciemny'}
        </button>
      </div>
      
      <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '12px 0' }} />
      
      <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Twoje dane są bezpiecznie przechowywane w pamięci urządzenia. Do tworzenia kopii użyj zakładki "Diagnostyka".
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          className="btn-outline" 
          onClick={() => navigate('/diagnostics')}
        >
          Przejdź do Diagnostyki / Kopii zapasowej
        </button>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '30px 0', padding: '0 4px' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Wersja Aplikacji</span>
        <div style={{ textAlign: 'right' }}>
          {/* @ts-ignore */}
          <span style={{ color: '#00C3FF', fontSize: '0.9rem', fontWeight: 'bold' }}>v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.x.x'} ⓘ</span>
          <br/>
          <button onClick={() => { if ((window as any).showChangelogModal) (window as any).showChangelogModal('all'); }} style={{ background: 'none', border: 'none', color: '#FF9800', textDecoration: 'underline', marginTop: '6px', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}>
            Zobacz co nowego (Changelog)
          </button>
        </div>
      </div>
    </div>
  );
}
