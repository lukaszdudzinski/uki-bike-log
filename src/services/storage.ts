import localforage from 'localforage';

export interface FuelEntry {
  id: string;
  date: string;
  odo: number;
  liters: number;
  price: number;
  isFullTank: boolean;
}

export interface ServiceEntry {
  id: string;
  date: string;
  odo: number;
  type: 'service' | 'repair' | 'accessory' | 'other';
  description: string;
  cost: number;
}

export interface RouteEntry {
  id: string;
  name: string;
  address: string;
}

export interface BikeSettings {
  initialOdo: number;
  insuranceExpiry: string; // OC
  insuranceAcExpiry: string; // AC
  lastInspectionDate: string;
  serviceIntervalKm: number;
  lastServiceOdo: number;
  lastServiceDate: string; // Oil change date (12 months interval)
  chainIntervalKm: number;
  lastChainOdo: number;
  valveClearanceIntervalKm: number;
  lastValveClearanceOdo: number;
}

const STORAGE_KEYS = {
  FUEL: 'uki_fuel_logs',
  SERVICE: 'uki_service_logs',
  SETTINGS: 'uki_bike_settings',
  ROUTES: 'uki_favorite_routes',
};

// Initialize localforage
localforage.config({
  name: 'UkiBikeLog',
  storeName: 'logs'
});

// Synchronous memory cache
let cache = {
  fuel: [] as FuelEntry[],
  service: [] as ServiceEntry[],
  routes: [] as RouteEntry[],
  settings: null as BikeSettings | null,
};

export const storage = {
  // --- Initialization ---
  initDB: async () => {
    // Migrate from localStorage if needed (for backwards compatibility)
    for (const key of Object.values(STORAGE_KEYS)) {
      const localData = localStorage.getItem(key);
      if (localData) {
        const existingForage = await localforage.getItem(key);
        if (!existingForage) {
          await localforage.setItem(key, JSON.parse(localData));
        }
      }
    }

    // Load everything into memory cache
    cache.fuel = (await localforage.getItem<FuelEntry[]>(STORAGE_KEYS.FUEL)) || [];
    cache.service = (await localforage.getItem<ServiceEntry[]>(STORAGE_KEYS.SERVICE)) || [];
    cache.routes = (await localforage.getItem<RouteEntry[]>(STORAGE_KEYS.ROUTES)) || [
      { id: '1', name: 'Serwis Janusz (Przykładowy)', address: 'Warszawa, Złote Tarasy' },
      { id: '2', name: 'Bieszczady - Baza', address: 'Wetlina' },
    ];
    cache.settings = (await localforage.getItem<BikeSettings>(STORAGE_KEYS.SETTINGS)) || {
      initialOdo: 12000,
      insuranceExpiry: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      insuranceAcExpiry: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lastInspectionDate: new Date(new Date().getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      serviceIntervalKm: 5000,
      lastServiceOdo: 12000,
      lastServiceDate: new Date(new Date().getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      chainIntervalKm: 500,
      lastChainOdo: 12000,
      valveClearanceIntervalKm: 10000,
      lastValveClearanceOdo: 10000,
    };
  },

  exportBackup: () => {
    const backup = {
      fuel: cache.fuel,
      service: cache.service,
      routes: cache.routes,
      settings: cache.settings
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uki_bikelog_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup: async (jsonString: string) => {
    try {
      const backup = JSON.parse(jsonString);
      if (backup.settings) await localforage.setItem(STORAGE_KEYS.SETTINGS, backup.settings);
      if (backup.fuel) await localforage.setItem(STORAGE_KEYS.FUEL, backup.fuel);
      if (backup.service) await localforage.setItem(STORAGE_KEYS.SERVICE, backup.service);
      if (backup.routes) await localforage.setItem(STORAGE_KEYS.ROUTES, backup.routes);
      // Reload cache
      await storage.initDB();
      return true;
    } catch (e) {
      console.error('Błąd importu', e);
      return false;
    }
  },

  // --- Fuel ---
  getFuelLogs: (): FuelEntry[] => cache.fuel,
  addFuelLog: (entry: Omit<FuelEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() };
    cache.fuel.push(newEntry);
    cache.fuel.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localforage.setItem(STORAGE_KEYS.FUEL, cache.fuel);
    return newEntry;
  },

  // --- Service ---
  getServiceLogs: (): ServiceEntry[] => cache.service,
  addServiceLog: (entry: Omit<ServiceEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() + Math.random().toString(36).substring(2, 9) };
    cache.service.push(newEntry);
    localforage.setItem(STORAGE_KEYS.SERVICE, cache.service);
    return newEntry;
  },

  // --- Routes ---
  getRoutes: (): RouteEntry[] => cache.routes,
  addRoute: (entry: Omit<RouteEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() + Math.random().toString(36).substring(2, 9) };
    cache.routes.push(newEntry);
    localforage.setItem(STORAGE_KEYS.ROUTES, cache.routes);
    return newEntry;
  },
  deleteRoute: (id: string) => {
    cache.routes = cache.routes.filter(r => r.id !== id);
    localforage.setItem(STORAGE_KEYS.ROUTES, cache.routes);
  },

  // --- Settings ---
  getSettings: (): BikeSettings => cache.settings!,
  saveSettings: (settings: BikeSettings) => {
    cache.settings = settings;
    localforage.setItem(STORAGE_KEYS.SETTINGS, settings);
  },

  // --- Calculated Stats ---
  getCurrentOdo: (): number => {
    if (!cache.settings) return 0;
    const maxFuelOdo = cache.fuel.length > 0 ? Math.max(...cache.fuel.map(l => l.odo)) : 0;
    return Math.max(cache.settings.initialOdo, maxFuelOdo);
  },

  getAverageConsumption: (): number | null => {
    const logs = [...cache.fuel].sort((a, b) => a.odo - b.odo);
    if (logs.length < 2) return null;

    let totalLiters = 0;
    let startOdo = -1;
    let endOdo = -1;
    let foundFirstFull = false;

    for (let i = 0; i < logs.length; i++) {
      if (!foundFirstFull) {
        if (logs[i].isFullTank) {
          foundFirstFull = true;
          startOdo = logs[i].odo;
        }
      } else {
        totalLiters += logs[i].liters;
        if (logs[i].isFullTank) {
          endOdo = logs[i].odo;
        }
      }
    }

    if (startOdo === -1 || endOdo === -1 || endOdo <= startOdo) return null;
    const distance = endOdo - startOdo;
    if (distance <= 0) return null;

    return (totalLiters / distance) * 100;
  }
};
