import { ShieldCheck, Wrench, Link, FileText } from 'lucide-react';
import { storage, type BikeSettings } from '../services/storage';

interface AlertsListProps {
  settings: BikeSettings;
  odo: number;
  setSettings: (s: BikeSettings) => void;
}

export default function AlertsList({ settings, odo, setSettings }: AlertsListProps) {
  const today = new Date();
  
  // Insurance
  const insuranceDate = new Date(settings.insuranceExpiry);
  const daysToInsurance = Math.ceil((insuranceDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  const insuranceAcDate = new Date(settings.insuranceAcExpiry);
  const daysToInsuranceAc = Math.ceil((insuranceAcDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  // Inspection
  const lastInspDate = new Date(settings.lastInspectionDate);
  const nextInspDate = new Date(lastInspDate);
  nextInspDate.setFullYear(nextInspDate.getFullYear() + 1);
  const daysToInspection = Math.ceil((nextInspDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

  // Service (Oil) - 5000km or 12 months
  const actualServiceKmRemaining = settings.serviceIntervalKm - (odo - settings.lastServiceOdo);
  
  const lastServiceDateObj = new Date(settings.lastServiceDate || today);
  const nextServiceDate = new Date(lastServiceDateObj);
  nextServiceDate.setFullYear(nextServiceDate.getFullYear() + 1); // + 1 year
  const daysToService = Math.ceil((nextServiceDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  const isOilWarning = actualServiceKmRemaining <= 500 || daysToService <= 30;
  const isOilDanger = actualServiceKmRemaining <= 0 || daysToService <= 0;

  // Valves
  const valveKmRemaining = settings.valveClearanceIntervalKm - (odo - settings.lastValveClearanceOdo);
  const isValveWarning = valveKmRemaining <= 1000;
  const isValveDanger = valveKmRemaining <= 0;

  // Chain
  const chainTraveled = odo - settings.lastChainOdo;
  const isChainWarning = chainTraveled >= 500 && chainTraveled < 600;
  const isChainDanger = chainTraveled >= 600 && chainTraveled < 700;
  const isChainRedAlert = chainTraveled >= 700;

  return (
    <div>
      <h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Wymagają uwagi</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Insurance OC */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          border: daysToInsurance <= 14 ? `1px solid var(--color-${daysToInsurance <= 3 ? 'danger' : 'warning'})` : 'none',
          backgroundColor: daysToInsurance <= 14 ? `var(--color-${daysToInsurance <= 3 ? 'danger' : 'warning'}-bg)` : 'var(--color-glass-bg)',
          display: 'flex', alignItems: 'flex-start', gap: '12px'
        }}>
          <ShieldCheck size={24} color={daysToInsurance <= 14 ? `var(--color-${daysToInsurance <= 3 ? 'danger' : 'warning'})` : 'var(--color-success)'} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: daysToInsurance <= 14 ? `var(--color-${daysToInsurance <= 3 ? 'danger' : 'warning'})` : 'inherit' }}>Ubezpieczenie OC</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {daysToInsurance < 0 ? 'Polisa wygasła!' : `Ważne jeszcze ${daysToInsurance} dni (${settings.insuranceExpiry})`}
            </p>
          </div>
        </div>

        {/* Insurance AC */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          border: daysToInsuranceAc <= 14 ? `1px solid var(--color-${daysToInsuranceAc <= 3 ? 'danger' : 'warning'})` : 'none',
          backgroundColor: daysToInsuranceAc <= 14 ? `var(--color-${daysToInsuranceAc <= 3 ? 'danger' : 'warning'}-bg)` : 'var(--color-glass-bg)',
          display: 'flex', alignItems: 'flex-start', gap: '12px'
        }}>
          <ShieldCheck size={24} color={daysToInsuranceAc <= 14 ? `var(--color-${daysToInsuranceAc <= 3 ? 'danger' : 'warning'})` : 'var(--color-success)'} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: daysToInsuranceAc <= 14 ? `var(--color-${daysToInsuranceAc <= 3 ? 'danger' : 'warning'})` : 'inherit' }}>Ubezpieczenie AC</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {daysToInsuranceAc < 0 ? 'Polisa wygasła!' : `Ważne jeszcze ${daysToInsuranceAc} dni (${settings.insuranceAcExpiry})`}
            </p>
          </div>
        </div>

        {/* Service (Oil) */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          border: isOilDanger ? '1px solid var(--color-danger)' : (isOilWarning ? '1px solid var(--color-warning)' : 'none'),
          backgroundColor: isOilDanger ? 'var(--color-danger-bg)' : (isOilWarning ? 'var(--color-warning-bg)' : 'var(--color-glass-bg)'),
          display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap'
        }}>
          <Wrench size={24} color={isOilDanger ? 'var(--color-danger)' : (isOilWarning ? 'var(--color-warning)' : 'var(--color-success)')} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', color: isOilDanger ? 'var(--color-danger)' : (isOilWarning ? 'var(--color-warning)' : 'inherit') }}>Serwis olejowy (Olej + Filtr)</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {actualServiceKmRemaining <= 0 || daysToService <= 0 
                ? 'Wymagany natychmiastowy serwis!' 
                : `Pozostało ${actualServiceKmRemaining} km lub ${daysToService} dni`}
            </p>
          </div>
          {(isOilWarning || isOilDanger) && (
            <button 
              className="btn-primary"
              style={{ width: '100%', padding: '8px', fontSize: '0.9rem', marginTop: '8px' }}
              onClick={() => {
                if (confirm('Czy na pewno chcesz zanotować wymianę oleju?')) {
                  const currentSettings = storage.getSettings();
                  storage.saveSettings({ ...currentSettings, lastServiceOdo: odo, lastServiceDate: new Date().toISOString().split('T')[0] });
                  setSettings(storage.getSettings()); // trigger re-render
                }
              }}
            >
              Wymieniono!
            </button>
          )}
        </div>

        {/* Valve Clearance */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          border: isValveDanger ? '1px solid var(--color-danger)' : (isValveWarning ? '1px solid var(--color-warning)' : 'none'),
          backgroundColor: isValveDanger ? 'var(--color-danger-bg)' : (isValveWarning ? 'var(--color-warning-bg)' : 'var(--color-glass-bg)'),
          display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap'
        }}>
          <Wrench size={24} color={isValveDanger ? 'var(--color-danger)' : (isValveWarning ? 'var(--color-warning)' : 'var(--color-success)')} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', color: isValveDanger ? 'var(--color-danger)' : (isValveWarning ? 'var(--color-warning)' : 'inherit') }}>Luzy zaworowe</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {isValveDanger 
                ? 'Przekroczono interwał regulacji zaworów!' 
                : `Pozostało ${valveKmRemaining} km`}
            </p>
          </div>
          {(isValveWarning || isValveDanger) && (
            <button 
              className="btn-primary"
              style={{ width: '100%', padding: '8px', fontSize: '0.9rem', marginTop: '8px' }}
              onClick={() => {
                if (confirm('Czy na pewno chcesz zanotować regulację luzów zaworowych?')) {
                  const currentSettings = storage.getSettings();
                  storage.saveSettings({ ...currentSettings, lastValveClearanceOdo: odo });
                  setSettings(storage.getSettings()); // trigger re-render
                }
              }}
            >
              Wyregulowano!
            </button>
          )}
        </div>

        {/* Chain */}
        <div className={`glass-panel ${isChainRedAlert ? 'red-alert-anim' : ''}`} style={{ 
          padding: '16px', 
          border: isChainRedAlert || isChainDanger ? '1px solid var(--color-danger)' : (isChainWarning ? '1px solid var(--color-warning)' : 'none'),
          backgroundColor: isChainRedAlert || isChainDanger ? 'var(--color-danger-bg)' : (isChainWarning ? 'var(--color-warning-bg)' : 'var(--color-glass-bg)'),
          display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap'
        }}>
          <Link size={24} color={isChainRedAlert || isChainDanger ? 'var(--color-danger)' : (isChainWarning ? 'var(--color-warning)' : 'var(--color-success)')} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', color: isChainRedAlert || isChainDanger ? 'var(--color-danger)' : (isChainWarning ? 'var(--color-warning)' : 'inherit') }}>Smarowanie łańcucha</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {isChainRedAlert 
                ? `RED ALERT! Przejechano już ${chainTraveled} km! Nasmaruj łańcuch!` 
                : (isChainDanger ? `Uwaga! Przejechano ${chainTraveled} km.` : (isChainWarning ? `Przypomnienie: ${chainTraveled} km bez smarowania.` : `Łańcuch OK (${chainTraveled} km)`))}
            </p>
          </div>
          {(isChainWarning || isChainDanger || isChainRedAlert) && (
            <button 
              className="btn-primary"
              style={{ width: '100%', padding: '8px', fontSize: '0.9rem', marginTop: '8px' }}
              onClick={() => {
                if (confirm('Czy na pewno chcesz zresetować licznik łańcucha?')) {
                  const currentSettings = storage.getSettings();
                  storage.saveSettings({ ...currentSettings, lastChainOdo: odo });
                  setSettings(storage.getSettings()); // trigger re-render
                }
              }}
            >
              Nasmarowano!
            </button>
          )}
        </div>

        {/* Inspection */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          border: daysToInspection <= 14 ? `1px solid var(--color-${daysToInspection <= 3 ? 'danger' : 'warning'})` : 'none',
          backgroundColor: daysToInspection <= 14 ? `var(--color-${daysToInspection <= 3 ? 'danger' : 'warning'}-bg)` : 'var(--color-glass-bg)',
          display: 'flex', alignItems: 'flex-start', gap: '12px'
        }}>
          <FileText size={24} color={daysToInspection <= 14 ? `var(--color-${daysToInspection <= 3 ? 'danger' : 'warning'})` : 'var(--color-success)'} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 2px 0', color: daysToInspection <= 14 ? `var(--color-${daysToInspection <= 3 ? 'danger' : 'warning'})` : 'inherit' }}>Przegląd techniczny</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {daysToInspection < 0 ? 'Przegląd nieważny!' : `Ważny do ${nextInspDate.toISOString().split('T')[0]} (zostało ${daysToInspection} dni)`}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
