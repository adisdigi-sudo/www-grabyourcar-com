// Compute on-road pricing for a car across 8 metro cities using road_tax_rules.
// Input: { carId } — computes for ALL variants.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METROS = [
  { city: 'Delhi',     state: 'Delhi',         state_code: 'DL' },
  { city: 'Mumbai',    state: 'Maharashtra',   state_code: 'MH' },
  { city: 'Bangalore', state: 'Karnataka',     state_code: 'KA' },
  { city: 'Chennai',   state: 'Tamil Nadu',    state_code: 'TN' },
  { city: 'Hyderabad', state: 'Telangana',     state_code: 'TG' },
  { city: 'Pune',      state: 'Maharashtra',   state_code: 'MH' },
  { city: 'Kolkata',   state: 'West Bengal',   state_code: 'WB' },
  { city: 'Ahmedabad', state: 'Gujarat',       state_code: 'GJ' },
];

type Rule = {
  id: string; state_code: string; state_name: string; city: string | null;
  ownership_type: string | null; fuel_type: string | null;
  price_min: number | null; price_max: number | null;
  tax_percentage: number | null; flat_charge: number | null;
  additional_cess: number | null; green_tax: number | null; luxury_surcharge: number | null;
  ev_exemption: boolean | null;
  registration_fee: number | null; hsrp_fee: number | null; hypothecation_fee: number | null;
  temp_reg_fee: number | null; handling_charges: number | null; fastag_fee: number | null;
  insurance_percentage: number | null;
  priority: number | null;
};

function pickRule(rules: Rule[], stateCode: string, city: string, fuel: string, exShowroom: number): Rule | null {
  const fuelLower = fuel.toLowerCase();
  const candidates = rules.filter((r) => {
    if (r.state_code !== stateCode) return false;
    if (r.fuel_type && r.fuel_type.toLowerCase() !== fuelLower && r.fuel_type !== 'all') return false;
    if (r.price_min != null && exShowroom < Number(r.price_min)) return false;
    if (r.price_max != null && exShowroom > Number(r.price_max)) return false;
    return true;
  });
  if (!candidates.length) return null;
  // Prefer city-specific, then highest priority, then most recent
  candidates.sort((a, b) => {
    const aCity = a.city?.toLowerCase() === city.toLowerCase() ? 1 : 0;
    const bCity = b.city?.toLowerCase() === city.toLowerCase() ? 1 : 0;
    if (aCity !== bCity) return bCity - aCity;
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
  return candidates[0];
}

function computeBreakdown(exShowroom: number, fuel: string, rule: Rule | null) {
  // Sensible fallbacks if no rule found
  const taxPct = rule?.tax_percentage ? Number(rule.tax_percentage) : (fuel.toLowerCase() === 'electric' ? 0 : 10);
  const flat = rule?.flat_charge ? Number(rule.flat_charge) : 0;
  const cess = rule?.additional_cess ? Number(rule.additional_cess) : 0;
  const green = rule?.green_tax ? Number(rule.green_tax) : 0;
  const luxury = rule?.luxury_surcharge ? Number(rule.luxury_surcharge) : 0;
  const evExempt = rule?.ev_exemption && fuel.toLowerCase() === 'electric';

  const rto = evExempt ? 0 : Math.round(exShowroom * (taxPct / 100) + flat + (exShowroom * cess / 100) + green + (exShowroom * luxury / 100));
  const insPct = rule?.insurance_percentage ? Number(rule.insurance_percentage) : 3.5;
  const insurance = Math.round(exShowroom * (insPct / 100));
  const registration = rule?.registration_fee ? Number(rule.registration_fee) : 600;
  const hsrp = rule?.hsrp_fee ? Number(rule.hsrp_fee) : 400;
  const hypo = rule?.hypothecation_fee ? Number(rule.hypothecation_fee) : 1500;
  const tempReg = rule?.temp_reg_fee ? Number(rule.temp_reg_fee) : 200;
  const handling = rule?.handling_charges ? Number(rule.handling_charges) : 15000;
  const fastag = rule?.fastag_fee ? Number(rule.fastag_fee) : 500;
  const tcs = exShowroom > 1000000 ? Math.round(exShowroom * 0.01) : 0; // 1% TCS above 10L

  const otherCharges = registration + hsrp + hypo + tempReg + fastag;
  const onRoad = exShowroom + rto + insurance + tcs + handling + otherCharges;

  return { rto, insurance, tcs, fastag, registration, handling, other_charges: otherCharges, on_road_price: onRoad };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { carId } = await req.json();
    if (!carId) {
      return new Response(JSON.stringify({ success: false, error: 'carId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: variants, error: ve } = await supabase
      .from('car_variants')
      .select('id, name, ex_showroom, price_numeric, fuel_type')
      .eq('car_id', carId);
    if (ve) throw ve;
    if (!variants?.length) {
      return new Response(JSON.stringify({ success: false, error: 'No variants for this car' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const stateCodes = METROS.map((m) => m.state_code);
    const { data: rules, error: re } = await supabase
      .from('road_tax_rules')
      .select('*')
      .in('state_code', stateCodes)
      .eq('is_active', true);
    if (re) throw re;

    // Wipe existing pricing for this car
    await supabase.from('car_city_pricing').delete().eq('car_id', carId);

    const inserts: Record<string, unknown>[] = [];
    let computed = 0;
    let skipped = 0;

    for (const v of variants) {
      const ex = (v.ex_showroom ?? v.price_numeric) as number | null;
      if (!ex || ex <= 0) { skipped++; continue; }
      const fuel = v.fuel_type ?? 'Petrol';

      for (const m of METROS) {
        const rule = pickRule((rules ?? []) as Rule[], m.state_code, m.city, fuel, ex);
        const b = computeBreakdown(ex, fuel, rule);
        inserts.push({
          car_id: carId,
          variant_id: v.id,
          state: m.state,
          city: m.city,
          ex_showroom: ex,
          rto: b.rto,
          insurance: b.insurance,
          tcs: b.tcs,
          fastag: b.fastag,
          registration: b.registration,
          handling: b.handling,
          other_charges: b.other_charges,
          on_road_price: b.on_road_price,
          is_active: true,
          effective_from: new Date().toISOString().slice(0, 10),
        });
        computed++;
      }
    }

    if (inserts.length) {
      // Insert in chunks of 100
      for (let i = 0; i < inserts.length; i += 100) {
        const chunk = inserts.slice(i, i + 100);
        const { error: ie } = await supabase.from('car_city_pricing').insert(chunk);
        if (ie) throw ie;
      }
    }

    return new Response(JSON.stringify({
      success: true, carId, variantsProcessed: variants.length, citiesPerVariant: METROS.length,
      rowsInserted: computed, skipped,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown';
    console.error('compute-city-pricing failed:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
