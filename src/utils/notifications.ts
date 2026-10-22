import localforage from 'localforage';
import { storage } from '../services/storage';
import type { BikeSettings, FuelEntry } from '../services/storage';
import {
  DEFAULT_REMINDER_PREFS,
  LEAD_DAYS_OPTIONS,
  buildDigest,
  computeReminders,
  markSent,
  selectNew,
  type LeadDays,
  type Reminder,
  type ReminderPrefs,
  type ReminderType,
  type SentLog,
} from './reminders';

const getStorageKeys = (bikeId: string) => {
  const prefix = bikeId === 'default' ? '' : `_${bikeId}`;
  return {
    SETTINGS: `uki_bike_settings${prefix}`,
    FUEL: `uki_fuel_logs${prefix}`,
  };
};

export const REMINDER_PREFS_KEY = 'ukis.bike-log.notifications.prefs';
export const REMINDER_SENT_KEY = 'ukis.bike-log.notifications.sent';

const BASE = '/uki-bike-log/';
const ICON = `${BASE}pwa-192x192.png`;
const DIGEST_TAG = 'ukis-bikelog-digest';
// Powyżej tej liczby nowych przypomnień naraz wysyłamy jedno zbiorcze powiadomienie
const MAX_SEPARATE_NOTIFICATIONS = 3;

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const loadReminderPrefs = (): ReminderPrefs => {
  const saved = readJson<Partial<ReminderPrefs>>(REMINDER_PREFS_KEY);
  const leadDays = LEAD_DAYS_OPTIONS.includes(saved?.leadDays as LeadDays) ? (saved!.leadDays as LeadDays) : DEFAULT_REMINDER_PREFS.leadDays;
  const enabled = { ...DEFAULT_REMINDER_PREFS.enabled };
  for (const type of Object.keys(enabled) as ReminderType[]) {
    if (typeof saved?.enabled?.[type] === 'boolean') enabled[type] = saved.enabled[type];
  }
  return { leadDays, enabled };
};

export const saveReminderPrefs = (prefs: ReminderPrefs) => {
  localStorage.setItem(REMINDER_PREFS_KEY, JSON.stringify(prefs));
};

const showSystemNotification = async (title: string, options: NotificationOptions) => {
  // Tylko rejestracja Bike Log (domena jest wspólna dla aplikacji UKIS)
  const registration = await navigator.serviceWorker?.getRegistration(BASE);
  if (registration) {
    await registration.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
};

/**
 * Wysyła powiadomienia o NOWYCH etapach przypomnień. Nic nie robi, gdy Bike Log nie jest na ekranie:
 * telefon potrafi przeładować uśpioną kartę Bike Log w tle, np. po otwarciu innej aplikacji UKIS.
 * Zwraca wysłane przypomnienia.
 */
export const checkAndFireNotifications = async (): Promise<Reminder[]> => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return [];
  if (document.visibilityState !== 'visible') return [];

  const prefs = loadReminderPrefs();
  const today = new Date();
  const all: Reminder[] = [];

  for (const bike of storage.getBikes()) {
    const keys = getStorageKeys(bike.id);
    const settings: BikeSettings | null = await localforage.getItem(keys.SETTINGS);
    if (!settings) continue;
    const fuelLogs = (await localforage.getItem<FuelEntry[]>(keys.FUEL)) || [];
    const odo = Math.max(settings.initialOdo || 0, ...fuelLogs.map(l => l.odo));
    all.push(...computeReminders(bike, settings, odo, prefs, today));
  }

  const sent = readJson<SentLog>(REMINDER_SENT_KEY) || {};
  const fresh = selectNew(all, sent);
  if (fresh.length === 0) return [];

  try {
    if (fresh.length > MAX_SEPARATE_NOTIFICATIONS) {
      const digest = buildDigest(fresh);
      await showSystemNotification(digest.title, {
        body: digest.body, icon: ICON, badge: ICON, tag: DIGEST_TAG, data: { url: `${BASE}#/` },
      });
    } else {
      for (const r of fresh) {
        await showSystemNotification(r.title, {
          body: r.body, icon: ICON, badge: ICON, tag: r.id, data: { url: `${BASE}?bike=${encodeURIComponent(r.bikeId)}#/` },
        });
      }
    }
  } catch (e) {
    window.ukiLogError?.(`Powiadomienia: ${e instanceof Error ? e.message : String(e)}`, e instanceof Error ? e.stack || '' : '');
    return [];
  }

  localStorage.setItem(REMINDER_SENT_KEY, JSON.stringify(markSent(sent, fresh)));
  return fresh;
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
