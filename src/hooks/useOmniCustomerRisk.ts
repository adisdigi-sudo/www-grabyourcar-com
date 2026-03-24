import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerRiskProfile {
  id: string;
  contact_id: string;
  total_orders: number;
  delivered_orders: number;
  rto_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  cod_orders: number;
  prepaid_orders: number;
  total_spent: number;
  avg_order_value: number;
  rto_rate: number;
  cancel_rate: number;
  return_rate: number;
  risk_score: number;
  risk_level: string;
  cod_enabled: boolean;
  partial_payment_required: boolean;
  partial_payment_percent: number;
  ndr_count: number;
  last_order_at: string | null;
  risk_factors: string[];
  computed_at: string;
  contacts?: { name: string; phone: string | null; email: string | null };
}

export function useCustomerRiskProfiles(filters?: { riskLevel?: string }) {
  return useQuery({
    queryKey: ["customer-risk-profiles", filters],
    queryFn: async () => {
      let query = supabase
        .from("customer_risk_profiles")
        .select("*, contacts(name, phone, email)")
        .order("risk_score", { ascending: false });
      if (filters?.riskLevel && filters.riskLevel !== "all") query = query.eq("risk_level", filters.riskLevel);
      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerRiskProfile[];
    },
  });
}

export function useRiskStats() {
  return useQuery({
    queryKey: ["risk-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_risk_profiles")
        .select("risk_level, risk_score, cod_enabled, partial_payment_required, rto_rate, total_orders, rto_orders");
      if (error) throw error;
      const profiles = data || [];
      const total = profiles.length;
      const codBlocked = profiles.filter((p: any) => !p.cod_enabled).length;
      const partialRequired = profiles.filter((p: any) => p.partial_payment_required).length;
      const avgRtoRate = total > 0 ? profiles.reduce((s: number, p: any) => s + Number(p.rto_rate), 0) / total : 0;
      const riskBreakdown = { low: 0, medium: 0, high: 0, critical: 0 };
      profiles.forEach((p: any) => { if (p.risk_level && riskBreakdown.hasOwnProperty(p.risk_level)) riskBreakdown[p.risk_level as keyof typeof riskBreakdown]++; });
      return { total, codBlocked, partialRequired, avgRtoRate, riskBreakdown };
    },
  });
}

export function useComputeRiskScores() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ organizationId, contactId }: { organizationId: string; contactId?: string }) => {
      const { data, error } = await supabase.functions.invoke("compute-risk-score", { body: { organization_id: organizationId, contact_id: contactId } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-risk-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["risk-stats"] });
    },
  });
}

export function useCheckoutSettings() {
  return useQuery({
    queryKey: ["checkout-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("checkout_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCheckoutSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      const { data: existing } = await supabase.from("checkout_settings").select("id").maybeSingle();
      if (existing) {
        const { data, error } = await supabase.from("checkout_settings").update({ ...settings, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("checkout_settings").insert(settings).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["checkout-settings"] }),
  });
}
