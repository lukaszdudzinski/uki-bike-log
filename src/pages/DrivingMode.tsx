import { useState, useEffect, useRef } from 'react';
import { X, CloudRain, AlertTriangle, Navigation } from 'lucide-react';

interface DrivingModeProps {
  onExit: () => void;
}

export default function DrivingMode({ onExit }: DrivingModeProps) {
  const [speed, setSpeed] = useState<number | null>(null);
  const [time, setTime] = useState<string>('');
  const [rainWarning, setRainWarning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const watchId = useRef<number | null>(null);
  const lastWeatherCheck = useRef<number>(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Watch GPS and check weather
  useEffect(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolokalizacja nie jest wspierana');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Speed is in m/s, convert to km/h
        if (pos.coords.speed !== null) {
          setSpeed(Math.round(pos.coords.speed * 3.6));
        } else {
          setSpeed(0); // If null, assume 0 or hardware doesn't support speed
        }

        // Check weather every 5 minutes (300,000 ms)
        const now = Date.now();
        if (now - lastWeatherCheck.current > 300000) {
          checkWeather(pos.coords.latitude, pos.coords.longitude);
          lastWeatherCheck.current = now;
        }
      },
      () => {
        setErrorMsg('Brak sygnału GPS');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const checkWeather = async (lat: number, lng: number) => {
    try {
      // Open-Meteo is free and doesn't require an API key
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation`);
      const data = await res.json();
      
      if (data && data.current && data.current.precipitation !== undefined) {
        if (data.current.precipitation > 0) {
          setRainWarning(true);
        } else {
          setRainWarning(false);
        }
      }
    } catch (e) {
      console.error('Weather API error in Driving Mode', e);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: rainWarning ? '#8b0000' : '#000000',
        color: '#ffffff',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        animation: rainWarning ? 'flash 2s infinite' : 'none',
        transition: 'background-color 1s ease'
      }}
    >
      <style>{`
        @keyframes flash {
          0% { background-color: #8b0000; }
          50% { background-color: #ff0000; }
          100% { background-color: #8b0000; }
        }
      `}</style>

      {/* Top Bar */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', left: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{time}</div>
        <button 
          onClick={onExit}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          <X size={30} />
        </button>
      </div>

      {/* Main Speedometer */}
      <div style={{ textAlign: 'center', marginTop: '-10vh' }}>
        {errorMsg ? (
          <div style={{ color: '#ffcc00', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={48} />
            {errorMsg}
          </div>
        ) : (
          <>
            <div style={{ fontSize: '8rem', fontWeight: '900', lineHeight: 1, textShadow: '0 0 20px rgba(212,175,55,0.5)', color: 'var(--color-primary)' }}>
              {speed !== null ? speed : '--'}
            </div>
            <div style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '10px' }}>
              km/h
            </div>
          </>
        )}
      </div>

      {/* Weather Warning */}
      {rainWarning && (
        <div style={{ 
          position: 'absolute', 
          bottom: '10vh',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(0,0,0,0.5)',
          padding: '20px 40px',
          borderRadius: '20px',
          border: '2px solid red'
        }}>
          <CloudRain size={48} color="white" />
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'white', textTransform: 'uppercase' }}>Wykryto Opady!</h2>
        </div>
      )}

      {/* GPS Activity Indicator */}
      {!errorMsg && speed === null && (
        <div style={{ position: 'absolute', bottom: '20px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={16} className="spin" /> Szukanie sygnału GPS...
        </div>
      )}
      <style>{`
        .spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
