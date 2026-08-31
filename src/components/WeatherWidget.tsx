import { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, Loader2, CloudLightning, Snowflake, RefreshCw } from 'lucide-react';

interface WeatherData {
  temp: number;
  description: string;
  code: number;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchWeatherApi = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
      const data = await res.json();
      
      let desc = 'Nieznana';
      const code = data.current.weather_code;
      
      if (code === 0) desc = 'Bezchmurnie';
      else if (code >= 1 && code <= 3) desc = 'Zachmurzenie';
      else if (code >= 51 && code <= 67) desc = 'Deszcz';
      else if (code >= 71 && code <= 77) desc = 'Śnieg';
      else if (code >= 95) desc = 'Burza';

      setWeather({
        temp: data.current.temperature_2m,
        description: desc,
        code: code
      });
      setError(null);
    } catch (err) {
      setError('Błąd API');
    } finally {
      setLoading(false);
    }
  };

  const loadWeatherFromGPS = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError('Brak geolokalizacji');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        localStorage.setItem('weatherLastLat', lat.toString());
        localStorage.setItem('weatherLastLon', lon.toString());
        fetchWeatherApi(lat, lon);
      },
      () => {
        setError('Odmowa lokalizacji');
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    const lat = localStorage.getItem('weatherLastLat');
    const lon = localStorage.getItem('weatherLastLon');
    
    if (lat && lon) {
      // Fetch weather from cached coordinates to avoid iOS Safari permission prompt on startup
      fetchWeatherApi(parseFloat(lat), parseFloat(lon));
    } else {
      setLoading(false);
    }
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun size={24} color="#FDB813" />;
    if (code >= 1 && code <= 3) return <Cloud size={24} color="var(--color-text-muted)" />;
    if (code >= 51 && code <= 67) return <CloudRain size={24} color="#4A90E2" />;
    if (code >= 71 && code <= 77) return <Snowflake size={24} color="#E0FFFF" />;
    if (code >= 95) return <CloudLightning size={24} color="#FDB813" />;
    return <Cloud size={24} color="var(--color-text-muted)" />;
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <Loader2 className="spin" size={24} color="var(--color-primary)" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Pogoda: {error}</span>
        <button onClick={loadWeatherFromGPS} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 'bold' }}>Aktualizuj pozycję</button>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button onClick={loadWeatherFromGPS} className="btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 16px', fontSize: '0.9rem' }}>
          <Sun size={18} /> Sprawdź pogodę
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
      <button 
        onClick={loadWeatherFromGPS}
        style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
        title="Aktualizuj lokalizację (GPS)"
      >
        <RefreshCw size={14} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {getWeatherIcon(weather.code)}
        <div>
          <h4 style={{ margin: '0 0 2px 0', fontSize: '1.1rem' }}>{weather.temp}°C</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{weather.description}</p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Lokalna pogoda</p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-primary)' }}>Warunki do jazdy: {weather.code < 50 ? 'Dobre' : 'Złe'}</p>
      </div>
    </div>
  );
}
