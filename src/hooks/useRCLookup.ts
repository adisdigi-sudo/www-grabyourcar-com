import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RCData {
  registration_number: string;
  owner_name: string;
  father_name: string | null;
  mobile_number: string | null;
  present_address: string | null;
  vehicle_class: string;
  fuel_type: string;
  maker_model: string;
  maker: string | null;
  registration_date: string | null;
  insurance_expiry: string | null;
  insurance_company: string | null;
  insurance_policy_number: string | null;
  puc_expiry: string | null;
  fitness_expiry: string | null;
  rto: string;
  chassis_number: string;
  engine_number: string;
  vehicle_age_years: number | null;
  hypothecation: string | null;
  vehicle_color: string | null;
  vehicle_category: string | null;
  norms_type: string | null;
  source: "surepass" | "mock";
  triggers: {
    insurance_renewal: boolean;
    insurance_days_left: number | null;
    loan_refinance: boolean;
    puc_renewal: boolean;
    fitness_renewal: boolean;
  };
}

interface UseRCLookupOptions {
  onSuccess?: (data: RCData) => void;
  onError?: (error: string) => void;
  showToast?: boolean;
}

export function useRCLookup(options: UseRCLookupOptions = {}) {
  const { onSuccess, onError, showToast = true } = options;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RCData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (vehicleNumber: string) => {
    const cleaned = vehicleNumber.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z]{2,3}\d{0,2}[A-Z]{0,3}\d{3,4}$/.test(cleaned) || cleaned.length < 5) {
      const msg = "Enter a valid vehicle number (e.g., DL01AB1234)";
      setError(msg);
      onError?.(msg);
      return null;
    }

    setError(null);
    setLoading(true);
    setData(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("vehicle-lookup", {
        body: { vehicle_number: cleaned },
      });

      if (fnError) throw fnError;
      if (result?.error) {
        setError(result.error);
        onError?.(result.error);
        return null;
      }

      setData(result);
      onSuccess?.(result);
      if (showToast && result.source === "surepass") {
        toast.success("Vehicle details fetched from RC database");
      }
      return result as RCData;
    } catch (e: any) {
      const msg = e.message || "RC lookup failed";
      setError(msg);
      onError?.(msg);
      if (showToast) toast.error("Vehicle lookup failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError, showToast]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { lookup, loading, data, error, reset };
}
