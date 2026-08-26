import { Target, Clock, Activity, Fuel, Navigation } from 'lucide-react';

interface DrivingStatsProps {
  glassClass: string;
  tripDistance: number;
  rideTimeSec: number;
  avgConsumption: number;
  estimatedFuelConsumed: number;
  nearestGasDist: number | null;
  estimatedRange: number;
  nearestGasCoords: { lat: number; lng: number } | null;
}

export function DrivingStats({
  glassClass,
  tripDistance,
  rideTimeSec,
  avgConsumption,
  estimatedFuelConsumed,
  nearestGasDist,
  estimatedRange,
  nearestGasCoords
}: DrivingStatsProps) {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  return (
    <div className="dm-stats-grid">
      
      <div className={`dm-stat-card ${glassClass}`}>
        <div className="dm-stat-title"><Target size={18} /> TRIP</div>
        <div>
          <span className="dm-stat-value">{tripDistance.toFixed(1)}</span> <span className="dm-stat-unit">km</span>
        </div>
      </div>

      <div className={`dm-stat-card ${glassClass}`}>
        <div className="dm-stat-title"><Clock size={18} /> CZAS JAZDY</div>
        <div className="dm-stat-value">{formatTime(rideTimeSec)}</div>
      </div>

      <div className={`dm-stat-card ${glassClass}`}>
        <div className="dm-stat-title"><Activity size={18} /> SPALANIE</div>
        <div>
          <span className="dm-stat-value">{estimatedFuelConsumed.toFixed(1)}</span> <span className="dm-stat-unit">L</span>
        </div>
        {avgConsumption > 0 ? (
          <div className="dm-stat-desc">Bazując na {avgConsumption.toFixed(1)} L/100km</div>
        ) : (
          <div className="dm-stat-desc">Brak historii spalania</div>
        )}
      </div>

      <div className={`dm-stat-card ${glassClass}`}>
        <div className="dm-stat-title"><Fuel size={18} /> NAJBLIŻSZA CPN</div>
        <div>
          <span className="dm-stat-value">
            {nearestGasDist !== null ? nearestGasDist.toFixed(1) : '--'}
          </span> <span className="dm-stat-unit">km</span>
        </div>
        {avgConsumption > 0 && (
          <div className="dm-stat-desc">Zasięg max: {estimatedRange.toFixed(0)} km</div>
        )}
        {nearestGasCoords && (
          <button 
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${nearestGasCoords.lat},${nearestGasCoords.lng}`, '_blank')}
            style={{
              marginTop: 'auto',
              background: 'var(--color-primary)', border: 'none', borderRadius: '8px', padding: '8px',
              color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifySelf: 'center', width: '100%', gap: '4px', cursor: 'pointer'
            }}
          >
            <Navigation size={14} /> Prowadź
          </button>
        )}
      </div>
    </div>
  );
}
