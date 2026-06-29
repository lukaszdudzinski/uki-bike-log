import { useState, useEffect, useRef } from 'react';
import { Fuel, Save, Camera, Loader2 } from 'lucide-react';
import { storage, type FuelEntry } from '../services/storage';
import Tesseract from 'tesseract.js';

export default function FuelLog() {
  const [logs, setLogs] = useState<FuelEntry[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [odo, setOdo] = useState<number | ''>('');
  const [liters, setLiters] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');
  const [isFullTank, setIsFullTank] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentOdo = storage.getCurrentOdo();

  useEffect(() => {
    setLogs(storage.getFuelLogs());
  }, []);

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const result = await Tesseract.recognize(file, 'pol', {
        logger: m => console.log(m)
      });
      
      const text = result.data.text.toUpperCase();
      
      // Basic heuristic to find Liters and Price
      // Matches numbers like 12,34 or 12.34
      const numbers = text.match(/\d+[.,]\d{2}/g);
      if (numbers && numbers.length > 0) {
        // Typically the largest number on a gas receipt is the price, and the smaller is liters.
        // Or if it says "PLN" or "PTU".
        const parsedNums = numbers.map(n => parseFloat(n.replace(',', '.')));
        parsedNums.sort((a, b) => b - a); // Descending
        
        if (parsedNums.length >= 2) {
          setPrice(parsedNums[0]); // highest is usually price
          setLiters(parsedNums[1]); // second highest is usually liters
          alert(`Odczytano (do weryfikacji):\nKwota: ${parsedNums[0]} PLN\nLitry: ${parsedNums[1]} L`);
        } else {
          setPrice(parsedNums[0]);
          alert(`Odczytano tylko kwotę: ${parsedNums[0]} PLN. Wpisz litry ręcznie.`);
        }
      } else {
        alert("Nie udało się odczytać kwot z paragonu. Wpisz ręcznie.");
      }
    } catch (err) {
      console.error(err);
      alert("Błąd podczas skanowania paragonu.");
    } finally {
      setIsScanning(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !odo || !liters || !price) return;
    
    // Prevent adding ODO lower than current
    if (Number(odo) < currentOdo && logs.length > 0) {
      alert(`Stan licznika nie może być mniejszy niż ostatnio zapisany (${currentOdo} km)!`);
      return;
    }

    // Combine chosen date with current time for uniqueness and sorting
    const now = new Date();
    const timeString = now.toISOString().split('T')[1];
    const fullDateString = `${date}T${timeString}`;

    const newEntry = storage.addFuelLog({
      date: fullDateString,
      odo: Number(odo),
      liters: Number(liters),
      price: Number(price),
      isFullTank
    });

    setLogs([newEntry, ...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    
    // Reset form
    setDate(new Date().toISOString().split('T')[0]);
    setOdo('');
    setLiters('');
    setPrice('');
    
    alert('Zapisano pomyślnie!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Add Fuel Form */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Fuel color="var(--color-primary)" /> Dodaj tankowanie
          </h2>
          <div>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef}
              onChange={handleScanReceipt}
              style={{ display: 'none' }} 
            />
            <button 
              type="button" 
              className="btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.9rem' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
            >
              {isScanning ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
              {isScanning ? 'Skanowanie...' : 'Skanuj paragon'}
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Data *</label>
              <input 
                type="date" 
                className="input-field" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                required 
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Stan licznika (km) *</label>
              <input 
                type="number" 
                className="input-field" 
                value={odo} 
                onChange={(e) => setOdo(e.target.value ? Number(e.target.value) : '')}
                placeholder={`Aktualny: ${currentOdo}`}
                required 
                min={currentOdo}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Paliwo (litry) *</label>
              <input 
                type="number" 
                step="0.01"
                className="input-field" 
                value={liters} 
                onChange={(e) => setLiters(e.target.value ? Number(e.target.value) : '')}
                placeholder="np. 12.5"
                required 
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Koszt (PLN) *</label>
              <input 
                type="number" 
                step="0.01"
                className="input-field" 
                value={price} 
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="np. 85.50"
                required 
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
            <input 
              type="checkbox" 
              id="fullTank" 
              checked={isFullTank} 
              onChange={(e) => setIsFullTank(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
            />
            <label htmlFor="fullTank" style={{ fontSize: '0.95rem', cursor: 'pointer' }}>Zatankowano do pełna</label>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            <Save size={20} /> Zapisz tankowanie
          </button>
        </form>
      </div>

      {/* Fuel History */}
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Historia tankowań</h3>
        
        {logs.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '30px' }}>
            Brak wpisów. Dodaj pierwsze tankowanie!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.map((log) => {
              const dateObj = new Date(log.date);
              return (
                <div key={log.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{log.odo.toLocaleString()} km</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h4 style={{ margin: '0 0 4px 0', color: 'var(--color-primary)' }}>{log.price.toFixed(2)} PLN</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      {log.liters} L {log.isFullTank ? '(Pełny)' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
