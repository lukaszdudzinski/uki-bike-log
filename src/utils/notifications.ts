import localforage from 'localforage';
import { storage } from '../services/storage';
import type { BikeSettings } from '../services/storage';

const getStorageKeys = (bikeId: string) => ({
  SETTINGS: `uki_settings_${bikeId}`,
});

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
        const fuelLogsKey = `uki_fuel_${bike.id}`;
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

  for (const bike of bikes) {
    const keys = getStorageKeys(bike.id);
    const settings: BikeSettings | null = await localforage.getItem(keys.SETTINGS);
    
    if (settings) {
      if (settings.insuranceExpiry) {
        const dt = settings.insuranceExpiry.replace(/-/g, '') + 'T120000Z';
        icsContent += `BEGIN:VEVENT\nSUMMARY:Koniec OC - ${bike.name}\nDTSTART:${dt}\nDTEND:${dt}\nDESCRIPTION:Ubezpieczenie OC wygasa.\nEND:VEVENT\n`;
      }
      if (settings.lastInspectionDate) {
        const dt = settings.lastInspectionDate.replace(/-/g, '') + 'T120000Z';
        icsContent += `BEGIN:VEVENT\nSUMMARY:Koniec Przeglądu - ${bike.name}\nDTSTART:${dt}\nDTEND:${dt}\nDESCRIPTION:Przegląd techniczny wygasa.\nEND:VEVENT\n`;
      }
    }
  }

  icsContent += "END:VCALENDAR";
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    window.location.assign(`data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`);
  } else {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'uki-bike-log-przypomnienia.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
