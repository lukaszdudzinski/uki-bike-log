import { useState, useEffect } from 'react';
import { Settings, Fuel, Wrench, BarChart2, Radio as RadioIcon, Pause, Plus, Trash2, Edit2, Coffee, Home } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import FuelLog from './pages/FuelLog';
import ServiceLog from './pages/ServiceLog';
import Stats from './pages/Stats';
import Routes from './pages/Routes';
import DrivingMode from './pages/DrivingMode';
import Diagnostics from './pages/Diagnostics';
import { storage } from './services/storage';
import { useGarage } from './contexts/GarageContext';

function App() {
  const { bikes, activeBike, isLoading, switchBike, addBike, editBike, deleteBike, updateBikeCoverPhoto } = useGarage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(true);
  const [isPlayingRadio, setIsPlayingRadio] = useState(false);
  const [isDrivingMode, setIsDrivingMode] = useState(false);
  
  // Profile state for active bike
  const [avatar, setAvatar] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [liquidGlass, setLiquidGlass] = useState<boolean>(true);
  const [rainWarningRadius, setRainWarningRadius] = useState<number>(10);

  // Changelog modal state
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [changelogData, setChangelogData] = useState<any[]>([]);

  const fetchChangelog = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}changelog.json?t=` + Date.now());
      const data = await res.json();
      const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
      const newChanges = data.filter((item: any) => item.version > currentVersion);
      setChangelogData(newChanges.length > 0 ? newChanges : data.slice(0, 1));
      setIsChangelogOpen(true);
    } catch (e) {
      console.error('Failed to fetch changelog', e);
      setIsChangelogOpen(true);
    }
  };

  // Set initial theme and handle notifications
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    if (!isLoading && activeBike) {
      const settings = storage.getSettings();
      const profile = storage.getUserProfile();
      setAvatar(profile.avatar || null);
      setNickname(profile.nickname || '');
      setLiquidGlass(profile.liquidGlassEnabled !== false);
      setRainWarningRadius(profile.rainWarningRadius || 10);

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
        const profile = storage.getUserProfile();
        storage.saveUserProfile({ ...profile, avatar: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    const profile = storage.getUserProfile();
    storage.saveUserProfile({ ...profile, nickname: e.target.value });
  };

  const handleLiquidGlassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLiquidGlass(e.target.checked);
    const profile = storage.getUserProfile();
    storage.saveUserProfile({ ...profile, liquidGlassEnabled: e.target.checked });
  };

  const handleRainWarningRadiusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    setRainWarningRadius(val);
    const profile = storage.getUserProfile();
    storage.saveUserProfile({ ...profile, rainWarningRadius: val });
  };

  const handleCoverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeBike) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateBikeCoverPhoto(activeBike.id, base64String);
      };
      reader.readAsDataURL(file);
    }
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
      case 'diagnostics':
        return <Diagnostics />;
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={liquidGlass} 
                    onChange={handleLiquidGlassChange} 
                    style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                  />
                  Efekt Liquid Glass (Głębia interfejsu)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', marginTop: '4px' }}>
                  <select 
                    value={rainWarningRadius}
                    onChange={handleRainWarningRadiusChange}
                    style={{ background: 'var(--color-bg)', color: '#fff', border: '1px solid var(--color-glass-border)', padding: '4px', borderRadius: '4px' }}
                  >
                    <option value="10">10 km</option>
                    <option value="30">30 km</option>
                    <option value="50">50 km</option>
                  </select>
                  Promień ostrzegania przed burzą
                </label>
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

              {/* Cover Photo UI */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '120px',
                borderRadius: '12px',
                background: activeBike.coverPhoto ? `url(${activeBike.coverPhoto}) center/cover` : 'rgba(0,0,0,0.3)',
                border: '1px dashed var(--color-glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: activeBike.coverPhoto ? 'rgba(0,0,0,0.5)' : 'transparent',
                  pointerEvents: 'none'
                }}></div>
                <label className="btn-outline" style={{ position: 'relative', zIndex: 1, cursor: 'pointer', padding: '8px 16px', background: 'var(--color-glass-bg)', backdropFilter: 'blur(10px)' }}>
                  {activeBike.coverPhoto ? 'Zmień Tapetę (Cover)' : 'Dodaj Tapetę Motocykla'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverPhotoUpload} />
                </label>
                {activeBike.coverPhoto && (
                  <button 
                    onClick={() => updateBikeCoverPhoto(activeBike.id, null)} 
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', zIndex: 2 }}
                    title="Usuń tapetę"
                  >
                    &times;
                  </button>
                )}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Koszt ubezp. (PLN)</label>
                <input type="number" step="0.01" className="input-field" id="settings-ins-cost" defaultValue={storage.getSettings().insuranceCost || ''} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Ubezpieczyciel</label>
                <input type="text" className="input-field" id="settings-ins-name" placeholder="np. PZU" defaultValue={storage.getSettings().insurerName || ''} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Numer Polisy</label>
                <input type="text" className="input-field" id="settings-ins-policy" placeholder="Nr..." defaultValue={storage.getSettings().policyNumber || ''} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Infolinia (Telefon)</label>
                <input type="text" className="input-field" id="settings-ins-hotline" placeholder="Nr asysty..." defaultValue={storage.getSettings().insuranceHotline || ''} />
              </div>
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
                
                const insCostValStr = (document.getElementById('settings-ins-cost') as HTMLInputElement).value;
                const insCostVal = insCostValStr ? Number(insCostValStr) : undefined;
                const insNameVal = (document.getElementById('settings-ins-name') as HTMLInputElement).value;
                const insPolicyVal = (document.getElementById('settings-ins-policy') as HTMLInputElement).value;
                const insHotlineVal = (document.getElementById('settings-ins-hotline') as HTMLInputElement).value;
                
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
                    insuranceCost: insCostVal,
                    insurerName: insNameVal,
                    policyNumber: insPolicyVal,
                    insuranceHotline: insHotlineVal,
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
            
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Twoje dane są bezpiecznie przechowywane w pamięci urządzenia. Do tworzenia kopii użyj zakładki "Diagnostyka".
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="btn-outline" 
                onClick={() => setActiveTab('diagnostics')}
              >
                Przejdź do Diagnostyki / Kopii zapasowej
              </button>
              <a 
                href="https://suppi.pl/ukidives" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <button className="btn-outline" style={{ width: '100%', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                  <Coffee size={18} /> Postaw mi Kawę ☕
                </button>
              </a>
            </div>
            
            <p style={{ textAlign: 'center', margin: '30px 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Uki's Bike Log v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.x.x'}
              <br/>
              <button id="trigger-changelog-modal" onClick={fetchChangelog} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', marginTop: '8px', cursor: 'pointer' }}>Zobacz co nowego (Changelog)</button>
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
              <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Uki's <span style={{ color: 'var(--color-primary)' }}>Bike Log</span></h1>
              
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
        width: '100%',
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
          icon={<Home size={24} />} 
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
      </nav>
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

