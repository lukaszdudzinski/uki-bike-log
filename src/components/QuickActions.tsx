import { Fuel, AlertTriangle, Navigation } from 'lucide-react';

interface QuickActionsProps {
  setActiveTab: (tab: string) => void;
  onStartNavigation?: () => void;
}

const btnStyle: React.CSSProperties = {
  border: '1px solid var(--color-glass-border)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  color: 'var(--color-text)',
  padding: '16px 8px',
};

export default function QuickActions({ setActiveTab }: QuickActionsProps) {
  return (
    <div>
      <h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Szybkie akcje</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>

        <button className="glass-panel" style={btnStyle} onClick={() => setActiveTab('fuel')}>
          <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '50%' }}>
            <Fuel size={24} color="var(--color-primary)" />
          </div>
          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Dodaj paliwo</span>
        </button>

        <button className="glass-panel" style={btnStyle} onClick={() => setActiveTab('service')}>
          <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '50%' }}>
            <AlertTriangle size={24} color="var(--color-primary)" />
          </div>
          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Zgłoś usterkę</span>
        </button>

        {/* Trasy i Nawigacja */}
        <button
          className="glass-panel"
          style={{ ...btnStyle, borderColor: 'rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.06)' }}
          onClick={() => setActiveTab('routes')}
        >
          <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '50%' }}>
            <Navigation size={24} color="var(--color-primary)" />
          </div>
          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Trasy i Cele</span>
        </button>

      </div>
    </div>
  );
}
