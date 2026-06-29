import { AlertTriangle, ShieldCheck, FileText, Wrench, Fuel } from 'lucide-react';
import { useState, useEffect } from 'react';
import { storage, type BikeSettings } from '../services/storage';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const [odo, setOdo] = useState<number>(0);
  const [settings, setSettings] = useState<BikeSettings | null>(null);

  useEffect(() => {
    setOdo(storage.getCurrentOdo());
    setSettings(storage.getSettings());
  }, []);

  if (!settings) return null;

  // Calculate intervals
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ODO & Main Stats Card */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, var(--color-glass-bg) 0%, rgba(212, 175, 55, 0.05) 100%)',
        borderLeft: '4px solid var(--color-primary)'
      }}>
        <div>
          <p className="input-label" style={{ marginBottom: '4px' }}>Całkowity przebieg</p>
          <h2 style={{ fontSize: '2.5rem', margin: 0, fontFamily: 'monospace' }}>{odo.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>km</span></h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="input-label" style={{ marginBottom: '4px' }}>Śr. spalanie</p>
          <h3 style={{ margin: 0 }}>-- l/100</h3>
        </div>
      </div>

      {/* Alerts / Intervals Section */}
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

      {/* Quick Actions */}
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Szybkie akcje</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button 
            className="glass-panel" 
            style={{ border: '1px solid var(--color-glass-border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text)', padding: '24px 12px' }}
            onClick={() => setActiveTab('fuel')}
          >
            <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '50%' }}><Fuel size={24} color="var(--color-primary)" /></div>
            <span style={{ fontWeight: 500 }}>Dodaj paliwo</span>
          </button>
          <button 
            className="glass-panel" 
            style={{ border: '1px solid var(--color-glass-border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text)', padding: '24px 12px' }}
            onClick={() => setActiveTab('service')}
          >
            <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '50%' }}><AlertTriangle size={24} color="var(--color-primary)" /></div>
            <span style={{ fontWeight: 500 }}>Zgłoś usterkę</span>
          </button>
        </div>
      </div>

    </div>
  );
}
