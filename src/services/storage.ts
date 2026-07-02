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

export interface BikeSettings {
  initialOdo: number;
  insuranceExpiry: string; // OC
  insuranceAcExpiry: string; // AC
  lastInspectionDate: string;
  serviceIntervalKm: number;
  lastServiceOdo: number;
  chainIntervalKm: number;
  lastChainOdo: number;
}

const STORAGE_KEYS = {
  FUEL: 'uki_fuel_logs',
  SERVICE: 'uki_service_logs',
  SETTINGS: 'uki_bike_settings',
};

export const storage = {
  // --- Fuel ---
  getFuelLogs: (): FuelEntry[] => {
    const data = localStorage.getItem(STORAGE_KEYS.FUEL);
    return data ? JSON.parse(data) : [];
  },
  addFuelLog: (entry: Omit<FuelEntry, 'id'>) => {
    const logs = storage.getFuelLogs();
    const newEntry = { ...entry, id: Date.now().toString() };
    logs.push(newEntry);
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEYS.FUEL, JSON.stringify(logs));
    return newEntry;
  },

  // --- Service ---
  getServiceLogs: (): ServiceEntry[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SERVICE);
    return data ? JSON.parse(data) : [];
  },
  addServiceLog: (entry: Omit<ServiceEntry, 'id'>) => {
    const logs = storage.getServiceLogs();
    const newEntry = { ...entry, id: Date.now().toString() };
    logs.push(newEntry);
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEYS.SERVICE, JSON.stringify(logs));
    return newEntry;
  },

  // --- Settings ---
  getSettings: (): BikeSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) return JSON.parse(data);
    
    // Default mock settings
    return {
      initialOdo: 12000,
      insuranceExpiry: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // OC 14 days from now
      insuranceAcExpiry: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // AC 30 days from now
      lastInspectionDate: new Date(new Date().getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
      serviceIntervalKm: 5000,
      lastServiceOdo: 12000,
      chainIntervalKm: 500,
      lastChainOdo: 12000,
    };
  },
  saveSettings: (settings: BikeSettings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- Calculated Stats ---
  getCurrentOdo: (): number => {
    const settings = storage.getSettings();
    const fuelLogs = storage.getFuelLogs();
    const maxFuelOdo = fuelLogs.length > 0 ? Math.max(...fuelLogs.map(l => l.odo)) : 0;
    return Math.max(settings.initialOdo, maxFuelOdo);
  },

  getAverageConsumption: (): number | null => {
    // Calculates avg consumption (L/100km) using all full-tank logs.
    const logs = storage.getFuelLogs().sort((a, b) => a.odo - b.odo);
    if (logs.length < 2) return null; // Need at least 2 logs

    let totalLiters = 0;
    let startOdo = -1;
    let endOdo = -1;
    let foundFirstFull = false;

    // Find the first full tank as the starting point
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
