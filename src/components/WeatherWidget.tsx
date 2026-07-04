import { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, Loader2, CloudLightning, Snowflake } from 'lucide-react';

interface WeatherData {
  temp: number;
  description: string;
  code: number;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Brak geolokalizacji');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
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
        } catch (err) {
          setError('Błąd API');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Odmowa lokalizacji');
        setLoading(false);
      }
    );
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
      <div className="glass-panel" style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Pogoda niedostępna ({error})
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
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
