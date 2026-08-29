import localforage from 'localforage';
import { storage } from '../services/storage';
import type { BikeSettings } from '../services/storage';

const getStorageKeys = (bikeId: string) => {
  const prefix = bikeId === 'default' ? '' : `_${bikeId}`;
  return {
    SETTINGS: `uki_bike_settings${prefix}`,
    FUEL: `uki_fuel_logs${prefix}`,
  };
};

export const checkAndFireNotifications = async () => {
  const lastCheck = localStorage.getItem('lastNotificationCheck');
  const today = new Date().toISOString().split('T')[0];
  if (lastCheck === today) return;

  if (Notification.permission !== 'granted') return;

  const bikes = storage.getBikes();
  let alerts: string[] = [];

  for (const bike of bikes) {
    const keys = getStorageKeys(bike.id);
    const settings: BikeSettings | null = await localforage.getItem(keys.SETTINGS);
    
    if (settings) {
      // Check OC
      if (settings.insuranceExpiry) {
        const diff = (new Date(settings.insuranceExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
        if (diff > 0 && diff <= 14) {
          alerts.push(`OC dla ${bike.name} wygasa za ${Math.ceil(diff)} dni!`);
        } else if (diff <= 0) {
          alerts.push(`OC dla ${bike.name} wygasło!`);
        }
      }
      
      // Check AC
      if (settings.insuranceAcExpiry) {
        const diff = (new Date(settings.insuranceAcExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
        if (diff > 0 && diff <= 14) {
          alerts.push(`AC dla ${bike.name} wygasa za ${Math.ceil(diff)} dni!`);
        }
      }
      
      // Check Tech Inspection (Przegląd)
      if (settings.lastInspectionDate) {
        const diff = (new Date(settings.lastInspectionDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
        if (diff > 0 && diff <= 14) {
          alerts.push(`Przegląd dla ${bike.name} wygasa za ${Math.ceil(diff)} dni!`);
        } else if (diff <= 0) {
          alerts.push(`Przegląd dla ${bike.name} wygasł!`);
        }
      }

      // Check Chain
      if (settings.chainIntervalKm && settings.lastChainOdo) {
        // We need the current ODO for this bike.
        // It's saved in the last fuel log or settings.initialOdo.
        // But storage.getCurrentOdo() only works for the ACTIVE bike.
        // Let's just rely on the active bike check for chain, or calculate it.
        const fuelLogsKey = keys.FUEL;
        const fuelLogs = await localforage.getItem(fuelLogsKey) as any[];
        let currentOdo = settings.initialOdo;
        if (fuelLogs && fuelLogs.length > 0) {
          currentOdo = Math.max(...fuelLogs.map(l => l.odo));
        }
        
        const chainTraveled = currentOdo - settings.lastChainOdo;
        if (chainTraveled >= 700) {
          alerts.push(`[RED ALERT] ${bike.name} - Przejechano ${chainTraveled} km bez smarowania łańcucha!`);
        } else if (chainTraveled >= 500) {
          alerts.push(`${bike.name} - Czas nasmarować łańcuch. Przejechano ${chainTraveled} km.`);
        }
      }
    }
  }

  if (alerts.length > 0) {
    // Fire local push notification
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification('Uki\'s Bike Log - Przypomnienie', {
        body: alerts.join('\n'),
        icon: '/uki-bike-log/icon-192x192.png',
        badge: '/uki-bike-log/icon-192x192.png'
      } as any);
    } catch (e) {
      new Notification('Uki\'s Bike Log - Przypomnienie', {
        body: alerts.join('\n'),
        icon: '/uki-bike-log/icon-192x192.png'
      });
    }
  }

  localStorage.setItem('lastNotificationCheck', today);
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    alert('Twoja przeglądarka nie obsługuje powiadomień.');
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const generateCalendarICS = async () => {
  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Uki Bike Log//PL\nCALSCALE:GREGORIAN\n";
  const bikes = storage.getBikes();

  let hasEvents = false;
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const bike of bikes) {
    const keys = getStorageKeys(bike.id);
    const settings: BikeSettings | null = await localforage.getItem(keys.SETTINGS);
    
    if (settings) {
      if (settings.insuranceExpiry) {
        const dt = settings.insuranceExpiry.replace(/-/g, '') + 'T090000Z'; // 9:00 AM UTC
        const uid = `oc-${bike.id}-${dt}@ukisbikelog`;
        icsContent += `BEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${nowStr}\nSUMMARY:Koniec OC - ${bike.name}\nDTSTART:${dt}\nDTEND:${dt}\nDESCRIPTION:Ubezpieczenie OC wygasa.\nEND:VEVENT\n`;
        hasEvents = true;
      }
      if (settings.lastInspectionDate) {
        const dateObj = new Date(settings.lastInspectionDate);
        dateObj.setFullYear(dateObj.getFullYear() + 1);
        const dt = dateObj.toISOString().split('T')[0].replace(/-/g, '') + 'T090000Z';
        const uid = `przeglad-${bike.id}-${dt}@ukisbikelog`;
        icsContent += `BEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${nowStr}\nSUMMARY:Koniec Przeglądu - ${bike.name}\nDTSTART:${dt}\nDTEND:${dt}\nDESCRIPTION:Przegląd techniczny wygasa.\nEND:VEVENT\n`;
        hasEvents = true;
      }
    }
  }

  if (!hasEvents) {
    alert("Brak zapisanych dat ubezpieczenia OC lub przeglądu w ustawieniach pojazdu.");
    return false;
  }

  icsContent += "END:VCALENDAR";
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'uki-bike-log-przypomnienia.ics';
  
  // Wymagane dla iOS PWA do poprawnego otwarcia kalendarza
  link.target = '_blank';
  
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 100);
  
  return true;
};
