import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface RoadTaxRule {
  id: string;
  state_code: string;
  state_name: string;
  city: string | null;
  ownership_type: string;
  fuel_type: string;
  price_min: number;
  price_max: number | null;
  tax_percentage: number;
  flat_charge: number;
  additional_cess: number;
  green_tax: number;
  luxury_surcharge: number;
  ev_exemption: boolean;
  registration_fee: number;
  hsrp_fee: number;
  hypothecation_fee: number;
  temp_reg_fee: number;
  handling_charges: number;
  fastag_fee: number;
  insurance_percentage: number;
  priority: number;
}

export interface OnRoadPriceBreakup {
  exShowroom: number;
  roadTax: number;
  roadTaxPercent: number;
  rto: number; // alias for roadTax
  insurance: number;
  tcs: number;
  fastag: number;
  registration: number;
  hsrp: number;
  hypothecation: number;
  tempRegistration: number;
  greenTax: number;
  handling: number;
  additionalCess: number;
  luxurySurcharge: number;
  agentFees: number; // ₹7,550 for cars above ₹10 Lakh
  onRoadPrice: number;
  stateName: string;
  ownershipType: string;
  fuelType: string;
  matchedRule: RoadTaxRule | null;
}

// Fetch all active rules (cached aggressively)
export const useRoadTaxRules = () => {
  return useQuery({
    queryKey: ["road-tax-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("road_tax_rules")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (error) throw error;
      return (data || []) as RoadTaxRule[];
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in memory for 1 hour
  });
};

// Fetch unique states from rules
export const useAvailableStates = () => {
  const { data: rules } = useRoadTaxRules();

  return useMemo(() => {
    if (!rules) return [];
    const stateMap = new Map<string, string>();
    rules.forEach((r) => stateMap.set(r.state_code, r.state_name));
    return Array.from(stateMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rules]);
};

// Core calculation engine
export const calculateOnRoadPrice = (
  rules: RoadTaxRule[],
  exShowroomPrice: number,
  stateCode: string,
  fuelType: string = "petrol",
  ownershipType: string = "individual",
  city?: string
): OnRoadPriceBreakup => {
  const normalizedFuel = fuelType.toLowerCase().replace("electric", "ev");
  const normalizedOwnership = ownershipType.toLowerCase();

  // Find matching rule: city override > state-level, highest priority first
  let matchedRule: RoadTaxRule | null = null;

  // Filter rules for this state
  const stateRules = rules.filter(
    (r) =>
      r.state_code === stateCode &&
      r.fuel_type === normalizedFuel &&
      r.ownership_type === normalizedOwnership &&
      r.price_min <= exShowroomPrice &&
      (r.price_max === null || r.price_max >= exShowroomPrice)
  );

  // Try city override first
  if (city) {
    matchedRule =
      stateRules.find(
        (r) => r.city && r.city.toLowerCase() === city.toLowerCase()
      ) || null;
  }

  // Fall back to state-level rule
  if (!matchedRule) {
    matchedRule = stateRules.find((r) => !r.city) || null;
  }

  // If no rule found for this fuel type, try petrol as fallback
  if (!matchedRule && normalizedFuel !== "petrol") {
    const fallbackRules = rules.filter(
      (r) =>
        r.state_code === stateCode &&
        r.fuel_type === "petrol" &&
        r.ownership_type === normalizedOwnership &&
        r.price_min <= exShowroomPrice &&
        (r.price_max === null || r.price_max >= exShowroomPrice) &&
        !r.city
    );
    matchedRule = fallbackRules[0] || null;
  }

  // Default fallback values
  const taxPercent = matchedRule?.tax_percentage ?? 7;
  const registrationFee = matchedRule?.registration_fee ?? 600;
  const hsrpFee = matchedRule?.hsrp_fee ?? 400;
  const hypothecationFee = matchedRule?.hypothecation_fee ?? 1500;
  const tempRegFee = matchedRule?.temp_reg_fee ?? 200;
  const handlingCharges = matchedRule?.handling_charges ?? 15000;
  const fastagFee = matchedRule?.fastag_fee ?? 500;
  const insurancePercent = matchedRule?.insurance_percentage ?? 3;
  const greenTax = matchedRule?.green_tax ?? 0;
  const additionalCess = matchedRule?.additional_cess ?? 0;
  const luxurySurcharge = matchedRule?.luxury_surcharge ?? 0;
  const flatCharge = matchedRule?.flat_charge ?? 0;

  // Calculate road tax: percentage-based + flat charge (some states like Puducherry use flat charges)
  const roadTax = Math.round(exShowroomPrice * (taxPercent / 100)) + flatCharge;
  const insurance = Math.round(exShowroomPrice * (insurancePercent / 100));
  const tcs = Math.round(exShowroomPrice * 0.01); // Always 1%

  // Agent/Processing fees: ₹7,550 for cars above ₹10 Lakh
  const agentFees = exShowroomPrice > 1000000 ? 7550 : 0;

  const onRoadPrice =
    exShowroomPrice +
    roadTax +
    insurance +
    tcs +
    fastagFee +
    registrationFee +
    hsrpFee +
    tempRegFee +
    handlingCharges +
    greenTax +
    additionalCess +
    luxurySurcharge +
    agentFees;

  const stateName = matchedRule?.state_name ?? stateCode;

  return {
    exShowroom: exShowroomPrice,
    roadTax,
    roadTaxPercent: taxPercent,
    rto: roadTax,
    insurance,
    tcs,
    fastag: fastagFee,
    registration: registrationFee,
    hsrp: hsrpFee,
    hypothecation: 0, // Only when financed
    tempRegistration: tempRegFee,
    greenTax,
    handling: handlingCharges,
    additionalCess,
    luxurySurcharge,
    agentFees,
    onRoadPrice,
    stateName,
    ownershipType: normalizedOwnership,
    fuelType: normalizedFuel,
    matchedRule,
  };
};

// Main hook: combines fetching + calculation
export const useOnRoadPrice = (
  exShowroomPrice: number,
  stateCode: string,
  fuelType: string = "petrol",
  ownershipType: string = "individual",
  city?: string
) => {
  const { data: rules, isLoading, error } = useRoadTaxRules();

  const breakup = useMemo(() => {
    if (!rules || rules.length === 0) return null;
    return calculateOnRoadPrice(
      rules,
      exShowroomPrice,
      stateCode,
      fuelType,
      ownershipType,
      city
    );
  }, [rules, exShowroomPrice, stateCode, fuelType, ownershipType, city]);

  return { breakup, isLoading, error, rules };
};
