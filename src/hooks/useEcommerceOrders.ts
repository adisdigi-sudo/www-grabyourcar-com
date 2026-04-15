import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EcommerceOrder {
  id: string;
  order_number: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  items: any[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  shipping_address: any;
  tracking_number: string | null;
  courier_partner: string | null;
  risk_score: number;
  risk_level: string;
  risk_factors: string[];
  is_flagged: boolean;
  c2p_attempted: boolean;
  c2p_converted: boolean;
  ndr_status: string | null;
  ndr_attempts: number;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export function useEcommerceOrders(filters?: { flaggedOnly?: boolean; riskLevel?: string; status?: string }) {
  return useQuery({
    queryKey: ["ecommerce-orders", filters],
    queryFn: async () => {
      let query = supabase
        .from("ecommerce_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.flaggedOnly) query = query.eq("is_flagged", true);
      if (filters?.riskLevel && filters.riskLevel !== "all") query = query.eq("risk_level", filters.riskLevel);
      if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EcommerceOrder[];
    },
  });
}

export function useOrderStats() {
  return useQuery({
    queryKey: ["ecommerce-order-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ecommerce_orders").select("status, payment_method, risk_level, is_flagged, c2p_attempted, c2p_converted, total");
      if (error) throw error;

      const orders = data || [];
      const total = orders.length;
      const flagged = orders.filter((o: any) => o.is_flagged).length;
      const rtoOrders = orders.filter((o: any) => o.status === "rto").length;
      const c2pAttempted = orders.filter((o: any) => o.c2p_attempted).length;
      const c2pConverted = orders.filter((o: any) => o.c2p_converted).length;
      const riskBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      orders.forEach((o: any) => {
        if (o.risk_level && riskBreakdown[o.risk_level] !== undefined) riskBreakdown[o.risk_level]++;
      });

      return {
        total,
        flagged,
        rtoOrders,
        c2pRate: c2pAttempted > 0 ? Math.round((c2pConverted / c2pAttempted) * 100) : 0,
        riskBreakdown,
      };
    },
  });
}

export function useUpdateEcommerceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: Record<string, any> }) => {
      const { data, error } = await supabase
        .from("ecommerce_orders")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-orders"] });
      queryClient.invalidateQueries({ queryKey: ["ecommerce-order-stats"] });
    },
  });
}
