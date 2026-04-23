// Brand → models catalog with CarDekho URLs
// Use for bulk Firecrawl scraping per brand

export interface ModelEntry {
  modelName: string;
  cardekhoUrl: string;
}

export interface BrandEntry {
  brand: string;
  models: ModelEntry[];
}

export const BRAND_CATALOG: BrandEntry[] = [
  {
    brand: "Maruti Suzuki",
    models: [
      { modelName: "Swift", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Swift" },
      { modelName: "Brezza", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Brezza" },
      { modelName: "Baleno", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Baleno" },
      { modelName: "Dzire", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Dzire" },
      { modelName: "Wagon R", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Wagon_R" },
      { modelName: "Alto K10", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Alto_K10" },
      { modelName: "Ertiga", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Ertiga" },
      { modelName: "Grand Vitara", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Grand_Vitara" },
      { modelName: "XL6", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/XL6" },
      { modelName: "Fronx", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Fronx" },
      { modelName: "Jimny", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Jimny" },
      { modelName: "Invicto", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Invicto" },
      { modelName: "Ignis", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Ignis" },
      { modelName: "Celerio", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Celerio" },
      { modelName: "S-Presso", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/S-Presso" },
      { modelName: "Eeco", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Eeco" },
      { modelName: "Ciaz", cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Ciaz" },
    ],
  },
  {
    brand: "Hyundai",
    models: [
      { modelName: "Creta", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/Creta" },
      { modelName: "Venue", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/Venue" },
      { modelName: "Exter", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/Exter" },
      { modelName: "i20", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/i20" },
      { modelName: "Verna", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/Verna" },
      { modelName: "Aura", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/Aura" },
      { modelName: "Grand i10 Nios", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/Grand_i10_Nios" },
      { modelName: "Alcazar", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/Alcazar" },
      { modelName: "Tucson", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/Tucson" },
      { modelName: "Ioniq 5", cardekhoUrl: "https://www.cardekho.com/cars/Hyundai/Ioniq_5" },
    ],
  },
  {
    brand: "Tata",
    models: [
      { modelName: "Nexon", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Nexon" },
      { modelName: "Punch", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Punch" },
      { modelName: "Harrier", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Harrier" },
      { modelName: "Safari", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Safari" },
      { modelName: "Curvv", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Curvv" },
      { modelName: "Altroz", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Altroz" },
      { modelName: "Tiago", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Tiago" },
      { modelName: "Tigor", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Tigor" },
      { modelName: "Nexon EV", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Nexon_EV" },
      { modelName: "Punch EV", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Punch_EV" },
      { modelName: "Tiago EV", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Tiago_EV" },
      { modelName: "Curvv EV", cardekhoUrl: "https://www.cardekho.com/cars/Tata/Curvv_EV" },
    ],
  },
  {
    brand: "Mahindra",
    models: [
      { modelName: "Scorpio N", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/Scorpio_N" },
      { modelName: "Scorpio Classic", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/Scorpio_Classic" },
      { modelName: "XUV700", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/XUV700" },
      { modelName: "XUV 3XO", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/XUV_3XO" },
      { modelName: "Thar", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/Thar" },
      { modelName: "Thar Roxx", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/Thar_Roxx" },
      { modelName: "Bolero", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/Bolero" },
      { modelName: "Bolero Neo", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/Bolero_Neo" },
      { modelName: "XUV400", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/XUV400" },
      { modelName: "BE 6", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/BE_6" },
      { modelName: "XEV 9e", cardekhoUrl: "https://www.cardekho.com/cars/Mahindra/XEV_9e" },
    ],
  },
  {
    brand: "Toyota",
    models: [
      { modelName: "Innova Crysta", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Innova_Crysta" },
      { modelName: "Innova Hycross", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Innova_Hycross" },
      { modelName: "Fortuner", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Fortuner" },
      { modelName: "Hilux", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Hilux" },
      { modelName: "Hyryder", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Urban_Cruiser_Hyryder" },
      { modelName: "Glanza", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Glanza" },
      { modelName: "Taisor", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Taisor" },
      { modelName: "Rumion", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Rumion" },
      { modelName: "Camry", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Camry" },
      { modelName: "Vellfire", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Vellfire" },
      { modelName: "Land Cruiser", cardekhoUrl: "https://www.cardekho.com/cars/Toyota/Land_Cruiser_300" },
    ],
  },
  {
    brand: "Kia",
    models: [
      { modelName: "Seltos", cardekhoUrl: "https://www.cardekho.com/cars/Kia/Seltos" },
      { modelName: "Sonet", cardekhoUrl: "https://www.cardekho.com/cars/Kia/Sonet" },
      { modelName: "Carens", cardekhoUrl: "https://www.cardekho.com/cars/Kia/Carens" },
      { modelName: "Carnival", cardekhoUrl: "https://www.cardekho.com/cars/Kia/Carnival" },
      { modelName: "EV6", cardekhoUrl: "https://www.cardekho.com/cars/Kia/EV6" },
      { modelName: "EV9", cardekhoUrl: "https://www.cardekho.com/cars/Kia/EV9" },
      { modelName: "Syros", cardekhoUrl: "https://www.cardekho.com/cars/Kia/Syros" },
    ],
  },
  {
    brand: "Honda",
    models: [
      { modelName: "City", cardekhoUrl: "https://www.cardekho.com/cars/Honda/City" },
      { modelName: "Amaze", cardekhoUrl: "https://www.cardekho.com/cars/Honda/Amaze" },
      { modelName: "Elevate", cardekhoUrl: "https://www.cardekho.com/cars/Honda/Elevate" },
    ],
  },
  {
    brand: "Volkswagen",
    models: [
      { modelName: "Virtus", cardekhoUrl: "https://www.cardekho.com/cars/Volkswagen/Virtus" },
      { modelName: "Taigun", cardekhoUrl: "https://www.cardekho.com/cars/Volkswagen/Taigun" },
      { modelName: "Tiguan", cardekhoUrl: "https://www.cardekho.com/cars/Volkswagen/Tiguan" },
    ],
  },
  {
    brand: "Skoda",
    models: [
      { modelName: "Slavia", cardekhoUrl: "https://www.cardekho.com/cars/Skoda/Slavia" },
      { modelName: "Kushaq", cardekhoUrl: "https://www.cardekho.com/cars/Skoda/Kushaq" },
      { modelName: "Kylaq", cardekhoUrl: "https://www.cardekho.com/cars/Skoda/Kylaq" },
      { modelName: "Kodiaq", cardekhoUrl: "https://www.cardekho.com/cars/Skoda/Kodiaq" },
      { modelName: "Superb", cardekhoUrl: "https://www.cardekho.com/cars/Skoda/Superb" },
    ],
  },
  {
    brand: "MG",
    models: [
      { modelName: "Hector", cardekhoUrl: "https://www.cardekho.com/cars/MG/Hector" },
      { modelName: "Astor", cardekhoUrl: "https://www.cardekho.com/cars/MG/Astor" },
      { modelName: "Gloster", cardekhoUrl: "https://www.cardekho.com/cars/MG/Gloster" },
      { modelName: "ZS EV", cardekhoUrl: "https://www.cardekho.com/cars/MG/ZS_EV" },
      { modelName: "Comet EV", cardekhoUrl: "https://www.cardekho.com/cars/MG/Comet_EV" },
      { modelName: "Windsor EV", cardekhoUrl: "https://www.cardekho.com/cars/MG/Windsor_EV" },
    ],
  },
  {
    brand: "Renault",
    models: [
      { modelName: "Kwid", cardekhoUrl: "https://www.cardekho.com/cars/Renault/Kwid" },
      { modelName: "Kiger", cardekhoUrl: "https://www.cardekho.com/cars/Renault/Kiger" },
      { modelName: "Triber", cardekhoUrl: "https://www.cardekho.com/cars/Renault/Triber" },
    ],
  },
  {
    brand: "Nissan",
    models: [
      { modelName: "Magnite", cardekhoUrl: "https://www.cardekho.com/cars/Nissan/Magnite" },
    ],
  },
  {
    brand: "Citroen",
    models: [
      { modelName: "C3", cardekhoUrl: "https://www.cardekho.com/cars/Citroen/C3" },
      { modelName: "C3 Aircross", cardekhoUrl: "https://www.cardekho.com/cars/Citroen/C3_Aircross" },
      { modelName: "Basalt", cardekhoUrl: "https://www.cardekho.com/cars/Citroen/Basalt" },
      { modelName: "eC3", cardekhoUrl: "https://www.cardekho.com/cars/Citroen/eC3" },
    ],
  },
  {
    brand: "Jeep",
    models: [
      { modelName: "Compass", cardekhoUrl: "https://www.cardekho.com/cars/Jeep/Compass" },
      { modelName: "Meridian", cardekhoUrl: "https://www.cardekho.com/cars/Jeep/Meridian" },
      { modelName: "Wrangler", cardekhoUrl: "https://www.cardekho.com/cars/Jeep/Wrangler" },
    ],
  },
  {
    brand: "BYD",
    models: [
      { modelName: "Atto 3", cardekhoUrl: "https://www.cardekho.com/cars/BYD/Atto_3" },
      { modelName: "Seal", cardekhoUrl: "https://www.cardekho.com/cars/BYD/Seal" },
      { modelName: "eMAX 7", cardekhoUrl: "https://www.cardekho.com/cars/BYD/eMAX_7" },
    ],
  },
  {
    brand: "BMW",
    models: [
      { modelName: "3 Series", cardekhoUrl: "https://www.cardekho.com/cars/BMW/3_Series" },
      { modelName: "5 Series", cardekhoUrl: "https://www.cardekho.com/cars/BMW/5_Series" },
      { modelName: "7 Series", cardekhoUrl: "https://www.cardekho.com/cars/BMW/7_Series" },
      { modelName: "X1", cardekhoUrl: "https://www.cardekho.com/cars/BMW/X1" },
      { modelName: "X3", cardekhoUrl: "https://www.cardekho.com/cars/BMW/X3" },
      { modelName: "X5", cardekhoUrl: "https://www.cardekho.com/cars/BMW/X5" },
      { modelName: "X7", cardekhoUrl: "https://www.cardekho.com/cars/BMW/X7" },
    ],
  },
  {
    brand: "Mercedes-Benz",
    models: [
      { modelName: "A-Class Limousine", cardekhoUrl: "https://www.cardekho.com/cars/Mercedes-Benz/A-Class_Limousine" },
      { modelName: "C-Class", cardekhoUrl: "https://www.cardekho.com/cars/Mercedes-Benz/C-Class" },
      { modelName: "E-Class", cardekhoUrl: "https://www.cardekho.com/cars/Mercedes-Benz/E-Class" },
      { modelName: "S-Class", cardekhoUrl: "https://www.cardekho.com/cars/Mercedes-Benz/S-Class" },
      { modelName: "GLA", cardekhoUrl: "https://www.cardekho.com/cars/Mercedes-Benz/GLA" },
      { modelName: "GLC", cardekhoUrl: "https://www.cardekho.com/cars/Mercedes-Benz/GLC" },
      { modelName: "GLE", cardekhoUrl: "https://www.cardekho.com/cars/Mercedes-Benz/GLE" },
    ],
  },
  {
    brand: "Audi",
    models: [
      { modelName: "A4", cardekhoUrl: "https://www.cardekho.com/cars/Audi/A4" },
      { modelName: "A6", cardekhoUrl: "https://www.cardekho.com/cars/Audi/A6" },
      { modelName: "Q3", cardekhoUrl: "https://www.cardekho.com/cars/Audi/Q3" },
      { modelName: "Q5", cardekhoUrl: "https://www.cardekho.com/cars/Audi/Q5" },
      { modelName: "Q7", cardekhoUrl: "https://www.cardekho.com/cars/Audi/Q7" },
    ],
  },
  {
    brand: "Volvo",
    models: [
      { modelName: "XC40", cardekhoUrl: "https://www.cardekho.com/cars/Volvo/XC40" },
      { modelName: "XC60", cardekhoUrl: "https://www.cardekho.com/cars/Volvo/XC60" },
      { modelName: "XC90", cardekhoUrl: "https://www.cardekho.com/cars/Volvo/XC90" },
      { modelName: "C40 Recharge", cardekhoUrl: "https://www.cardekho.com/cars/Volvo/C40_Recharge" },
    ],
  },
  {
    brand: "Lexus",
    models: [
      { modelName: "ES", cardekhoUrl: "https://www.cardekho.com/cars/Lexus/ES" },
      { modelName: "NX", cardekhoUrl: "https://www.cardekho.com/cars/Lexus/NX" },
      { modelName: "RX", cardekhoUrl: "https://www.cardekho.com/cars/Lexus/RX" },
      { modelName: "LX", cardekhoUrl: "https://www.cardekho.com/cars/Lexus/LX" },
    ],
  },
  {
    brand: "Land Rover",
    models: [
      { modelName: "Defender", cardekhoUrl: "https://www.cardekho.com/cars/Land_Rover/Defender" },
      { modelName: "Discovery", cardekhoUrl: "https://www.cardekho.com/cars/Land_Rover/Discovery" },
      { modelName: "Discovery Sport", cardekhoUrl: "https://www.cardekho.com/cars/Land_Rover/Discovery_Sport" },
      { modelName: "Range Rover", cardekhoUrl: "https://www.cardekho.com/cars/Land_Rover/Range_Rover" },
      { modelName: "Range Rover Evoque", cardekhoUrl: "https://www.cardekho.com/cars/Land_Rover/Range_Rover_Evoque" },
      { modelName: "Range Rover Sport", cardekhoUrl: "https://www.cardekho.com/cars/Land_Rover/Range_Rover_Sport" },
      { modelName: "Range Rover Velar", cardekhoUrl: "https://www.cardekho.com/cars/Land_Rover/Range_Rover_Velar" },
    ],
  },
  {
    brand: "Jaguar",
    models: [
      { modelName: "F-Pace", cardekhoUrl: "https://www.cardekho.com/cars/Jaguar/F-Pace" },
      { modelName: "XF", cardekhoUrl: "https://www.cardekho.com/cars/Jaguar/XF" },
      { modelName: "I-Pace", cardekhoUrl: "https://www.cardekho.com/cars/Jaguar/I-Pace" },
    ],
  },
  {
    brand: "Porsche",
    models: [
      { modelName: "Macan", cardekhoUrl: "https://www.cardekho.com/cars/Porsche/Macan" },
      { modelName: "Cayenne", cardekhoUrl: "https://www.cardekho.com/cars/Porsche/Cayenne" },
      { modelName: "Panamera", cardekhoUrl: "https://www.cardekho.com/cars/Porsche/Panamera" },
      { modelName: "911", cardekhoUrl: "https://www.cardekho.com/cars/Porsche/911" },
      { modelName: "Taycan", cardekhoUrl: "https://www.cardekho.com/cars/Porsche/Taycan" },
    ],
  },
  {
    brand: "Mini",
    models: [
      { modelName: "Cooper", cardekhoUrl: "https://www.cardekho.com/cars/Mini/Cooper" },
      { modelName: "Countryman", cardekhoUrl: "https://www.cardekho.com/cars/Mini/Countryman" },
    ],
  },
  {
    brand: "Force Motors",
    models: [
      { modelName: "Gurkha", cardekhoUrl: "https://www.cardekho.com/cars/Force/Gurkha" },
    ],
  },
  {
    brand: "Isuzu",
    models: [
      { modelName: "D-Max V-Cross", cardekhoUrl: "https://www.cardekho.com/cars/Isuzu/D-Max_V-Cross" },
      { modelName: "MU-X", cardekhoUrl: "https://www.cardekho.com/cars/Isuzu/MU-X" },
    ],
  },
];

export const getBrandList = () => BRAND_CATALOG.map((b) => b.brand);
export const getModelsForBrand = (brand: string) =>
  BRAND_CATALOG.find((b) => b.brand === brand)?.models ?? [];
