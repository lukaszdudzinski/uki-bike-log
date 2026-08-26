import { useState, useEffect } from 'react';
import { storage, type BikeSettings, type TireData } from '../../services/storage';

export function SettingsVehicle({ activeBikeId }: { activeBikeId: string }) {
  const [formData, setFormData] = useState<Partial<BikeSettings>>({});
  const [frontTire, setFrontTire] = useState<Partial<TireData>>({});
  const [rearTire, setRearTire] = useState<Partial<TireData>>({});

  useEffect(() => {
    const settings = storage.getSettings();
    setFormData(settings);
    setFrontTire(settings.frontTire || {});
    setRearTire(settings.rearTire || {});
  }, [activeBikeId]);

  const handleChange = (field: keyof BikeSettings, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFrontTireChange = (field: keyof TireData, value: any) => {
    setFrontTire((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleRearTireChange = (field: keyof TireData, value: any) => {
    setRearTire((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const odoVal = Number(formData.initialOdo);
    const tankCapVal = Number(formData.tankCapacity);
    const ocVal = formData.insuranceExpiry;
    const acVal = formData.insuranceAcExpiry;
    const inspVal = formData.lastInspectionDate;
    const oilOdo = Number(formData.lastServiceOdo);
    const oilDate = formData.lastServiceDate;
    const valveOdo = Number(formData.lastValveClearanceOdo);
    const chainOdo = Number(formData.lastChainOdo);

    if (!isNaN(odoVal) && !isNaN(tankCapVal) && ocVal && acVal && inspVal && !isNaN(oilOdo) && oilDate && !isNaN(valveOdo) && !isNaN(chainOdo)) {
      const currentSettings = storage.getSettings();
      
      const fTire = (frontTire.model && frontTire.dot && !isNaN(Number(frontTire.installedOdo)) && !isNaN(Number(frontTire.expectedLifespanKm))) 
        ? { ...frontTire, installedOdo: Number(frontTire.installedOdo), expectedLifespanKm: Number(frontTire.expectedLifespanKm) } as TireData 
        : undefined;

      const rTire = (rearTire.model && rearTire.dot && !isNaN(Number(rearTire.installedOdo)) && !isNaN(Number(rearTire.expectedLifespanKm))) 
        ? { ...rearTire, installedOdo: Number(rearTire.installedOdo), expectedLifespanKm: Number(rearTire.expectedLifespanKm) } as TireData 
        : undefined;

      storage.saveSettings({ 
        ...currentSettings, 
        ...formData,
        initialOdo: odoVal,
        tankCapacity: tankCapVal,
        lastServiceOdo: oilOdo,
        lastValveClearanceOdo: valveOdo,
        lastChainOdo: chainOdo,
        insuranceCost: formData.insuranceCost ? Number(formData.insuranceCost) : undefined,
        frontTire: fTire,
        rearTire: rTire
      });
      alert('Zaktualizowano ustawienia i terminy dla tego pojazdu.');
    } else {
      alert('Wypełnij poprawnie wszystkie pola (daty i liczby).');
    }
  };

  return (
    <>
      <h2 style={{ margin: 0 }}>Ustawienia i Terminy</h2>
      
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label">Stan początkowy licznika (km)</label>
        <input type="number" className="input-field" value={formData.initialOdo || ''} onChange={e => handleChange('initialOdo', e.target.value)} />
      </div>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label">Pojemność baku (Litry)</label>
        <input type="number" step="0.1" className="input-field" value={formData.tankCapacity || ''} onChange={e => handleChange('tankCapacity', e.target.value)} />
      </div>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label">Wygasa ubezpieczenie OC</label>
        <input type="date" className="input-field" value={formData.insuranceExpiry || ''} onChange={e => handleChange('insuranceExpiry', e.target.value)} />
      </div>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label">Wygasa ubezpieczenie AC</label>
        <input type="date" className="input-field" value={formData.insuranceAcExpiry || ''} onChange={e => handleChange('insuranceAcExpiry', e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Koszt ubezp. (PLN)</label>
          <input type="number" step="0.01" className="input-field" value={formData.insuranceCost || ''} onChange={e => handleChange('insuranceCost', e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Ubezpieczyciel</label>
          <input type="text" className="input-field" placeholder="np. PZU" value={formData.insurerName || ''} onChange={e => handleChange('insurerName', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Numer Polisy</label>
          <input type="text" className="input-field" placeholder="Nr..." value={formData.policyNumber || ''} onChange={e => handleChange('policyNumber', e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Infolinia (Telefon)</label>
          <input type="text" className="input-field" placeholder="Nr asysty..." value={formData.insuranceHotline || ''} onChange={e => handleChange('insuranceHotline', e.target.value)} />
        </div>
      </div>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label className="input-label">Data ostatniego przeglądu (wyliczy kolejny +1 rok)</label>
        <input type="date" className="input-field" value={formData.lastInspectionDate || ''} onChange={e => handleChange('lastInspectionDate', e.target.value)} />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '8px 0' }} />
      <h3 style={{ margin: '0', fontSize: '1.1rem' }}>Interwały Serwisowe</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Wymiana oleju (km)</label>
          <input type="number" className="input-field" value={formData.lastServiceOdo || ''} onChange={e => handleChange('lastServiceOdo', e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Wymiana oleju (Data)</label>
          <input type="date" className="input-field" value={formData.lastServiceDate || ''} onChange={e => handleChange('lastServiceDate', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Luzy zaworowe (km)</label>
          <input type="number" className="input-field" value={formData.lastValveClearanceOdo || ''} onChange={e => handleChange('lastValveClearanceOdo', e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Smarowanie łańcucha (km)</label>
          <input type="number" className="input-field" value={formData.lastChainOdo || ''} onChange={e => handleChange('lastChainOdo', e.target.value)} />
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '8px 0' }} />
      <h3 style={{ margin: '0', fontSize: '1.1rem' }}>Menedżer Opon (Tire Tracker)</h3>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>Opona Przednia</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <input type="text" className="input-field" placeholder="Model (np. Michelin Road 6)" value={frontTire.model || ''} onChange={e => handleFrontTireChange('model', e.target.value)} />
          <input type="text" className="input-field" placeholder="DOT (np. 1224)" value={frontTire.dot || ''} onChange={e => handleFrontTireChange('dot', e.target.value)} />
          <input type="number" className="input-field" placeholder="Założona przy (km)" value={frontTire.installedOdo || ''} onChange={e => handleFrontTireChange('installedOdo', e.target.value)} />
          <input type="number" className="input-field" placeholder="Szac. żywotność (km)" value={frontTire.expectedLifespanKm || ''} onChange={e => handleFrontTireChange('expectedLifespanKm', e.target.value)} />
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>Opona Tylna</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <input type="text" className="input-field" placeholder="Model (np. Michelin Road 6)" value={rearTire.model || ''} onChange={e => handleRearTireChange('model', e.target.value)} />
          <input type="text" className="input-field" placeholder="DOT (np. 1224)" value={rearTire.dot || ''} onChange={e => handleRearTireChange('dot', e.target.value)} />
          <input type="number" className="input-field" placeholder="Założona przy (km)" value={rearTire.installedOdo || ''} onChange={e => handleRearTireChange('installedOdo', e.target.value)} />
          <input type="number" className="input-field" placeholder="Szac. żywotność (km)" value={rearTire.expectedLifespanKm || ''} onChange={e => handleRearTireChange('expectedLifespanKm', e.target.value)} />
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '8px 0' }} />
      <h3 style={{ margin: '0', fontSize: '1.1rem' }}>Części i Płyny (Ściągawka)</h3>
      <p style={{ margin: '4px 0 12px 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Miej zawsze pod ręką numery części do szybkiego zamawiania.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Filtr Oleju</label>
          <input type="text" className="input-field" placeholder="np. KN-204" value={formData.oilFilterModel || ''} onChange={e => handleChange('oilFilterModel', e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Typ Akumulatora</label>
          <input type="text" className="input-field" placeholder="np. YTX9-BS" value={formData.batteryModel || ''} onChange={e => handleChange('batteryModel', e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Świece Zapłonowe</label>
          <input type="text" className="input-field" placeholder="np. CR9EK" value={formData.sparkPlugModel || ''} onChange={e => handleChange('sparkPlugModel', e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Łańcuch (Rozmiar/Ogniwa)</label>
          <input type="text" className="input-field" placeholder="np. 525 114" value={formData.chainModel || ''} onChange={e => handleChange('chainModel', e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
          <label className="input-label">Olej Silnikowy (Rodzaj / Ilość)</label>
          <input type="text" className="input-field" placeholder="np. 10W40 Motul 7100 (2.8L)" value={formData.engineOilType || ''} onChange={e => handleChange('engineOilType', e.target.value)} />
        </div>
      </div>

      <button className="btn-primary" style={{ marginTop: '10px' }} onClick={handleSave}>
        Zapisz Ustawienia
      </button>
    </>
  );
}
