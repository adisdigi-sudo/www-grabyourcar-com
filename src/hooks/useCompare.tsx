import { createContext, useContext, useState, ReactNode } from "react";
import { Car } from "@/data/cars/types";
import { useCars } from "@/hooks/useCars";

interface CompareContextType {
  selectedCars: Car[];
  addToCompare: (carId: string | number) => void;
  removeFromCompare: (carId: string | number) => void;
  isInCompare: (carId: string | number) => boolean;
  clearCompare: () => void;
  canAddMore: boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const { data: dbCars = [] } = useCars({ useDatabase: true });

  // Normalize ID to string for consistent comparison
  const normalizeId = (id: string | number): string => String(id);

  const selectedCars = selectedCarIds
    .map(id => dbCars.find(car => String(car.id) === id))
    .filter(Boolean) as Car[];

  const addToCompare = (carId: string | number) => {
    const id = normalizeId(carId);
    if (selectedCarIds.length < 3 && !selectedCarIds.includes(id)) {
      setSelectedCarIds(prev => [...prev, id]);
    }
  };

  const removeFromCompare = (carId: string | number) => {
    const id = normalizeId(carId);
    setSelectedCarIds(prev => prev.filter(existingId => existingId !== id));
  };

  const isInCompare = (carId: string | number) => {
    const id = normalizeId(carId);
    return selectedCarIds.includes(id);
  };

  const clearCompare = () => setSelectedCarIds([]);

  const canAddMore = selectedCarIds.length < 3;

  return (
    <CompareContext.Provider
      value={{
        selectedCars,
        addToCompare,
        removeFromCompare,
        isInCompare,
        clearCompare,
        canAddMore,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
};

// Safe version that returns null if context is not available
export const useCompareSafe = () => {
  return useContext(CompareContext);
};
