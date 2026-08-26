import { AlertTriangle } from 'lucide-react';

interface DrivingSpeedometerProps {
  speed: number | null;
  errorMsg: string;
  leanAngle: number | null;
  glassClass: string;
}

export function DrivingSpeedometer({ speed, errorMsg, leanAngle, glassClass }: DrivingSpeedometerProps) {
  // Speedometer color logic
  let speedColor = 'var(--color-primary)';
  if (speed !== null) {
    if (speed >= 140) speedColor = '#ff3333';
    else if (speed >= 90) speedColor = '#ffcc00';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
      
      {/* Left Lean Indicator */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        opacity: (leanAngle !== null && leanAngle < -2) ? 1 : 0.3, 
        color: 'var(--color-primary)', transition: 'opacity 0.2s',
        width: '60px'
      }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
          {leanAngle !== null && leanAngle < -2 ? Math.abs(leanAngle) : 0}°
        </div>
        <div style={{ fontSize: '0.7rem', letterSpacing: '2px' }}>LEWO</div>
      </div>

      {/* Speedometer Center */}
      <div className={`dm-speedometer ${glassClass}`} style={{ flex: '0 0 auto' }}>
        {errorMsg ? (
          <div style={{ color: '#ffcc00', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={40} />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <>
            <div className="dm-speed-value" style={{ color: speedColor }}>
              {speed !== null ? speed : '--'}
            </div>
            <div className="dm-speed-unit">KM/H</div>
          </>
        )}
      </div>

      {/* Right Lean Indicator */}
      <div style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        opacity: (leanAngle !== null && leanAngle > 2) ? 1 : 0.3, 
        color: 'var(--color-primary)', transition: 'opacity 0.2s',
        width: '60px'
      }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
          {leanAngle !== null && leanAngle > 2 ? leanAngle : 0}°
        </div>
        <div style={{ fontSize: '0.7rem', letterSpacing: '2px' }}>PRAWO</div>
      </div>

    </div>
  );
}
