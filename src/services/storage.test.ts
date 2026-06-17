import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from './storage';

describe('Storage Service', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should return default settings if none exist', () => {
    const settings = storage.getSettings();
    expect(settings.initialOdo).toBe(12000);
    expect(settings.serviceIntervalKm).toBe(5000);
  });

  it('should save and retrieve custom settings', () => {
    const customSettings = {
      initialOdo: 15000,
      insuranceExpiry: '2026-12-31',
      registrationExpiry: '2027-01-01',
      serviceIntervalKm: 6000,
      lastServiceOdo: 15000,
    };
    storage.saveSettings(customSettings);
    
    const retrieved = storage.getSettings();
    expect(retrieved.initialOdo).toBe(15000);
    expect(retrieved.serviceIntervalKm).toBe(6000);
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
});
