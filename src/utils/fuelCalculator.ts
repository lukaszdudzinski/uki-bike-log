import { type FuelEntry } from '../services/storage';

export function calculateEntryConsumption(logs: FuelEntry[], currentLogId: string): number | null {
  // Sort logs by ODO ascending
  const sortedLogs = [...logs].sort((a, b) => a.odo - b.odo);
  
  const currentIndex = sortedLogs.findIndex(l => l.id === currentLogId);
  if (currentIndex <= 0) return null; // No previous log
  
  const currentLog = sortedLogs[currentIndex];
  if (!currentLog.isFullTank) return null; // Can only calculate if filled to full

  // Find previous full tank
  let prevFullIndex = -1;
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (sortedLogs[i].isFullTank) {
      prevFullIndex = i;
      break;
    }
  }

  if (prevFullIndex === -1) return null; // No previous full tank

  const distance = currentLog.odo - sortedLogs[prevFullIndex].odo;
  if (distance <= 0) return null;

  // Sum liters from prevFullIndex + 1 up to currentIndex
  let totalLiters = 0;
  for (let i = prevFullIndex + 1; i <= currentIndex; i++) {
    totalLiters += sortedLogs[i].liters;
  }

  return (totalLiters / distance) * 100;
}
