// State-wise RTO and tax rates for on-road pricing
export interface StateRates {
  name: string;
  code: string;
  rtoPercent: number; // RTO charges as % of ex-showroom
  roadTaxPercent: number; // Road tax as % of ex-showroom
  insuranceMultiplier: number; // Insurance varies slightly by state
  registrationFee: number; // Fixed registration fee
  hypothecationFee: number; // If financed
  tempRegFee: number; // Temporary registration fee
  greenTax: number; // Green/environment tax
}

export const stateRates: StateRates[] = [
  {
    name: "Delhi",
    code: "DL",
    rtoPercent: 4.0,
    roadTaxPercent: 4.0,
    insuranceMultiplier: 1.0,
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "Maharashtra",
    code: "MH",
    rtoPercent: 7.0,
    roadTaxPercent: 11.0,
    insuranceMultiplier: 1.05,
    registrationFee: 1000,
    hypothecationFee: 1500,
    tempRegFee: 300,
    greenTax: 0,
  },
  {
    name: "Karnataka",
    code: "KA",
    rtoPercent: 8.0,
    roadTaxPercent: 13.0,
    insuranceMultiplier: 1.02,
    registrationFee: 800,
    hypothecationFee: 1500,
    tempRegFee: 250,
    greenTax: 200,
  },
  {
    name: "Tamil Nadu",
    code: "TN",
    rtoPercent: 6.0,
    roadTaxPercent: 10.0,
    insuranceMultiplier: 1.0,
    registrationFee: 700,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "Gujarat",
    code: "GJ",
    rtoPercent: 4.5,
    roadTaxPercent: 6.0,
    insuranceMultiplier: 0.98,
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "Uttar Pradesh",
    code: "UP",
    rtoPercent: 5.0,
    roadTaxPercent: 8.0,
    insuranceMultiplier: 1.0,
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "Rajasthan",
    code: "RJ",
    rtoPercent: 4.0,
    roadTaxPercent: 6.0,
    insuranceMultiplier: 0.98,
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "West Bengal",
    code: "WB",
    rtoPercent: 6.0,
    roadTaxPercent: 9.0,
    insuranceMultiplier: 1.02,
    registrationFee: 700,
    hypothecationFee: 1500,
    tempRegFee: 250,
    greenTax: 100,
  },
  {
    name: "Madhya Pradesh",
    code: "MP",
    rtoPercent: 5.0,
    roadTaxPercent: 8.0,
    insuranceMultiplier: 1.0,
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "Telangana",
    code: "TS",
    rtoPercent: 7.0,
    roadTaxPercent: 12.0,
    insuranceMultiplier: 1.03,
    registrationFee: 800,
    hypothecationFee: 1500,
    tempRegFee: 250,
    greenTax: 0,
  },
  {
    name: "Andhra Pradesh",
    code: "AP",
    rtoPercent: 7.0,
    roadTaxPercent: 12.0,
    insuranceMultiplier: 1.02,
    registrationFee: 750,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "Kerala",
    code: "KL",
    rtoPercent: 6.0,
    roadTaxPercent: 9.0,
    insuranceMultiplier: 1.05,
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 300,
  },
  {
    name: "Punjab",
    code: "PB",
    rtoPercent: 4.5,
    roadTaxPercent: 7.0,
    insuranceMultiplier: 1.0,
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "Haryana",
    code: "HR",
    rtoPercent: 4.0,
    roadTaxPercent: 5.0,
    insuranceMultiplier: 0.98,
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "Bihar",
    code: "BR",
    rtoPercent: 5.0,
    roadTaxPercent: 7.0,
    insuranceMultiplier: 1.0,
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
  {
    name: "Odisha",
    code: "OD",
    rtoPercent: 5.0,
    roadTaxPercent: 8.0,
    insuranceMultiplier: 1.0,
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
  },
];

export interface StatePriceBreakup {
  exShowroom: number;
  rto: number;
  roadTax: number;
  insurance: number;
  tcs: number;
  fastag: number;
  registration: number;
  handling: number;
  hypothecation: number;
  tempRegistration: number;
  greenTax: number;
  onRoadPrice: number;
}

export const calculateStatePriceBreakup = (
  exShowroomPrice: number,
  stateCode: string = "DL"
): StatePriceBreakup => {
  const state = stateRates.find((s) => s.code === stateCode) || stateRates[0];

  const rto = Math.round(exShowroomPrice * (state.rtoPercent / 100));
  const roadTax = Math.round(exShowroomPrice * (state.roadTaxPercent / 100));
  const baseInsurance = Math.round(exShowroomPrice * 0.03); // 3% base insurance
  const insurance = Math.round(baseInsurance * state.insuranceMultiplier);
  const tcs = exShowroomPrice > 1000000 ? Math.round(exShowroomPrice * 0.01) : 0;
  const fastag = 500;
  const registration = state.registrationFee;
  const handling = 15000;
  const hypothecation = 0; // Only if financed
  const tempRegistration = state.tempRegFee;
  const greenTax = state.greenTax;

  const onRoadPrice =
    exShowroomPrice +
    rto +
    roadTax +
    insurance +
    tcs +
    fastag +
    registration +
    handling +
    hypothecation +
    tempRegistration +
    greenTax;

  return {
    exShowroom: exShowroomPrice,
    rto,
    roadTax,
    insurance,
    tcs,
    fastag,
    registration,
    handling,
    hypothecation,
    tempRegistration,
    greenTax,
    onRoadPrice,
  };
};

export const getStateByCode = (code: string): StateRates | undefined => {
  return stateRates.find((s) => s.code === code);
};
