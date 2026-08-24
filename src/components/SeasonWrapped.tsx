import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Trophy, X, Calendar, Droplet, Wrench, Navigation } from 'lucide-react';

interface SeasonWrappedProps {
  onClose: () => void;
}

export default function SeasonWrapped({ onClose }: SeasonWrappedProps) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [step, setStep] = useState<number>(0);

  // Stats
  const [totalKm, setTotalKm] = useState(0);
  const [totalFuelLiters, setTotalFuelLiters] = useState(0);
  const [totalFuelCost, setTotalFuelCost] = useState(0);
  const [refuelsCount, setRefuelsCount] = useState(0);
  const [serviceCost, setServiceCost] = useState(0);

  useEffect(() => {
    const fuelLogs = storage.getFuelLogs().filter(l => new Date(l.date).getFullYear() === year);
    const serviceLogs = storage.getServiceLogs().filter(s => new Date(s.date).getFullYear() === year);

    let liters = 0;
    let fuelCost = 0;
    fuelLogs.forEach(l => {
      liters += l.liters;
      fuelCost += l.price;
    });

    let scost = 0;
    serviceLogs.forEach(s => {
      scost += (s.cost || 0);
    });

    // Approximate distance based on max and min odo for that year
    let distance = 0;
    const allOdometers = [...fuelLogs.map(l => l.odo), ...serviceLogs.map(s => s.odo)];
    if (allOdometers.length >= 2) {
      const minOdo = Math.min(...allOdometers);
      const maxOdo = Math.max(...allOdometers);
      distance = maxOdo - minOdo;
    }

    setTotalFuelLiters(liters);
    setTotalFuelCost(fuelCost);
    setRefuelsCount(fuelLogs.length);
    setServiceCost(scost);
    setTotalKm(distance);
  }, [year]);

  const slides = [
    (
      <div key="slide0" className="wrapped-slide" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #D4AF37 100%)' }}>
        <Trophy size={80} color="#fff" style={{ marginBottom: '20px' }} />
        <h1 style={{ fontSize: '3rem', margin: 0, color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Sezon {year}</h1>
        <p style={{ fontSize: '1.2rem', color: '#fff' }}>Twoje motocyklowe podsumowanie roku</p>
        
        <div style={{ marginTop: '30px', zIndex: 100 }}>
          <label style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>Wybierz rok:</label>
          <select 
            value={year} 
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 16px', fontSize: '1.2rem', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(10px)' }}
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y} style={{ color: '#000' }}>{y}</option>)}
          </select>
        </div>
      </div>
    ),
    (
      <div key="slide1" className="wrapped-slide" style={{ background: 'linear-gradient(135deg, #0d324d 0%, #7f5a83 100%)' }}>
        <Navigation size={60} color="#fff" style={{ marginBottom: '20px' }} />
        <h2 style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Przebyty dystans</h2>
        <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#fff', margin: '20px 0', textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
          {totalKm} <span style={{ fontSize: '2rem' }}>km</span>
        </div>
        <p style={{ color: '#fff', fontSize: '1.1rem' }}>Tyle asfaltu nawinąłeś na koła!</p>
      </div>
    ),
    (
      <div key="slide2" className="wrapped-slide" style={{ background: 'linear-gradient(135deg, #ff4e50 0%, #f9d423 100%)' }}>
        <Droplet size={60} color="#fff" style={{ marginBottom: '20px' }} />
        <h2 style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.9)', margin: 0 }}>Paliwo</h2>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fff', margin: '20px 0' }}>
          {totalFuelLiters.toFixed(1)} <span style={{ fontSize: '1.5rem' }}>L</span>
        </div>
        <p style={{ color: '#fff', fontSize: '1.2rem', margin: '5px 0' }}>Odwiedziłeś stację <strong>{refuelsCount}</strong> razy.</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginTop: '15px' }}>Spaliłeś paliwa za: {totalFuelCost.toFixed(2)} PLN</p>
      </div>
    ),
    (
      <div key="slide3" className="wrapped-slide" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' }}>
        <Wrench size={60} color="#fff" style={{ marginBottom: '20px' }} />
        <h2 style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Serwis i Części</h2>
        <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: '#fff', margin: '20px 0' }}>
          {serviceCost.toFixed(0)} <span style={{ fontSize: '1.5rem' }}>PLN</span>
        </div>
        <p style={{ color: '#fff', fontSize: '1.1rem' }}>Tyle zainwestowałeś w maszynę.</p>
      </div>
    ),
    (
      <div key="slide4" className="wrapped-slide" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
        <Calendar size={60} color="#fff" style={{ marginBottom: '20px' }} />
        <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#fff' }}>To był dobry sezon!</h1>
        <p style={{ fontSize: '1.2rem', color: '#fff', marginTop: '20px' }}>LwG! Czekamy na więcej w kolejnym roku.</p>
        <button 
          onClick={onClose}
          style={{ marginTop: '40px', padding: '12px 30px', fontSize: '1.2rem', borderRadius: '30px', border: 'none', background: '#fff', color: '#11998e', fontWeight: 'bold', cursor: 'pointer', zIndex: 100 }}
        >
          Zamknij Podsumowanie
        </button>
      </div>
    )
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
      background: '#000', display: 'flex', flexDirection: 'column'
    }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '4px', padding: '12px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: '4px', background: i <= step ? '#fff' : 'rgba(255,255,255,0.3)',
            borderRadius: '2px', transition: 'background 0.3s'
          }} />
        ))}
      </div>

      <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '16px', background: 'none', border: 'none', color: '#fff', zIndex: 10, cursor: 'pointer' }}>
        <X size={28} />
      </button>

      {/* Main Slide Content */}
      <div 
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX > rect.width / 2) {
            if (step < slides.length - 1) setStep(step + 1);
          } else {
            if (step > 0) setStep(step - 1);
          }
        }}
      >
        <style>
          {`
            .wrapped-slide {
              position: absolute; top: 0; left: 0; right: 0; bottom: 0;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              text-align: center; padding: 20px;
              animation: fadeIn 0.5s ease-out;
            }
            @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          `}
        </style>
        {slides[step]}
      </div>
      
      {/* Hint */}
      <div style={{ position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', pointerEvents: 'none' }}>
        Stuknij w prawą krawędź ekranu, aby przejść dalej
      </div>
    </div>
  );
}
