import { Navigation } from 'lucide-react';

interface MinimizedDrivingViewProps {
  tripDistance: number;
  onRestore: () => void;
}

export function MinimizedDrivingView({ tripDistance, onRestore }: MinimizedDrivingViewProps) {
  return (
    <div 
      onClick={onRestore}
      style={{
        position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)', border: '2px solid var(--color-primary)',
        backdropFilter: 'blur(10px)', padding: '12px 24px', borderRadius: '30px',
        display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10000,
        color: 'var(--color-primary)', fontWeight: 'bold', cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}
    >
      <Navigation size={20} className="spin" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1rem', lineHeight: '1' }}>Wróć do jazdy</span>
        <span style={{ fontSize: '0.7rem', color: '#fff', opacity: 0.8 }}>Trip: {tripDistance.toFixed(1)} km</span>
      </div>
    </div>
  );
}
