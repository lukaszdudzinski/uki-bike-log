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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '30px 0', padding: '0 4px' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Wersja Aplikacji</span>
        <div style={{ textAlign: 'right' }}>
          {/* @ts-ignore */}
          <span style={{ color: '#00C3FF', fontSize: '0.9rem', fontWeight: 'bold' }}>v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.x.x'} ⓘ</span>
          <br/>
          <button id="trigger-changelog-modal" onClick={fetchChangelog} style={{ background: 'none', border: 'none', color: '#FF9800', textDecoration: 'underline', marginTop: '6px', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}>
            Zobacz co nowego (Changelog)
          </button>
        </div>
      </div>

      {/* Changelog Modal */}
      {isChangelogOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0, 0, 0, 0.85)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a', // Ciemne tło jak w BodyBuild
            border: '1px solid #333',
            borderRadius: '12px',
            width: '100%', maxWidth: '500px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#00C3FF', fontSize: '1.2rem' }}>Co nowego? 🚀</h3>
              <button onClick={() => setIsChangelogOpen(false)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>&times;</button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {changelogData.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {changelogData.map((release, idx) => (
                    <div key={idx}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1.05rem' }}>
                        Wersja {release.version} <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.85em' }}>({release.date})</span>
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#aaa', fontSize: '0.95rem' }}>
                        {release.changes.map((change: string, i: number) => (
                          <li key={i} style={{ marginBottom: '10px', lineHeight: '1.4' }}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-muted)' }}>Brak danych o zmianach.</p>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid #333', background: '#1a1a1a' }}>
              <button 
                style={{ 
                  width: '100%', padding: '14px', fontSize: '1.1rem', fontWeight: 'bold',
                  background: '#FF9800', color: '#000', border: 'none', borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setIsChangelogOpen(false);
                  if ((window as any).PWAUpdateUI) (window as any).PWAUpdateUI.doPwaUpdate();
                }}
              >
                Zaktualizuj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
