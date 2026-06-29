import { useState, useEffect } from 'react';
import { Settings, Fuel, Wrench, Bell } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import FuelLog from './pages/FuelLog';
import ServiceLog from './pages/ServiceLog';
import { storage } from './services/storage';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(true);

  // Set initial theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'fuel':
        return <FuelLog />;
      case 'service':
        return <ServiceLog />;
      case 'settings':
        return (
          <div className="glass-panel" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0 }}>Ustawienia i Terminy</h2>
            
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Stan początkowy licznika (km)</label>
              <input type="number" className="input-field" id="settings-odo" defaultValue={storage.getSettings().initialOdo} />
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

            <button 
              className="btn-primary" 
              style={{ marginTop: '10px' }}
              onClick={() => {
                const odoVal = Number((document.getElementById('settings-odo') as HTMLInputElement).value);
                const ocVal = (document.getElementById('settings-oc') as HTMLInputElement).value;
                const acVal = (document.getElementById('settings-ac') as HTMLInputElement).value;
                const inspVal = (document.getElementById('settings-inspection') as HTMLInputElement).value;

                if (!isNaN(odoVal) && ocVal && acVal && inspVal) {
                  const currentSettings = storage.getSettings();
                  storage.saveSettings({ 
                    ...currentSettings, 
                    initialOdo: odoVal,
                    insuranceExpiry: ocVal,
                    insuranceAcExpiry: acVal,
                    lastInspectionDate: inspVal
                  });
                  alert('Zaktualizowano ustawienia i terminy. Otwórz pulpit aby zobaczyć zmianę.');
                } else {
                  alert('Wypełnij poprawnie wszystkie pola.');
                }
              }}
            >
              Zapisz Ustawienia
            </button>

            <button className="btn-outline" style={{marginTop: '10px'}} onClick={() => setIsDark(!isDark)}>
              Zmień motyw na {isDark ? 'Jasny' : 'Ciemny'}
            </button>
          </div>
        );
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onClick={() => setActiveTab('dashboard')}
          >
            <img className="pulse-glow" src={`${import.meta.env.BASE_URL}logo.png`} alt="Uki Logo" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--color-primary)' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Uki <span style={{ color: 'var(--color-primary)' }}>Bike Log</span></h1>
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Royal Enfield Bullet 350</p>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', 
              backgroundColor: 'var(--color-glass-bg)', display: 'flex', 
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--color-glass-border)'
            }}>
              <Bell size={20} color="var(--color-primary)" />
            </div>
            {/* Notification dot */}
            <div style={{
              position: 'absolute', top: '0', right: '0', 
              width: '10px', height: '10px', borderRadius: '50%', 
              backgroundColor: 'var(--color-danger)',
              border: '2px solid var(--color-bg)'
            }}></div>
          </div>
        </header>

        {renderContent()}
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
          icon={<Settings size={24} />} 
          label="Opcje" 
          isActive={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
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
