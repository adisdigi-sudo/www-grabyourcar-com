// Re-export types and data
export * from "./types";
import marutiCars from "./maruti";
import hyundaiCars from "./hyundai";
import tataCars from "./tata";
import mahindraCars from "./mahindra";
import kiaCars from "./kia";
import { Car } from "./types";

// Combine all brand cars
export const allCars: Car[] = [
  ...marutiCars,
  ...hyundaiCars,
  ...tataCars,
  ...mahindraCars,
  ...kiaCars,
];

export default allCars;
