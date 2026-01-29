// Re-export types and data
export * from "./types";
import marutiCars from "./maruti";
import hyundaiCars from "./hyundai";
import tataCars from "./tata";
import mahindraCars from "./mahindra";
import kiaCars from "./kia";
import toyotaCars from "./toyota";
import hondaCars from "./honda";
import mgCars from "./mg";
import skodaCars from "./skoda";
import volkswagenCars from "./volkswagen";
import bmwCars from "./bmw";
import mercedesCars from "./mercedes";
import audiCars from "./audi";
import { Car } from "./types";

// Combine all brand cars
export const allCars: Car[] = [
  ...marutiCars,
  ...hyundaiCars,
  ...tataCars,
  ...mahindraCars,
  ...kiaCars,
  ...toyotaCars,
  ...hondaCars,
  ...mgCars,
  ...skodaCars,
  ...volkswagenCars,
  ...bmwCars,
  ...mercedesCars,
  ...audiCars,
];

export default allCars;
