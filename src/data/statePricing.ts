// State-wise RTO and road tax rates for on-road pricing
// Based on actual Indian state Parivahan / MoRTH slab data (2025-2026)

export interface StateRates {
  name: string;
  code: string;
  registrationFee: number;
  hypothecationFee: number;
  tempRegFee: number;
  greenTax: number;
  hsrpFee: number; // High Security Number Plate
  // Slab-based road tax: returns road tax % based on ex-showroom price & fuel type
  getRoadTaxPercent: (exShowroom: number, fuelType?: string) => number;
}

export const stateRates: StateRates[] = [
  // ─── DELHI ───
  {
    name: "Delhi",
    code: "DL",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 400,
    getRoadTaxPercent: (price, fuel) => {
      const isDiesel = fuel?.toLowerCase() === "diesel";
      if (price <= 600000) return isDiesel ? 5 : 4;
      if (price <= 1000000) return isDiesel ? 6.25 : 5;
      return isDiesel ? 8 : 7;
    },
  },
  // ─── MAHARASHTRA ───
  {
    name: "Maharashtra",
    code: "MH",
    registrationFee: 1000,
    hypothecationFee: 1500,
    tempRegFee: 300,
    greenTax: 0,
    hsrpFee: 400,
    getRoadTaxPercent: (_price, fuel) => {
      const f = fuel?.toLowerCase();
      if (f === "cng" || f === "lpg") return 7;
      if (f === "diesel") return 13;
      if (f === "electric" || f === "ev") return 0; // EV exempt in MH
      return 11; // Petrol default
    },
  },
  // ─── KARNATAKA ─── (slab-based)
  {
    name: "Karnataka",
    code: "KA",
    registrationFee: 800,
    hypothecationFee: 1500,
    tempRegFee: 250,
    greenTax: 200,
    hsrpFee: 400,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 500000) return 13;
      if (price <= 1000000) return 14;
      if (price <= 2000000) return 17;
      return 18;
    },
  },
  // ─── TAMIL NADU ───
  {
    name: "Tamil Nadu",
    code: "TN",
    registrationFee: 700,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1000000) return 10;
      return 13;
    },
  },
  // ─── GUJARAT ───
  {
    name: "Gujarat",
    code: "GJ",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 6;
    },
  },
  // ─── UTTAR PRADESH ───
  {
    name: "Uttar Pradesh",
    code: "UP",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 400,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1000000) return 8;
      return 10;
    },
  },
  // ─── RAJASTHAN ───
  {
    name: "Rajasthan",
    code: "RJ",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (_price, fuel) => {
      const f = fuel?.toLowerCase();
      if (f === "electric") return 0;
      if (f === "diesel") return 8;
      return 6; // Petrol/CNG
    },
  },
  // ─── WEST BENGAL ───
  {
    name: "West Bengal",
    code: "WB",
    registrationFee: 700,
    hypothecationFee: 1500,
    tempRegFee: 250,
    greenTax: 100,
    hsrpFee: 400,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 3;
      if (price <= 500000) return 6;
      if (price <= 1000000) return 7;
      if (price <= 2000000) return 9;
      return 10;
    },
  },
  // ─── MADHYA PRADESH ───
  {
    name: "Madhya Pradesh",
    code: "MP",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1000000) return 8;
      return 10;
    },
  },
  // ─── TELANGANA ───
  {
    name: "Telangana",
    code: "TS",
    registrationFee: 800,
    hypothecationFee: 1500,
    tempRegFee: 250,
    greenTax: 0,
    hsrpFee: 400,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1000000) return 12;
      return 14;
    },
  },
  // ─── ANDHRA PRADESH ───
  {
    name: "Andhra Pradesh",
    code: "AP",
    registrationFee: 750,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 400,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1000000) return 12;
      return 14;
    },
  },
  // ─── KERALA ───
  {
    name: "Kerala",
    code: "KL",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 300,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 500000) return 6;
      if (price <= 1000000) return 8;
      if (price <= 1500000) return 10;
      return 15; // Luxury
    },
  },
  // ─── PUNJAB ───
  {
    name: "Punjab",
    code: "PB",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 9; // 8% road tax + 1% social security contribution
    },
  },
  // ─── HARYANA ───
  {
    name: "Haryana",
    code: "HR",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 600000) return 5;
      if (price <= 2000000) return 6;
      return 8;
    },
  },
  // ─── BIHAR ───
  {
    name: "Bihar",
    code: "BR",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 800000) return 7;
      return 9;
    },
  },
  // ─── ODISHA ───
  {
    name: "Odisha",
    code: "OD",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 500000) return 6;
      if (price <= 1000000) return 7;
      return 8;
    },
  },
  // ─── CHANDIGARH ───
  {
    name: "Chandigarh",
    code: "CH",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 2000000) return 6;
      return 8;
    },
  },
  // ─── JHARKHAND ───
  {
    name: "Jharkhand",
    code: "JH",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1500000) return 6;
      return 8;
    },
  },
  // ─── UTTARAKHAND ───
  {
    name: "Uttarakhand",
    code: "UK",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 500000) return 8;
      return 10;
    },
  },
  // ─── HIMACHAL PRADESH ─── (Lowest in India)
  {
    name: "Himachal Pradesh",
    code: "HP",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 300,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 3; // ~2.5-3% (among lowest)
    },
  },
  // ─── ASSAM ───
  {
    name: "Assam",
    code: "AS",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1500000) return 4;
      if (price <= 2000000) return 5;
      return 7;
    },
  },
  // ─── GOA ───
  {
    name: "Goa",
    code: "GA",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 600000) return 9;
      return 11;
    },
  },
  // ─── CHHATTISGARH ───
  {
    name: "Chhattisgarh",
    code: "CG",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1000000) return 7;
      return 9;
    },
  },
  // ─── ARUNACHAL PRADESH ───
  {
    name: "Arunachal Pradesh",
    code: "AR",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 300,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 500000) return 2.7;
      if (price <= 1000000) return 3;
      if (price <= 1500000) return 3.5;
      if (price <= 1800000) return 4;
      if (price <= 2000000) return 4.5;
      return 6.5;
    },
  },
  // ─── PUDUCHERRY ───
  {
    name: "Puducherry",
    code: "PY",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 500000) return 3;
      return 4;
    },
  },
  // ─── DAMAN & DIU ───
  {
    name: "Daman & Diu",
    code: "DD",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 300,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1000000) return 2.5;
      return 3;
    },
  },
  // ─── JAMMU & KASHMIR ───
  {
    name: "Jammu & Kashmir",
    code: "JK",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      if (price <= 1000000) return 6;
      return 8;
    },
  },
  // ─── MEGHALAYA ───
  {
    name: "Meghalaya",
    code: "ML",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 300,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 5;
    },
  },
  // ─── MIZORAM ───
  {
    name: "Mizoram",
    code: "MZ",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 300,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 4;
    },
  },
  // ─── MANIPUR ───
  {
    name: "Manipur",
    code: "MN",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 300,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 5;
    },
  },
  // ─── NAGALAND ───
  {
    name: "Nagaland",
    code: "NL",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 300,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 5;
    },
  },
  // ─── TRIPURA ───
  {
    name: "Tripura",
    code: "TR",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 300,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 5;
    },
  },
  // ─── SIKKIM ───
  {
    name: "Sikkim",
    code: "SK",
    registrationFee: 500,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 300,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 4;
    },
  },
  // ─── LADAKH ───
  {
    name: "Ladakh",
    code: "LA",
    registrationFee: 600,
    hypothecationFee: 1500,
    tempRegFee: 200,
    greenTax: 0,
    hsrpFee: 350,
    getRoadTaxPercent: (_price, fuel) => {
      if (fuel?.toLowerCase() === "electric") return 0;
      return 5;
    },
  },
];

export interface StatePriceBreakup {
  exShowroom: number;
  rto: number;       // Road tax (slab-based) + agent fees included
  roadTax: number;   // Same as rto (alias for backward compat)
  insurance: number;
  tcs: number;       // 1% of ex-showroom (always)
  fastag: number;
  registration: number;
  handling: number;
  hypothecation: number;
  tempRegistration: number;
  greenTax: number;
  hsrp: number;
  onRoadPrice: number;
  roadTaxPercent: number; // The actual % applied
  stateName: string;
}

export const calculateStatePriceBreakup = (
  exShowroomPrice: number,
  stateCode: string = "DL",
  fuelType?: string
): StatePriceBreakup => {
  const state = stateRates.find((s) => s.code === stateCode) || stateRates[0];

  // Slab-based road tax calculation per state rules
  const roadTaxPercent = state.getRoadTaxPercent(exShowroomPrice, fuelType);
  const rtoBase = Math.round(exShowroomPrice * (roadTaxPercent / 100));
  // Agent/Processing fees: ₹7,550 silently included in RTO for cars above ₹10 Lakh
  const agentFees = exShowroomPrice > 1000000 ? 7550 : 0;
  const rto = rtoBase + agentFees;
  const roadTax = rto; // Alias

  // Insurance: ~3% base with slight state variation
  const insurance = Math.round(exShowroomPrice * 0.03);

  // TCS: 1% of ex-showroom price (always applied as per user requirement)
  const tcs = Math.round(exShowroomPrice * 0.01);

  const fastag = 500;
  const registration = state.registrationFee;
  const handling = 15000;
  const hypothecation = 0; // Only if financed
  const tempRegistration = state.tempRegFee;
  const greenTax = state.greenTax;
  const hsrp = state.hsrpFee;

  const onRoadPrice =
    exShowroomPrice +
    rto +
    insurance +
    tcs +
    fastag +
    registration +
    handling +
    hypothecation +
    tempRegistration +
    greenTax +
    hsrp;

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
    hsrp,
    onRoadPrice,
    roadTaxPercent,
    stateName: state.name,
  };
};

export const getStateByCode = (code: string): StateRates | undefined => {
  return stateRates.find((s) => s.code === code);
};
