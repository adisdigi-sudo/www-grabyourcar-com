import { createContext, useContext, useState, ReactNode } from "react";
import { Car } from "@/data/cars/types";
import { allCars } from "@/data/cars";

interface CompareContextType {
  selectedCars: Car[];
  addToCompare: (carId: number) => void;
  removeFromCompare: (carId: number) => void;
  isInCompare: (carId: number) => boolean;
  clearCompare: () => void;
  canAddMore: boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCarIds, setSelectedCarIds] = useState<number[]>([]);

  const selectedCars = selectedCarIds
    .map(id => allCars.find(car => car.id === id))
    .filter(Boolean) as Car[];

  const addToCompare = (carId: number) => {
    if (selectedCarIds.length < 3 && !selectedCarIds.includes(carId)) {
      setSelectedCarIds(prev => [...prev, carId]);
    }
  };

  const removeFromCompare = (carId: number) => {
    setSelectedCarIds(prev => prev.filter(id => id !== carId));
  };

  const isInCompare = (carId: number) => selectedCarIds.includes(carId);

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
