import { useState, useEffect } from 'react';
import { storage, type FuelEntry, type ServiceEntry } from '../services/storage';
import { Calculator, TrendingUp, CalendarDays, Wallet } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function Stats() {
  const [avgConsumption, setAvgConsumption] = useState<number | null>(null);
  const [lastFuelPrice, setLastFuelPrice] = useState<number>(6.50);
  const [calcDistance, setCalcDistance] = useState<number | ''>('');
  
  const [logs, setLogs] = useState<FuelEntry[]>([]);
  const [serviceLogs, setServiceLogs] = useState<ServiceEntry[]>([]);
  
  // Custom Date Range State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customRangeCost, setCustomRangeCost] = useState<number>(0);

  useEffect(() => {
    setAvgConsumption(storage.getAverageConsumption());
    const allLogs = storage.getFuelLogs();
    setLogs(allLogs);
    setServiceLogs(storage.getServiceLogs());
    
    if (allLogs.length > 0) {
      // Calculate average price per liter from last 3 tankings
      const recentLogs = allLogs.slice(0, 3);
      let totalLiters = 0;
      let totalPrice = 0;
      recentLogs.forEach(l => {
        totalLiters += l.liters;
        totalPrice += l.price;
      });
      if (totalLiters > 0) {
        setLastFuelPrice(Number((totalPrice / totalLiters).toFixed(2)));
      }
    }
    
    // Set default dates for custom range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      // add 1 day to include the entire end date
      const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000; 
      
      const sum = logs.filter(l => {
        const t = new Date(l.date).getTime();
        return t >= start && t < end;
      }).reduce((acc, curr) => acc + curr.price, 0);
      
      setCustomRangeCost(sum);
    } else {
      setCustomRangeCost(0);
    }
  }, [startDate, endDate, logs]);

  // Prepare price chart data
  const priceData = logs.slice().reverse().map(l => {
    const d = new Date(l.date);
    return {
      date: d.toLocaleDateString(),
      price: Number((l.price / l.liters).toFixed(2))
    };
  });

  // Calculate expenses by ranges
  const getExpenses = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    const thisYear = new Date(now.getFullYear(), 0, 1).getTime();
    const thisHalfYear = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1).getTime();

    let d = 0, w = 0, m = 0, q = 0, h = 0, y = 0;

    logs.forEach(l => {
      const time = new Date(l.date).getTime();
      if (time >= today) d += l.price;
      if (time >= thisWeek) w += l.price;
      if (time >= thisMonth) m += l.price;
      if (time >= thisQuarter) q += l.price;
      if (time >= thisHalfYear) h += l.price;
      if (time >= thisYear) y += l.price;
    });

    return [
      { label: 'Dziś', value: d },
      { label: 'Ostatnie 7 dni', value: w },
      { label: 'Ten Miesiąc', value: m },
      { label: 'Ten Kwartał', value: q },
      { label: 'To Półrocze', value: h },
      { label: 'Ten Rok', value: y },
    ];
  };

  const expensesData = getExpenses();

  // Total Cost of Ownership
  const getTCO = () => {
    const settings = storage.getSettings();
    const fuelCost = logs.reduce((sum, l) => sum + l.price, 0);
    const serviceCost = serviceLogs.reduce((sum, s) => sum + (s.cost || 0), 0);
    const insuranceCost = settings.insuranceCost || 0;
    
    // Calculate total distance for cost per km
    let distance = 0;
    if (logs.length > 0) {
      const maxOdo = Math.max(...logs.map(l => l.odo), ...serviceLogs.map(s => s.odo), settings.initialOdo);
      distance = maxOdo - settings.initialOdo;
    }
    
    const total = fuelCost + serviceCost + insuranceCost;
    
    return {
      fuel: fuelCost,
      service: serviceCost,
      insurance: insuranceCost,
      total: total,
      costPerKm: distance > 0 ? (total / distance) : 0,
      distance: distance
    };
  };

  const tco = getTCO();
  
  const pieData = [
    { name: 'Paliwo', value: tco.fuel, color: '#D4AF37' },
    { name: 'Serwis', value: tco.service, color: '#ff4444' },
    { name: 'Ubezpieczenie', value: tco.insurance, color: '#4444ff' }
  ].filter(item => item.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* TCO Overview */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(20,20,20,0.8) 100%)', border: '1px solid var(--color-primary)' }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
          <Wallet color="var(--color-primary)" /> Całkowity Koszt Utrzymania (TCO)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {tco.distance > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Prawdziwy koszt przejechania 1 km:</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{tco.costPerKm.toFixed(2)} PLN</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Dystans brany pod uwagę: {tco.distance} km</div>
            </div>
          )}

          {pieData.length > 0 && (
            <div style={{ height: '200px', width: '100%', marginBottom: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => `${Number(value).toFixed(2)} PLN`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Paliwo:</span>
            <strong>{tco.fuel.toFixed(2)} PLN</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Serwis i części:</span>
            <strong>{tco.service.toFixed(2)} PLN</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Ubezpieczenie:</span>
            <strong>{tco.insurance.toFixed(2)} PLN</strong>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <span>SUMA:</span>
            <span style={{ color: 'var(--color-primary)' }}>{tco.total.toFixed(2)} PLN</span>
          </div>
        </div>
      </div>
      
      {/* Custom Date Range Expenses */}
      <div className="glass-panel">
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays color="var(--color-primary)" /> Koszty Paliwa: Wybrany Okres
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Data Od</label>
            <input 
              type="date" 
              className="input-field" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Data Do</label>
            <input 
              type="date" 
              className="input-field" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Suma wydatków na paliwo w tym okresie:</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{customRangeCost.toFixed(2)} PLN</div>
        </div>
      </div>

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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
              
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Cena paliwa (PLN/l)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="input-field" 
                  value={lastFuelPrice}
                  onChange={(e) => setLastFuelPrice(Number(e.target.value))}
                  placeholder="np. 6.50"
                />
              </div>
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

      {/* Expenses Overview */}
      <div className="glass-panel">
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays color="var(--color-primary)" /> Szybkie Zestawienie Paliwa
        </h3>
        
        {logs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            {expensesData.map((item, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{item.value.toFixed(0)} zł</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>Brak danych o wydatkach.</p>
        )}
      </div>

      {/* Fuel Price Trend Chart */}
      <div className="glass-panel" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp color="var(--color-primary)" /> Analiza Ceny Paliwa (PLN/L)
        </h3>
        {priceData.length > 0 ? (
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} domain={['auto', 'auto']} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#222', borderColor: 'var(--color-glass-border)', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-primary)', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="price" name="Cena" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>Brak danych do wykresu.</p>
        )}
      </div>

    </div>
  );
}
