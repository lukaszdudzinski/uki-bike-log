import { useState } from 'react';
import { Bell, Calendar } from 'lucide-react';
import { checkAndFireNotifications, requestNotificationPermission, generateCalendarICS, loadReminderPrefs, saveReminderPrefs } from '../../utils/notifications';
import { LEAD_DAYS_OPTIONS, type LeadDays, type ReminderPrefs, type ReminderType } from '../../utils/reminders';

const TYPE_LABELS: Record<ReminderType, string> = {
  oc: 'Ubezpieczenie OC',
  ac: 'Ubezpieczenie AC',
  inspection: 'Przegląd techniczny',
  chain: 'Smarowanie łańcucha',
};

export function SettingsReminders() {
  const [prefs, setPrefs] = useState<ReminderPrefs>(() => loadReminderPrefs());

  const updatePrefs = (next: ReminderPrefs) => {
    setPrefs(next);
    saveReminderPrefs(next);
  };

  return (
    <>
      <h2 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Bell size={24} /> Powiadomienia
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
          onClick={async () => {
            const granted = await requestNotificationPermission();
            if (granted) {
              alert('Uprawnienia przyznane! Bike Log przypomni Ci o terminach po otwarciu aplikacji, zgodnie z ustawieniami poniżej.');
              checkAndFireNotifications();
            } else {
              alert('Uprawnienia odrzucone lub zablokowane w przeglądarce.');
            }
          }}
        >
          <Bell size={18} /> Aktywuj powiadomienia w aplikacji
        </button>

        <fieldset className="glass-panel" style={{ border: 'none', padding: '12px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <legend style={{ fontWeight: 'bold', padding: 0, marginBottom: '4px' }}>Kiedy przypominać</legend>

          {(Object.keys(TYPE_LABELS) as ReminderType[]).map(type => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={prefs.enabled[type]}
                onChange={e => updatePrefs({ ...prefs, enabled: { ...prefs.enabled, [type]: e.target.checked } })}
              />
              {TYPE_LABELS[type]}
            </label>
          ))}

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="reminder-lead-days">Przypomnij o OC, AC i przeglądzie</label>
            <select
              id="reminder-lead-days"
              className="input-field"
              value={prefs.leadDays}
              onChange={e => updatePrefs({ ...prefs, leadDays: Number(e.target.value) as LeadDays })}
            >
              {LEAD_DAYS_OPTIONS.map(d => <option key={d} value={d}>{d} dni przed terminem</option>)}
            </select>
          </div>

          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
            Przypomnienie o terminie przychodzi najwyżej trzy razy: w wybranym dniu, dzień przed terminem i w dniu terminu. O łańcuchu przypomnimy po przejechaniu liczby km ustawionej w danych pojazdu (pole „Smarowanie łańcucha co (km)”) i ponownie, gdy przekroczysz ją o 40%. Nigdy codziennie. Powiadomienia pojawiają się po otwarciu Bike Log.
          </p>
        </fieldset>

        <button
          className="btn-outline"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
          onClick={async () => {
            const success = await generateCalendarICS();
            if (success) {
              alert('Plik kalendarza wygenerowany! Możesz go teraz zapisać/otworzyć w swoim kalendarzu.');
            }
          }}
        >
          <Calendar size={18} /> Zapisz przypomnienia (OC/Przegląd) do Kalendarza
        </button>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
          Aby powiadomienia dzwoniły w tle przy wyłączonej aplikacji, użyj przycisku Kalendarza, który wygeneruje plik do Google/Apple Calendar (Niezawodna metoda).
        </p>
      </div>
    </>
  );
}
