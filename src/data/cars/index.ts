// Re-export types and data
export * from "./types";
// Luxury brands first for migration priority
import bmwCars from "./bmw";
import mercedesCars from "./mercedes";
import audiCars from "./audi";
import volvoCars from "./volvo";
import landRoverCars from "./landrover";
import lexusCars from "./lexus";
import porscheCars from "./porsche";
import jaguarCars from "./jaguar";
import miniCars from "./mini";
import bydCars from "./byd";
// Other brands
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
import citroenCars from "./citroen";
import jeepCars from "./jeep";
import nissanCars from "./nissan";
import renaultCars from "./renault";
import forceCars from "./force";
import isuzuCars from "./isuzu";
import { Car } from "./types";

// Combine all brand cars - luxury brands first for migration priority
export const allCars: Car[] = [
  ...bmwCars,
  ...mercedesCars,
  ...audiCars,
  ...volvoCars,
  ...landRoverCars,
  ...lexusCars,
  ...porscheCars,
  ...jaguarCars,
  ...miniCars,
  ...bydCars,
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
  ...citroenCars,
  ...jeepCars,
  ...nissanCars,
  ...renaultCars,
  ...forceCars,
  ...isuzuCars,
];

export default allCars;
