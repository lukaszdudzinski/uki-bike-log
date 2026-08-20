import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { storage } from '../services/storage';
import type { BikeProfile } from '../services/storage';

interface GarageContextType {
  bikes: BikeProfile[];
  activeBike: BikeProfile | undefined;
  isLoading: boolean;
  switchBike: (id: string) => Promise<void>;
  addBike: (name: string) => Promise<void>;
  editBike: (id: string, name: string) => Promise<void>;
  deleteBike: (id: string) => Promise<void>;
  updateBikeCoverPhoto: (id: string, base64Image: string | null) => Promise<void>;
}

const GarageContext = createContext<GarageContextType | undefined>(undefined);

export function GarageProvider({ children }: { children: ReactNode }) {
  const [bikes, setBikes] = useState<BikeProfile[]>([]);
  const [activeBike, setActiveBike] = useState<BikeProfile | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage.initDB().then(() => {
      setBikes([...storage.getBikes()]);
      setActiveBike(storage.getActiveBike());
      setIsLoading(false);
    });
  }, []);

  const switchBike = async (id: string) => {
    setIsLoading(true);
    await storage.switchBike(id);
    setBikes([...storage.getBikes()]);
    setActiveBike(storage.getActiveBike());
    setIsLoading(false);
  };

  const addBike = async (name: string) => {
    setIsLoading(true);
    const newBike = await storage.addBike(name);
    await storage.switchBike(newBike.id);
    setBikes([...storage.getBikes()]);
    setActiveBike(storage.getActiveBike());
    setIsLoading(false);
  };

  const editBike = async (id: string, name: string) => {
    await storage.editBike(id, name);
    setBikes([...storage.getBikes()]);
    setActiveBike(storage.getActiveBike());
  };

  const deleteBike = async (id: string) => {
    setIsLoading(true);
    await storage.deleteBike(id);
    setBikes([...storage.getBikes()]);
    setActiveBike(storage.getActiveBike());
    setIsLoading(false);
  };

  const updateBikeCoverPhoto = async (id: string, base64Image: string | null) => {
    await storage.updateBikeCoverPhoto(id, base64Image);
    setBikes([...storage.getBikes()]);
    setActiveBike(storage.getActiveBike());
  };

  return (
    <GarageContext.Provider value={{ bikes, activeBike, isLoading, switchBike, addBike, editBike, deleteBike, updateBikeCoverPhoto }}>
      {children}
    </GarageContext.Provider>
  );
}

export function useGarage() {
  const context = useContext(GarageContext);
  if (context === undefined) {
    throw new Error('useGarage must be used within a GarageProvider');
  }
  return context;
}
