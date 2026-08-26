import { Bell, Calendar } from 'lucide-react';
import { checkAndFireNotifications, requestNotificationPermission, generateCalendarICS } from '../../utils/notifications';

export function SettingsReminders() {
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
              alert('Uprawnienia przyznane! Aplikacja przypomni Ci o opłatach i serwisie przy starcie.');
              checkAndFireNotifications();
            } else {
              alert('Uprawnienia odrzucone lub zablokowane w przeglądarce.');
            }
          }}
        >
          <Bell size={18} /> Aktywuj powiadomienia w aplikacji
        </button>
        
        <button 
          className="btn-outline" 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
          onClick={() => {
            generateCalendarICS();
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
