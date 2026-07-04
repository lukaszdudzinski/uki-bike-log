import { Fuel, AlertTriangle, Map } from 'lucide-react';

interface QuickActionsProps {
  setActiveTab: (tab: string) => void;
}

export default function QuickActions({ setActiveTab }: QuickActionsProps) {
  return (
    <div>
      <h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Szybkie akcje</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <button 
          className="glass-panel" 
          style={{ border: '1px solid var(--color-glass-border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text)', padding: '16px 8px' }}
          onClick={() => setActiveTab('fuel')}
        >
          <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '50%' }}><Fuel size={24} color="var(--color-primary)" /></div>
          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Dodaj paliwo</span>
        </button>
        
        <button 
          className="glass-panel" 
          style={{ border: '1px solid var(--color-glass-border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text)', padding: '16px 8px' }}
          onClick={() => setActiveTab('service')}
        >
          <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '50%' }}><AlertTriangle size={24} color="var(--color-primary)" /></div>
          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Zgłoś usterkę</span>
        </button>

        <button 
          className="glass-panel" 
          style={{ border: '1px solid var(--color-glass-border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text)', padding: '16px 8px' }}
          onClick={() => setActiveTab('routes')}
        >
          <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '50%' }}><Map size={24} color="var(--color-primary)" /></div>
          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Ulubione Trasy</span>
        </button>
      </div>
    </div>
  );
}
