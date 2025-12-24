// Re-export types and data
export * from "./types";
import marutiCars from "./maruti";
import { Car } from "./types";

// Combine all brand cars
export const allCars: Car[] = [
  ...marutiCars,
  // More brands will be added in subsequent updates
];

export default allCars;
