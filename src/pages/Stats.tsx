import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { storage } from '../services/storage';
import { Calculator } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Stats() {
  const [avgConsumption, setAvgConsumption] = useState<number | null>(null);
  const [lastFuelPrice, setLastFuelPrice] = useState<number>(6.50);
  const [calcDistance, setCalcDistance] = useState<number | ''>('');

  useEffect(() => {
    setAvgConsumption(storage.getAverageConsumption());
    const logs = storage.getFuelLogs();
    if (logs.length > 0) {
      // average price per liter from last tanking
      const latest = logs[0];
      setLastFuelPrice(latest.price / latest.liters);
    }
  }, []);

  // Prepare chart data (simple example: last 5 tankings)
  const logs = storage.getFuelLogs().slice(0, 5).reverse();
  const labels = logs.map(l => new Date(l.date).toLocaleDateString());
  const fuelCosts = logs.map(l => l.price);

  const costData = {
    labels,
    datasets: [
      {
        label: 'Koszt (PLN)',
        data: fuelCosts,
        backgroundColor: 'rgba(201, 160, 80, 0.6)',
        borderColor: '#C9A050',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Trip Calculator */}
      <div className="glass-panel">
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calculator color="var(--color-primary)" /> Kalkulator podróży
        </h3>
        
        {!avgConsumption ? (
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Dodaj minimum dwa tankowania do pełna, aby obliczyć średnie spalanie.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Twoje średnie spalanie: <strong>{avgConsumption.toFixed(2)} l/100km</strong></p>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Dystans wycieczki (km)</label>
              <input 
                type="number" 
                className="input-field" 
                value={calcDistance}
                onChange={(e) => setCalcDistance(e.target.value ? Number(e.target.value) : '')}
                placeholder="np. 350"
              />
            </div>
            
            {calcDistance && (
              <div style={{ padding: '12px', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>Szacowane zużycie: <strong>{((Number(calcDistance) / 100) * avgConsumption).toFixed(1)} L</strong></p>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Szacowany koszt: <strong>{(((Number(calcDistance) / 100) * avgConsumption) * lastFuelPrice).toFixed(2)} PLN</strong></p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="glass-panel">
        <h3 style={{ margin: '0 0 16px 0' }}>Wydatki paliwowe (ostatnie 5)</h3>
        {logs.length > 0 ? (
          <Bar data={costData} options={chartOptions} />
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>Brak danych do wykresu.</p>
        )}
      </div>

    </div>
  );
}
