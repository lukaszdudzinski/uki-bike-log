import { ShieldCheck, Wrench, Link, FileText } from 'lucide-react';
import { storage, type BikeSettings } from '../services/storage';

interface AlertsListProps {
  settings: BikeSettings;
  odo: number;
  setSettings: (s: BikeSettings) => void;
}

export default function AlertsList({ settings, odo, setSettings }: AlertsListProps) {
  const today = new Date();
  
  const insuranceDate = new Date(settings.insuranceExpiry);
  const daysToInsurance = Math.ceil((insuranceDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  const insuranceAcDate = new Date(settings.insuranceAcExpiry);
  const daysToInsuranceAc = Math.ceil((insuranceAcDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  const lastInspDate = new Date(settings.lastInspectionDate);
  const nextInspDate = new Date(lastInspDate);
  nextInspDate.setFullYear(nextInspDate.getFullYear() + 1);
  const daysToInspection = Math.ceil((nextInspDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

  const serviceKmRemaining = settings.serviceIntervalKm - (odo - settings.lastServiceOdo);
  const chainKmRemaining = settings.chainIntervalKm - (odo - settings.lastChainOdo);

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

        {/* Service */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          border: serviceKmRemaining <= 500 ? `1px solid var(--color-${serviceKmRemaining <= 100 ? 'danger' : 'warning'})` : 'none',
          backgroundColor: serviceKmRemaining <= 500 ? `var(--color-${serviceKmRemaining <= 100 ? 'danger' : 'warning'}-bg)` : 'var(--color-glass-bg)',
          display: 'flex', alignItems: 'flex-start', gap: '12px'
        }}>
          <Wrench size={24} color={serviceKmRemaining <= 500 ? `var(--color-${serviceKmRemaining <= 100 ? 'danger' : 'warning'})` : 'var(--color-success)'} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: serviceKmRemaining <= 500 ? `var(--color-${serviceKmRemaining <= 100 ? 'danger' : 'warning'})` : 'inherit' }}>Serwis olejowy</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {serviceKmRemaining < 0 ? 'Przekroczono interwał!' : `Pozostało ${serviceKmRemaining} km`}
            </p>
          </div>
        </div>

        {/* Chain */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          border: chainKmRemaining <= 100 ? `1px solid var(--color-${chainKmRemaining <= 0 ? 'danger' : 'warning'})` : 'none',
          backgroundColor: chainKmRemaining <= 100 ? `var(--color-${chainKmRemaining <= 0 ? 'danger' : 'warning'}-bg)` : 'var(--color-glass-bg)',
          display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap'
        }}>
          <Link size={24} color={chainKmRemaining <= 100 ? `var(--color-${chainKmRemaining <= 0 ? 'danger' : 'warning'})` : 'var(--color-success)'} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', color: chainKmRemaining <= 100 ? `var(--color-${chainKmRemaining <= 0 ? 'danger' : 'warning'})` : 'inherit' }}>Smarowanie łańcucha</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {chainKmRemaining < 0 ? 'Wymaga pilnego smarowania!' : `Pozostało ${chainKmRemaining} km`}
            </p>
          </div>
          {chainKmRemaining <= 100 && (
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
