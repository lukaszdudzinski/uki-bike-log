import { useState } from 'react';
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

  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [changelogData, setChangelogData] = useState<any[]>([]);

  const fetchChangelog = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}changelog.json?t=` + Date.now());
      const data = await res.json();
      // @ts-ignore
      const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
      const newChanges = data.filter((item: any) => item.version > currentVersion);
      setChangelogData(newChanges.length > 0 ? newChanges : data.slice(0, 1));
      setIsChangelogOpen(true);
    } catch (e) {
      console.error('Failed to fetch changelog', e);
      setIsChangelogOpen(true);
    }
  };

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
      
      <p style={{ textAlign: 'center', margin: '30px 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
        {/* @ts-ignore */}
        Uki's Bike Log v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.x.x'}
        <br/>
        <button id="trigger-changelog-modal" onClick={fetchChangelog} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', marginTop: '8px', cursor: 'pointer' }}>Zobacz co nowego (Changelog)</button>
      </p>

      {/* Changelog Modal */}
      {isChangelogOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.8)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--color-glass-bg)',
            border: '1px solid var(--color-glass-border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '500px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Co nowego?</h3>
              <button onClick={() => setIsChangelogOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {changelogData.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {changelogData.map((release, idx) => (
                    <div key={idx}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Wersja {release.version}</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--color-text-muted)' }}>
                        {release.changes.map((change: string, i: number) => (
                          <li key={i} style={{ marginBottom: '6px' }}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)' }}>Brak danych o zmianach.</p>
              )}
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid var(--color-glass-border)', textAlign: 'center' }}>
              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}
                onClick={() => {
                  setIsChangelogOpen(false);
                  if ((window as any).PWAUpdateUI) (window as any).PWAUpdateUI.doPwaUpdate();
                }}
              >
                Zaktualizuj teraz 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
