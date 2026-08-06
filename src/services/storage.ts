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
  tankCapacity: number;
  insuranceExpiry: string; // OC
  insuranceAcExpiry: string; // AC
  insuranceCost?: number;
  insurerName?: string;
  policyNumber?: string;
  insuranceHotline?: string;
  lastInspectionDate: string;
  serviceIntervalKm: number;
  lastServiceOdo: number;
  lastServiceDate: string; // Oil change date
  chainIntervalKm: number;
  lastChainOdo: number;
  valveClearanceIntervalKm: number;
  lastValveClearanceOdo: number;
  avatar?: string;
  nickname?: string;
}

export interface BikeProfile {
  id: string;
  name: string;
  createdAt: number;
}

const GLOBAL_KEYS = {
  BIKES: 'uki_bikes_list',
  ACTIVE_BIKE: 'uki_active_bike_id'
};

const getStorageKeys = (bikeId: string) => {
  const prefix = bikeId === 'default' ? '' : `_${bikeId}`;
  return {
    FUEL: `uki_fuel_logs${prefix}`,
    SERVICE: `uki_service_logs${prefix}`,
    SETTINGS: `uki_bike_settings${prefix}`,
    ROUTES: `uki_favorite_routes${prefix}`,
  };
};

// Initialize localforage
localforage.config({
  name: 'UkiBikeLog',
  storeName: 'logs'
});

// Synchronous memory cache
let cache = {
  bikes: [] as BikeProfile[],
  activeBikeId: 'default',
  fuel: [] as FuelEntry[],
  service: [] as ServiceEntry[],
  routes: [] as RouteEntry[],
  settings: null as BikeSettings | null,
};

export const storage = {
  // --- Initialization & Migration ---
  initDB: async () => {
    const savedBikes = await localforage.getItem<BikeProfile[]>(GLOBAL_KEYS.BIKES);
    const savedActive = await localforage.getItem<string>(GLOBAL_KEYS.ACTIVE_BIKE);

    if (!savedBikes || savedBikes.length === 0) {
      const defaultBike = { id: 'default', name: 'Royal Enfield Bullet 350', createdAt: Date.now() };
      cache.bikes = [defaultBike];
      cache.activeBikeId = 'default';
      await localforage.setItem(GLOBAL_KEYS.BIKES, cache.bikes);
      await localforage.setItem(GLOBAL_KEYS.ACTIVE_BIKE, cache.activeBikeId);
    } else {
      cache.bikes = savedBikes;
      cache.activeBikeId = savedActive || savedBikes[0].id;
    }

    await storage.loadBikeData(cache.activeBikeId);
  },

  loadBikeData: async (bikeId: string) => {
    const keys = getStorageKeys(bikeId);
    
    // Migrate from localStorage if needed (for backward compatibility on default bike)
    if (bikeId === 'default') {
      for (const key of Object.values(keys)) {
        const localData = localStorage.getItem(key);
        if (localData) {
          const existingForage = await localforage.getItem(key);
          if (!existingForage) {
            await localforage.setItem(key, JSON.parse(localData));
          }
        }
      }
    }

    // Load everything into memory cache
    cache.fuel = (await localforage.getItem<FuelEntry[]>(keys.FUEL)) || [];
    cache.service = (await localforage.getItem<ServiceEntry[]>(keys.SERVICE)) || [];
    cache.routes = (await localforage.getItem<RouteEntry[]>(keys.ROUTES)) || [
      { id: '1', name: 'Serwis Janusz (Przykładowy)', address: 'Warszawa, Złote Tarasy' },
      { id: '2', name: 'Bieszczady - Baza', address: 'Wetlina' },
    ];
    cache.settings = (await localforage.getItem<BikeSettings>(keys.SETTINGS)) || {
      initialOdo: 12000,
      tankCapacity: 13.5, // Default for Bullet 350
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

  // --- Bike Management ---
  getBikes: (): BikeProfile[] => cache.bikes,
  getActiveBikeId: (): string => cache.activeBikeId,
  getActiveBike: (): BikeProfile | undefined => cache.bikes.find(b => b.id === cache.activeBikeId),
  
  addBike: async (name: string): Promise<BikeProfile> => {
    const newId = 'bike_' + Date.now();
    const newBike = { id: newId, name, createdAt: Date.now() };
    cache.bikes.push(newBike);
    await localforage.setItem(GLOBAL_KEYS.BIKES, cache.bikes);
    return newBike;
  },

  deleteBike: async (id: string): Promise<boolean> => {
    if (cache.bikes.length <= 1) return false;
    cache.bikes = cache.bikes.filter(b => b.id !== id);
    await localforage.setItem(GLOBAL_KEYS.BIKES, cache.bikes);
    
    // Switch if we just deleted the active bike
    if (cache.activeBikeId === id) {
      await storage.switchBike(cache.bikes[0].id);
    }
    
    // Clean up localforage keys for deleted bike
    const keys = getStorageKeys(id);
    await localforage.removeItem(keys.FUEL);
    await localforage.removeItem(keys.SERVICE);
    await localforage.removeItem(keys.SETTINGS);
    await localforage.removeItem(keys.ROUTES);
    
    return true;
  },

  editBike: async (id: string, newName: string) => {
    const bike = cache.bikes.find(b => b.id === id);
    if (bike) {
      bike.name = newName;
      await localforage.setItem(GLOBAL_KEYS.BIKES, cache.bikes);
    }
  },

  switchBike: async (id: string): Promise<boolean> => {
    if (cache.bikes.find(b => b.id === id)) {
      cache.activeBikeId = id;
      await localforage.setItem(GLOBAL_KEYS.ACTIVE_BIKE, id);
      await storage.loadBikeData(id);
      return true;
    }
    return false;
  },

  // --- Backup (Exports all bikes) ---
  exportBackup: async () => {
    const backup: any = { bikes: cache.bikes, activeBikeId: cache.activeBikeId, data: {} };
    for (const bike of cache.bikes) {
      const keys = getStorageKeys(bike.id);
      backup.data[bike.id] = {
        fuel: await localforage.getItem(keys.FUEL),
        service: await localforage.getItem(keys.SERVICE),
        routes: await localforage.getItem(keys.ROUTES),
        settings: await localforage.getItem(keys.SETTINGS)
      };
    }
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
      
      // Backward compatibility logic: if backup doesn't have bikes array, it's an old backup
      if (!backup.bikes) {
        // It's a v1 backup. Load it into 'default'.
        const keys = getStorageKeys('default');
        if (backup.settings) await localforage.setItem(keys.SETTINGS, backup.settings);
        if (backup.fuel) await localforage.setItem(keys.FUEL, backup.fuel);
        if (backup.service) await localforage.setItem(keys.SERVICE, backup.service);
        if (backup.routes) await localforage.setItem(keys.ROUTES, backup.routes);
      } else {
        // It's a v2 backup
        await localforage.setItem(GLOBAL_KEYS.BIKES, backup.bikes);
        await localforage.setItem(GLOBAL_KEYS.ACTIVE_BIKE, backup.activeBikeId);
        for (const bikeId of Object.keys(backup.data)) {
          const keys = getStorageKeys(bikeId);
          if (backup.data[bikeId].settings) await localforage.setItem(keys.SETTINGS, backup.data[bikeId].settings);
          if (backup.data[bikeId].fuel) await localforage.setItem(keys.FUEL, backup.data[bikeId].fuel);
          if (backup.data[bikeId].service) await localforage.setItem(keys.SERVICE, backup.data[bikeId].service);
          if (backup.data[bikeId].routes) await localforage.setItem(keys.ROUTES, backup.data[bikeId].routes);
        }
      }
      
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
    localforage.setItem(getStorageKeys(cache.activeBikeId).FUEL, cache.fuel);
    return newEntry;
  },
  editFuelLog: (id: string, updatedEntry: Omit<FuelEntry, 'id'>) => {
    const index = cache.fuel.findIndex(f => f.id === id);
    if (index !== -1) {
      cache.fuel[index] = { ...updatedEntry, id };
      cache.fuel.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localforage.setItem(getStorageKeys(cache.activeBikeId).FUEL, cache.fuel);
    }
  },
  deleteFuelLog: (id: string) => {
    cache.fuel = cache.fuel.filter(f => f.id !== id);
    localforage.setItem(getStorageKeys(cache.activeBikeId).FUEL, cache.fuel);
  },

  // --- Service ---
  getServiceLogs: (): ServiceEntry[] => cache.service,
  addServiceLog: (entry: Omit<ServiceEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() + Math.random().toString(36).substring(2, 9) };
    cache.service.push(newEntry);
    localforage.setItem(getStorageKeys(cache.activeBikeId).SERVICE, cache.service);
    return newEntry;
  },

  // --- Routes ---
  getRoutes: (): RouteEntry[] => cache.routes,
  addRoute: (entry: Omit<RouteEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() + Math.random().toString(36).substring(2, 9) };
    cache.routes.push(newEntry);
    localforage.setItem(getStorageKeys(cache.activeBikeId).ROUTES, cache.routes);
    return newEntry;
  },
  deleteRoute: (id: string) => {
    cache.routes = cache.routes.filter(r => r.id !== id);
    localforage.setItem(getStorageKeys(cache.activeBikeId).ROUTES, cache.routes);
  },

  // --- Settings ---
  getSettings: (): BikeSettings => cache.settings!,
  saveSettings: (settings: BikeSettings) => {
    cache.settings = settings;
    localforage.setItem(getStorageKeys(cache.activeBikeId).SETTINGS, settings);
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
