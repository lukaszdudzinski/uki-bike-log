import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import localforage from 'localforage';
import { storage, type BikeSettings } from '../services/storage';
import {
  REMINDER_PREFS_KEY,
  REMINDER_SENT_KEY,
  checkAndFireNotifications,
  loadReminderPrefs,
  saveReminderPrefs,
} from './notifications';
import { DEFAULT_REMINDER_PREFS } from './reminders';

const showNotification = vi.fn();
let permission: NotificationPermission = 'granted';
let visibility: DocumentVisibilityState = 'visible';

const SETTINGS: BikeSettings = {
  initialOdo: 10000,
  tankCapacity: 13.5,
  insuranceExpiry: '2027-06-01',
  insuranceAcExpiry: '2027-06-01',
  lastInspectionDate: '2026-06-01',
  serviceIntervalKm: 5000,
  lastServiceOdo: 10000,
  lastServiceDate: '2026-06-01',
  chainIntervalKm: 500,
  lastChainOdo: 10000,
  valveClearanceIntervalKm: 10000,
  lastValveClearanceOdo: 10000,
  insurerName: 'PZU',
  policyNumber: 'POL-123456',
};

const setToday = (y: number, m: number, d: number) => vi.setSystemTime(new Date(y, m - 1, d, 12, 0, 0));

const saveSettings = async (over: Partial<BikeSettings>) => {
  storage.saveSettings({ ...SETTINGS, ...over });
  await localforage.setItem('uki_bike_settings', { ...SETTINGS, ...over });
};

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  setToday(2026, 10, 22);
  localStorage.clear();
  await localforage.clear();
  await storage.initDB();
  await saveSettings({});
  showNotification.mockReset();
  permission = 'granted';
  visibility = 'visible';
  vi.stubGlobal('Notification', { get permission() { return permission; }, requestPermission: vi.fn() });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn(async () => ({ showNotification })) },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('checkAndFireNotifications', () => {
  it('nie wysyła nic, gdy Bike Log nie jest na ekranie (przeładowanie w tle przez inną aplikację UKIS)', async () => {
    await saveSettings({ insuranceExpiry: '2026-11-05' });
    visibility = 'hidden';
    expect(await checkAndFireNotifications()).toEqual([]);
    expect(showNotification).not.toHaveBeenCalled();
    expect(localStorage.getItem(REMINDER_SENT_KEY)).toBeNull();
  });

  it('bez zgody na powiadomienia nic nie wysyła', async () => {
    await saveSettings({ insuranceExpiry: '2026-11-05' });
    permission = 'default';
    expect(await checkAndFireNotifications()).toEqual([]);
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('wysyła przypomnienie z treścią, ikoną Bike Log, tagiem i adresem pojazdu', async () => {
    await saveSettings({ insuranceExpiry: '2026-11-05' });
    await checkAndFireNotifications();
    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('🛡️ OC wygasa za 14 dni', {
      body: 'Royal Enfield Bullet 350: polisa OC (PZU, nr POL-123456) jest ważna do 5.11.2026. Odnów ją na czas, żeby jeździć legalnie.',
      icon: '/uki-bike-log/pwa-192x192.png',
      badge: '/uki-bike-log/pwa-192x192.png',
      tag: 'default:oc:2026-11-05',
      data: { url: '/uki-bike-log/?bike=default#/' },
    });
    expect(navigator.serviceWorker.getRegistration).toHaveBeenCalledWith('/uki-bike-log/');
  });

  it('drugie uruchomienie tego samego dnia nic nie wysyła, kolejny etap tak', async () => {
    await saveSettings({ insuranceExpiry: '2026-11-05' });
    await checkAndFireNotifications();
    await checkAndFireNotifications();
    expect(showNotification).toHaveBeenCalledTimes(1);

    setToday(2026, 11, 3); // za 2 dni: nadal etap „lead”, bez powtórki
    await checkAndFireNotifications();
    expect(showNotification).toHaveBeenCalledTimes(1);

    setToday(2026, 11, 4); // dzień przed terminem
    await checkAndFireNotifications();
    expect(showNotification).toHaveBeenCalledTimes(2);
    expect(showNotification.mock.calls[1][0]).toBe('🛡️ OC wygasa jutro');
  });

  it('wyłączony rodzaj i krótsze wyprzedzenie z ustawień są respektowane', async () => {
    await saveSettings({ insuranceExpiry: '2026-11-05' });
    saveReminderPrefs({ ...DEFAULT_REMINDER_PREFS, leadDays: 7 });
    await checkAndFireNotifications();
    expect(showNotification).not.toHaveBeenCalled();

    saveReminderPrefs({ leadDays: 30, enabled: { ...DEFAULT_REMINDER_PREFS.enabled, oc: false } });
    await checkAndFireNotifications();
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('więcej niż 3 nowe przypomnienia naraz: jedno zbiorcze powiadomienie', async () => {
    await saveSettings({ insuranceExpiry: '2026-10-25', insuranceAcExpiry: '2026-10-23', lastInspectionDate: '2025-10-20', lastChainOdo: 9000 });
    await checkAndFireNotifications();
    expect(showNotification).toHaveBeenCalledTimes(1);
    const [title, options] = showNotification.mock.calls[0];
    expect(title).toBe("Uki's Bike Log: 4 przypomnienia");
    expect(options.tag).toBe('ukis-bikelog-digest');
    expect(options.data).toEqual({ url: '/uki-bike-log/#/' });
    await checkAndFireNotifications();
    expect(showNotification).toHaveBeenCalledTimes(1);
  });
});

describe('preferencje przypomnień', () => {
  it('domyślne, zapis i odczyt pod kluczem z prefiksem Bike Log', () => {
    expect(loadReminderPrefs()).toEqual(DEFAULT_REMINDER_PREFS);
    saveReminderPrefs({ leadDays: 3, enabled: { oc: true, ac: false, inspection: true, chain: false } });
    expect(REMINDER_PREFS_KEY).toBe('ukis.bike-log.notifications.prefs');
    expect(loadReminderPrefs()).toEqual({ leadDays: 3, enabled: { oc: true, ac: false, inspection: true, chain: false } });
  });

  it('uszkodzony zapis lub nieznana wartość wraca do domyślnych', () => {
    localStorage.setItem(REMINDER_PREFS_KEY, '{zepsute');
    expect(loadReminderPrefs()).toEqual(DEFAULT_REMINDER_PREFS);
    localStorage.setItem(REMINDER_PREFS_KEY, JSON.stringify({ leadDays: 99, enabled: { oc: false } }));
    expect(loadReminderPrefs()).toEqual({ leadDays: 14, enabled: { ...DEFAULT_REMINDER_PREFS.enabled, oc: false } });
  });
});
