import { useState, useEffect, Suspense, lazy } from 'react';
import { Settings, Fuel, Wrench, BarChart2, Radio as RadioIcon, Pause, Home, ChevronDown } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useGarage } from './contexts/GarageContext';
import { checkAndFireNotifications } from './utils/notifications';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy loading pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FuelLog = lazy(() => import('./pages/FuelLog'));
const ServiceLog = lazy(() => import('./pages/ServiceLog'));
const Stats = lazy(() => import('./pages/Stats'));
const RoutesPage = lazy(() => import('./pages/Routes'));
const Diagnostics = lazy(() => import('./pages/Diagnostics'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const DrivingMode = lazy(() => import('./pages/DrivingMode'));

function App() {
  const { bikes, activeBike, isLoading, switchBike } = useGarage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isDark, setIsDark] = useState(true);
  const [isPlayingRadio, setIsPlayingRadio] = useState(false);
  const [isDrivingMode, setIsDrivingMode] = useState(false);

  // Set initial theme and handle notifications
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    if (!isLoading && activeBike) {
      checkAndFireNotifications();
    }
  }, [isDark, isLoading, activeBike]);

  if (isLoading || !activeBike) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ color: 'var(--color-primary)' }}>Uruchamianie silnika...</h2>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-glass-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    navigate(tab === 'dashboard' ? '/' : `/${tab}`);
  };

  const getActiveTabStr = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    return path.substring(1);
  };

  const activeTab = getActiveTabStr();

  return (
    <div className="app-container">
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
            onClick={() => handleTabChange('dashboard')}
          >
            <img className="pulse-glow" src={`${import.meta.env.BASE_URL}logo.png`} alt="Uki Logo" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--color-primary)' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div style={{ width: '100%' }}>
              <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Uki's <span style={{ color: 'var(--color-primary)' }}>Bike Log</span></h1>
              
              {/* Garage Dropdown Header */}
              <div style={{ position: 'relative', width: 'fit-content' }}>
                <select 
                  value={activeBike.id}
                  onChange={(e) => {
                    e.stopPropagation();
                    switchBike(e.target.value);
                  }}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--color-glass-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    padding: '4px 28px 4px 8px',
                    marginTop: '4px',
                    cursor: 'pointer',
                    outline: 'none',
                    textOverflow: 'ellipsis',
                    maxWidth: '200px'
                  }}
                >
                  {bikes.map(bike => (
                    <option key={bike.id} value={bike.id} style={{ color: '#000' }}>
                      {bike.name}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={14} 
                  color="var(--color-text-muted)" 
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', marginTop: '2px' }} 
                />
              </div>
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
        <div key={activeBike.id} style={{ paddingBottom: isDrivingMode ? '140px' : '0' }}>
          <ErrorBoundary>
            <Suspense fallback={<div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-primary)' }}>Ładowanie modułu...</div>}>
              <Routes>
                <Route path="/" element={<Dashboard setActiveTab={handleTabChange} setIsDrivingMode={setIsDrivingMode} />} />
                <Route path="/fuel" element={<FuelLog />} />
                <Route path="/service" element={<ServiceLog />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/routes" element={<RoutesPage />} />
                <Route path="/diagnostics" element={<Diagnostics />} />
                <Route path="/settings" element={<SettingsPage isDark={isDark} setIsDark={setIsDark} />} />
                <Route path="*" element={<Dashboard setActiveTab={handleTabChange} setIsDrivingMode={setIsDrivingMode} />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {isDrivingMode && (
        <Suspense fallback={null}>
          <DrivingMode onExit={() => setIsDrivingMode(false)} />
        </Suspense>
      )}

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
          isActive={activeTab === 'dashboard' || activeTab === ''} 
          onClick={() => handleTabChange('dashboard')} 
        />
        <NavItem 
          icon={<Fuel size={24} />} 
          label="Paliwo" 
          isActive={activeTab === 'fuel'} 
          onClick={() => handleTabChange('fuel')} 
        />
        <NavItem 
          icon={<Wrench size={24} />} 
          label="Serwis" 
          isActive={activeTab === 'service'} 
          onClick={() => handleTabChange('service')} 
        />
        <NavItem 
          icon={<BarChart2 size={24} />} 
          label="Statystyki" 
          isActive={activeTab === 'stats'} 
          onClick={() => handleTabChange('stats')} 
        />
        <NavItem 
          icon={<Settings size={24} />} 
          label="Opcje" 
          isActive={activeTab === 'settings' || activeTab === 'diagnostics'} 
          onClick={() => handleTabChange('settings')} 
        />
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
