import { type BikeSettings } from '../services/storage';

interface TireWidgetProps {
  settings: BikeSettings;
  odo: number;
  setActiveTab: (tab: string) => void;
}

export default function TireWidget({ settings, odo, setActiveTab }: TireWidgetProps) {
  if (!settings.frontTire && !settings.rearTire) {
    return (
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
        <h3 style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <img src={`${import.meta.env.BASE_URL}bike-icon.png`} alt="Bike" style={{ width: '90px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} /> 
          <span>Menedżer Opon</span>
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Nie masz jeszcze dodanych opon. Śledź zużycie bieżnika i roczniki DOT!
        </p>
        <button 
          className="btn-outline" 
          onClick={() => setActiveTab('settings')}
          style={{ padding: '8px', fontSize: '0.9rem', marginTop: '4px' }}
        >
          Dodaj Opony w Opcjach
        </button>
      </div>
    );
  }

  const renderTire = (title: string, tire?: import('../services/storage').TireData) => {
    if (!tire) return null;
    const traveled = odo - tire.installedOdo;
    let percentage = (traveled / tire.expectedLifespanKm) * 100;
    if (percentage > 100) percentage = 100;
    if (percentage < 0) percentage = 0;

    const remaining = tire.expectedLifespanKm - traveled;
    const isWarning = remaining <= 2000;
    const isDanger = remaining <= 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <strong>{title}</strong>
          <span>DOT: {tire.dot}</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
          {tire.model} (Założone przy: {tire.installedOdo} km)
        </div>
        
        {/* Progress Bar */}
        <div style={{ 
          width: '100%', 
          height: '16px', 
          backgroundColor: 'rgba(0,0,0,0.3)', 
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: isDanger ? 'var(--color-danger)' : (isWarning ? 'var(--color-warning)' : 'var(--color-success)'),
            transition: 'width 0.5s ease-out'
          }}></div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '2px', color: isDanger ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
          <span>Zużycie: {percentage.toFixed(1)}%</span>
          <span>{isDanger ? 'Wymień oponę!' : `Zostało ~${remaining} km`}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <img src={`${import.meta.env.BASE_URL}bike-icon.png`} alt="Bike" style={{ width: '90px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} /> 
        <span>Stan Opon</span>
      </h3>
      {renderTire('Przód', settings.frontTire)}
      {renderTire('Tył', settings.rearTire)}
    </div>
  );
}
