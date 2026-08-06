import { useState, useEffect } from 'react';
import { Settings, Fuel, Wrench, BarChart2, Radio as RadioIcon, Pause, Plus, Trash2, Edit2, Coffee } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import FuelLog from './pages/FuelLog';
import ServiceLog from './pages/ServiceLog';
import Stats from './pages/Stats';
import Routes from './pages/Routes';
import DrivingMode from './pages/DrivingMode';
import { storage } from './services/storage';
import { useGarage } from './contexts/GarageContext';

function App() {
  const { bikes, activeBike, isLoading, switchBike, addBike, editBike, deleteBike } = useGarage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(true);
  const [isPlayingRadio, setIsPlayingRadio] = useState(false);
  const [isDrivingMode, setIsDrivingMode] = useState(false);
  
  // Profile state for active bike
  const [avatar, setAvatar] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');

  // Set initial theme and handle notifications
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    if (!isLoading && activeBike) {
      const settings = storage.getSettings();
      setAvatar(settings.avatar || null);
      setNickname(settings.nickname || '');

      // Check for notifications for the active bike
      if ('Notification' in window && Notification.permission === 'granted') {
        const odo = storage.getCurrentOdo();
        const chainTraveled = odo - settings.lastChainOdo;
        
        const lastNotified = localStorage.getItem(`uki_last_notified_${activeBike.id}`);
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (lastNotified !== todayStr) {
          if (chainTraveled >= 700) {
            new Notification(`${activeBike.name} - Łańcuch (RED ALERT)`, { body: `Krytyczny przebieg! Przejechano ${chainTraveled} km bez smarowania!`, icon: '/logo.png' });
            localStorage.setItem(`uki_last_notified_${activeBike.id}`, todayStr);
          } else if (chainTraveled >= 600) {
            new Notification(`${activeBike.name} - Łańcuch (Ostrzeżenie)`, { body: `Uwaga! Przejechano ${chainTraveled} km bez smarowania.`, icon: '/logo.png' });
            localStorage.setItem(`uki_last_notified_${activeBike.id}`, todayStr);
          } else if (chainTraveled >= 500) {
            new Notification(`${activeBike.name} - Łańcuch`, { body: `Czas nasmarować łańcuch. Przejechano ${chainTraveled} km.`, icon: '/logo.png' });
            localStorage.setItem(`uki_last_notified_${activeBike.id}`, todayStr);
          }
        }
      }
    }
  }, [isDark, isLoading, activeBike]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
        const settings = storage.getSettings();
        storage.saveSettings({ ...settings, avatar: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    const settings = storage.getSettings();
    storage.saveSettings({ ...settings, nickname: e.target.value });
  };

  if (isLoading || !activeBike) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ color: 'var(--color-primary)' }}>Uruchamianie silnika...</h2>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-glass-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const renderContent = () => {
    if (isDrivingMode) {
      return <DrivingMode onExit={() => setIsDrivingMode(false)} />;
    }
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} setIsDrivingMode={setIsDrivingMode} />;
      case 'fuel':
        return <FuelLog />;
      case 'service':
        return <ServiceLog />;
      case 'stats':
        return <Stats />;
      case 'routes':
        return <Routes />;
      case 'settings':
        return (
          <div className="glass-panel" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Profile Section */}
            <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Twój Profil</h2>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
              <div 
                style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', 
                  background: avatar ? `url(${avatar}) center/cover` : '#333',
                  border: '2px solid var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}
              >
                {!avatar && <span style={{ fontSize: '2rem' }}>👤</span>}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="btn-outline" style={{ display: 'inline-block', textAlign: 'center', cursor: 'pointer', padding: '6px 12px', fontSize: '0.9rem' }}>
                  Zmień Awatar
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Twój Nick..." 
                  value={nickname}
                  onChange={handleNicknameChange}
                  style={{ padding: '8px', fontSize: '1rem' }}
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '8px 0' }} />

            {/* Garage Management Section */}
            <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Mój Garaż</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  className="input-field" 
                  value={activeBike.id}
                  onChange={(e) => switchBike(e.target.value)}
                  style={{ flex: 1 }}
                >
                  {bikes.map(bike => (
                    <option key={bike.id} value={bike.id}>{bike.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => {
                    const newName = prompt('Wpisz nazwę nowego motocykla:');
                    if (newName && newName.trim().length > 0) {
                      addBike(newName.trim());
                    }
                  }}
                >
                  <Plus size={18} /> Dodaj pojazd
                </button>
                <button 
                  className="btn-outline"
                  title="Zmień nazwę"
                  style={{ padding: '8px' }}
                  onClick={() => {
                    const newName = prompt('Nowa nazwa dla tego pojazdu:', activeBike.name);
                    if (newName && newName.trim().length > 0) {
                      editBike(activeBike.id, newName.trim());
                    }
                  }}
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  className="btn-outline"
                  title="Usuń pojazd"
                  style={{ padding: '8px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                  onClick={() => {
                    if (bikes.length === 1) {
                      alert('Nie możesz usunąć jedynego pojazdu w garażu!');
                      return;
                    }
                    if (confirm(`UWAGA! Czy na pewno chcesz trwale usunąć motocykl "${activeBike.name}" oraz WSZYSTKIE jego dane (tankowania, serwis)? Tej operacji nie można cofnąć!`)) {
                      deleteBike(activeBike.id);
                    }
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '8px 0' }} />

            <h2 style={{ margin: 0 }}>Ustawienia i Terminy</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Dotyczy: {activeBike.name}</p>
            
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Stan początkowy licznika (km)</label>
              <input type="number" className="input-field" id="settings-odo" defaultValue={storage.getSettings().initialOdo} />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Pojemność baku (Litry)</label>
              <input type="number" step="0.1" className="input-field" id="settings-tank-capacity" defaultValue={storage.getSettings().tankCapacity || 13.5} />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Wygasa ubezpieczenie OC</label>
              <input type="date" className="input-field" id="settings-oc" defaultValue={storage.getSettings().insuranceExpiry} />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Wygasa ubezpieczenie AC</label>
              <input type="date" className="input-field" id="settings-ac" defaultValue={storage.getSettings().insuranceAcExpiry} />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Data ostatniego przeglądu (wyliczy kolejny +1 rok)</label>
              <input type="date" className="input-field" id="settings-inspection" defaultValue={storage.getSettings().lastInspectionDate} />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '8px 0' }} />
            <h3 style={{ margin: '0', fontSize: '1.1rem' }}>Interwały Serwisowe</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Wymiana oleju (km)</label>
                <input type="number" className="input-field" id="settings-oil-odo" defaultValue={storage.getSettings().lastServiceOdo} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Wymiana oleju (Data)</label>
                <input type="date" className="input-field" id="settings-oil-date" defaultValue={storage.getSettings().lastServiceDate} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Luzy zaworowe (km)</label>
                <input type="number" className="input-field" id="settings-valve-odo" defaultValue={storage.getSettings().lastValveClearanceOdo} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Smarowanie łańcucha (km)</label>
                <input type="number" className="input-field" id="settings-chain-odo" defaultValue={storage.getSettings().lastChainOdo} />
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ marginTop: '10px' }}
              onClick={() => {
                const odoVal = Number((document.getElementById('settings-odo') as HTMLInputElement).value);
                const tankCapVal = Number((document.getElementById('settings-tank-capacity') as HTMLInputElement).value);
                const ocVal = (document.getElementById('settings-oc') as HTMLInputElement).value;
                const acVal = (document.getElementById('settings-ac') as HTMLInputElement).value;
                const inspVal = (document.getElementById('settings-inspection') as HTMLInputElement).value;
                
                const oilOdo = Number((document.getElementById('settings-oil-odo') as HTMLInputElement).value);
                const oilDate = (document.getElementById('settings-oil-date') as HTMLInputElement).value;
                const valveOdo = Number((document.getElementById('settings-valve-odo') as HTMLInputElement).value);
                const chainOdo = Number((document.getElementById('settings-chain-odo') as HTMLInputElement).value);

                if (!isNaN(odoVal) && !isNaN(tankCapVal) && ocVal && acVal && inspVal && !isNaN(oilOdo) && oilDate && !isNaN(valveOdo) && !isNaN(chainOdo)) {
                  const currentSettings = storage.getSettings();
                  storage.saveSettings({ 
                    ...currentSettings, 
                    initialOdo: odoVal,
                    tankCapacity: tankCapVal,
                    insuranceExpiry: ocVal,
                    insuranceAcExpiry: acVal,
                    lastInspectionDate: inspVal,
                    lastServiceOdo: oilOdo,
                    lastServiceDate: oilDate,
                    lastValveClearanceOdo: valveOdo,
                    lastChainOdo: chainOdo
                  });
                  alert('Zaktualizowano ustawienia i terminy dla tego pojazdu.');
                } else {
                  alert('Wypełnij poprawnie wszystkie pola.');
                }
              }}
            >
              Zapisz Ustawienia
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <button className="btn-outline" onClick={() => setIsDark(!isDark)}>
                Zmień motyw na {isDark ? 'Jasny' : 'Ciemny'}
              </button>
              
              <button className="btn-outline" onClick={() => {
                if ('Notification' in window) {
                  Notification.requestPermission().then(perm => {
                    if (perm === 'granted') alert('Powiadomienia włączone!');
                    else alert('Powiadomienia zostały zablokowane.');
                  });
                } else {
                  alert('Twoja przeglądarka nie obsługuje powiadomień.');
                }
              }}>
                Włącz powiadomienia (przypomnienia)
              </button>
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '12px 0' }} />
            
            <h3 style={{ margin: '0 0 8px 0' }}>Zarządzanie Danymi</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Twoje dane są bezpiecznie przechowywane w pamięci urządzenia. Kopia zapasowa pobierze dane WSZYSTKICH motocykli.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="btn-outline" 
                onClick={() => storage.exportBackup()}
              >
                Pobierz Kopię Zapasową (Wszystkie Pojazdy)
              </button>
              
              <label className="btn-outline" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
                Wgraj Kopię Zapasową
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      const text = event.target?.result as string;
                      if (confirm('UWAGA: Wgranie kopii nadpisze wszystkie obecne dane we wszystkich garażach. Kontynuować?')) {
                        const success = await storage.importBackup(text);
                        if (success) {
                          alert('Wgrano kopię zapasową pomyślnie!');
                          window.location.reload();
                        } else {
                          alert('Błąd podczas wgrywania pliku. Plik jest uszkodzony lub ma zły format.');
                        }
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }} 
                />
              </label>
            </div>
            
            <p style={{ textAlign: 'center', marginTop: '30px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Uki Bike Log v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.x.x'} (Radar & Garaż)
            </p>
          </div>
        );
      default:
        return <Dashboard setActiveTab={setActiveTab} setIsDrivingMode={setIsDrivingMode} />;
    }
  };

  return (
    <div className="app-container">
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
            onClick={() => setActiveTab('dashboard')}
          >
            <img className="pulse-glow" src={`${import.meta.env.BASE_URL}logo.png`} alt="Uki Logo" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--color-primary)' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div style={{ width: '100%' }}>
              <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Uki <span style={{ color: 'var(--color-primary)' }}>Bike Log</span></h1>
              
              {/* Garage Dropdown Header */}
              <select 
                value={activeBike.id}
                onChange={(e) => {
                  e.stopPropagation();
                  switchBike(e.target.value);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  padding: '2px 0',
                  marginTop: '2px',
                  cursor: 'pointer',
                  outline: 'none',
                  width: '90%',
                  textOverflow: 'ellipsis'
                }}
              >
                {bikes.map(bike => (
                  <option key={bike.id} value={bike.id} style={{ color: '#000' }}>
                    {bike.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => {
                const audio = document.getElementById('global-radio-player') as HTMLAudioElement;
                if (isPlayingRadio) {
                  audio.pause();
                } else {
                  audio.play();
                }
                setIsPlayingRadio(!isPlayingRadio);
              }}
              style={{
                width: '44px', height: '44px', borderRadius: '50%', 
                backgroundColor: isPlayingRadio ? 'var(--color-primary-light)' : 'var(--color-glass-bg)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${isPlayingRadio ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
              {isPlayingRadio ? <Pause size={20} color="var(--color-primary)" /> : <RadioIcon size={20} color="var(--color-primary)" />}
            </button>
            {isPlayingRadio && (
              <div style={{
                position: 'absolute', top: '0', right: '0', 
                width: '10px', height: '10px', borderRadius: '50%', 
                backgroundColor: 'var(--color-success)',
                border: '2px solid var(--color-bg)',
                boxShadow: '0 0 8px var(--color-success)'
              }}></div>
            )}
          </div>
        </header>

        <audio id="global-radio-player" src="https://stream.rcs.revma.com/ye5kghkgcm0uv" preload="none"></audio>

        {/* Use key to force unmount/remount of children when active bike changes, to reset internal component states if needed */}
        <div key={activeBike.id}>
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '600px',
        backgroundColor: 'var(--color-glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-glass-border)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 0 calc(12px + env(safe-area-inset-bottom))',
        zIndex: 1000
      }}>
        <NavItem 
          icon={<Settings size={24} />} 
          label="Pulpit" 
          isActive={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
        />
        <NavItem 
          icon={<Fuel size={24} />} 
          label="Paliwo" 
          isActive={activeTab === 'fuel'} 
          onClick={() => setActiveTab('fuel')} 
        />
        <NavItem 
          icon={<Wrench size={24} />} 
          label="Serwis" 
          isActive={activeTab === 'service'} 
          onClick={() => setActiveTab('service')} 
        />
        <NavItem 
          icon={<BarChart2 size={24} />} 
          label="Statystyki" 
          isActive={activeTab === 'stats'} 
          onClick={() => setActiveTab('stats')} 
        />
        <NavItem 
          icon={<Settings size={24} />} 
          label="Opcje" 
          isActive={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
        />
        <a 
          href="https://suppi.pl/ukidives" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <NavItem 
            icon={<Coffee size={24} />} 
            label="Kawa" 
            isActive={false} 
            onClick={() => {}} 
          />
        </a>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
        cursor: 'pointer',
        transition: 'color 0.2s ease',
        padding: '0 12px'
      }}
    >
      {icon}
      <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 400 }}>{label}</span>
    </button>
  );
}

export default App;

