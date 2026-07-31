import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from './storage';
import localforage from 'localforage';

describe('Storage Service', () => {
  beforeEach(async () => {
    // Clear both storages before each test
    localStorage.clear();
    await localforage.clear();
    await storage.initDB();
  });

  it('should return default settings if none exist', () => {
    const settings = storage.getSettings();
    expect(settings.initialOdo).toBe(12000);
    expect(settings.serviceIntervalKm).toBe(5000);
  });

  it('should save and retrieve custom settings', () => {
      const customSettings = {
        initialOdo: 1000,
        tankCapacity: 13.5,
        insuranceExpiry: '2026-01-01',
        insuranceAcExpiry: '2026-01-01',
        lastInspectionDate: '2026-01-01',
        serviceIntervalKm: 6000,
        lastServiceOdo: 15000,
        lastServiceDate: '2026-01-01',
        chainIntervalKm: 600,
        lastChainOdo: 15000,
        valveClearanceIntervalKm: 10000,
        lastValveClearanceOdo: 15000,
      };
    storage.saveSettings(customSettings);
    
    const retrieved = storage.getSettings();
    expect(retrieved.initialOdo).toBe(15000);
    expect(retrieved.chainIntervalKm).toBe(600);
  });

  it('should add a fuel log and sort by date descending', () => {
    storage.addFuelLog({
      date: '2026-06-15T10:00:00.000Z',
      odo: 12100,
      liters: 10,
      price: 60,
      isFullTank: true
    });

    storage.addFuelLog({
      date: '2026-06-16T12:00:00.000Z',
      odo: 12300,
      liters: 12,
      price: 75,
      isFullTank: false
    });

    const logs = storage.getFuelLogs();
    expect(logs.length).toBe(2);
    // Newest should be first
    expect(logs[0].odo).toBe(12300);
    expect(logs[1].odo).toBe(12100);
  });

  it('should correctly calculate current ODO based on settings and logs', () => {
    // Initial is 12000
    expect(storage.getCurrentOdo()).toBe(12000);

    storage.addFuelLog({
      date: '2026-06-15T10:00:00.000Z',
      odo: 12500,
      liters: 10,
      price: 60,
      isFullTank: true
    });

    expect(storage.getCurrentOdo()).toBe(12500);
  });

  it('should calculate average consumption based on full tanks', () => {
    expect(storage.getAverageConsumption()).toBeNull();

    // 1st full tank
    storage.addFuelLog({ date: '2026-06-01T10:00:00.000Z', odo: 12000, liters: 10, price: 60, isFullTank: true });
    // Not enough logs yet
    expect(storage.getAverageConsumption()).toBeNull();

    // Not full tank
    storage.addFuelLog({ date: '2026-06-05T10:00:00.000Z', odo: 12200, liters: 5, price: 30, isFullTank: false });
    // Still no second full tank
    expect(storage.getAverageConsumption()).toBeNull();

    // 2nd full tank
    storage.addFuelLog({ date: '2026-06-10T10:00:00.000Z', odo: 12300, liters: 7, price: 42, isFullTank: true });
    
    // Distance = 12300 - 12000 = 300km
    // Liters = 5 + 7 = 12L
    // Avg = (12 / 300) * 100 = 4.0 L/100km
    expect(storage.getAverageConsumption()).toBeCloseTo(4.0);
  });
});
