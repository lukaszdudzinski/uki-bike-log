import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useGarage } from '../../contexts/GarageContext';

export function SettingsGarage() {
  const { bikes, activeBike, switchBike, addBike, editBike, deleteBike, updateBikeCoverPhoto } = useGarage();

  const handleCoverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeBike) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateBikeCoverPhoto(activeBike.id, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!activeBike) return null;

  return (
    <>
      <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Mój Garaż</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            className="input-field" 
            value={activeBike.id}
            onChange={(e) => switchBike(e.target.value)}
            style={{ flex: 1 }}
          >
            {bikes.map(bike => (
              <option key={bike.id} value={bike.id}>{bike.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-primary" 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => {
              const newName = prompt('Wpisz nazwę nowego motocykla:');
              if (newName && newName.trim().length > 0) {
                addBike(newName.trim());
              }
            }}
          >
            <Plus size={18} /> Dodaj pojazd
          </button>
          <button 
            className="btn-outline"
            title="Zmień nazwę"
            style={{ padding: '8px' }}
            onClick={() => {
              const newName = prompt('Nowa nazwa dla tego pojazdu:', activeBike.name);
              if (newName && newName.trim().length > 0) {
                editBike(activeBike.id, newName.trim());
              }
            }}
          >
            <Edit2 size={18} />
          </button>
          <button 
            className="btn-outline"
            title="Usuń pojazd"
            style={{ padding: '8px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            onClick={() => {
              if (bikes.length === 1) {
                alert('Nie możesz usunąć jedynego pojazdu w garażu!');
                return;
              }
              if (window.confirm(`UWAGA! Czy na pewno chcesz trwale usunąć motocykl "${activeBike.name}" oraz WSZYSTKIE jego dane (tankowania, serwis)? Tej operacji nie można cofnąć!`)) {
                deleteBike(activeBike.id);
              }
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div style={{
          position: 'relative',
          width: '100%',
          height: '120px',
          borderRadius: '12px',
          background: activeBike.coverPhoto ? `url(${activeBike.coverPhoto}) center/cover` : 'rgba(0,0,0,0.3)',
          border: '1px dashed var(--color-glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: activeBike.coverPhoto ? 'rgba(0,0,0,0.5)' : 'transparent',
            pointerEvents: 'none'
          }}></div>
          <label className="btn-outline" style={{ position: 'relative', zIndex: 1, cursor: 'pointer', padding: '8px 16px', background: 'var(--color-glass-bg)', backdropFilter: 'blur(10px)' }}>
            {activeBike.coverPhoto ? 'Zmień Tapetę (Cover)' : 'Dodaj Tapetę Motocykla'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverPhotoUpload} />
          </label>
          {activeBike.coverPhoto && (
            <button 
              onClick={() => updateBikeCoverPhoto(activeBike.id, null)} 
              style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', zIndex: 2 }}
              title="Usuń tapetę"
            >
              &times;
            </button>
          )}
        </div>
      </div>
    </>
  );
}
