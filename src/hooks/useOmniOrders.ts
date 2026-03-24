import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Order {
  id: string;
  contact_id: string | null;
  order_number: string;
  status: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  currency: string;
  shipping_address: any;
  items: any[];
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
  created_at: string;
  contacts?: { name: string; phone: string | null; email: string | null };
}

export function useOmniOrders(filters?: { flaggedOnly?: boolean; riskLevel?: string; status?: string }) {
  return useQuery({
    queryKey: ["omni-orders", filters],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, contacts(name, phone, email)")
        .order("created_at", { ascending: false });

      if (filters?.flaggedOnly) query = query.eq("is_flagged", true);
      if (filters?.riskLevel && filters.riskLevel !== "all") query = query.eq("risk_level", filters.riskLevel as any);
      if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status as any);

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
  });
}

export function useOmniOrderStats() {
  return useQuery({
    queryKey: ["omni-order-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("status, payment_method, risk_level, is_flagged, c2p_attempted, c2p_converted, total");
      if (error) throw error;

      const total = data.length;
      const codOrders = data.filter(o => o.payment_method === 'cod').length;
      const flagged = data.filter(o => o.is_flagged).length;
      const rtoOrders = data.filter(o => o.status === 'rto').length;
      const c2pAttempted = data.filter(o => o.c2p_attempted).length;
      const c2pConverted = data.filter(o => o.c2p_converted).length;
      const totalRevenue = data.reduce((sum, o) => sum + Number(o.total), 0);
      const riskBreakdown = { low: 0, medium: 0, high: 0, critical: 0 };
      data.forEach(o => { if (o.risk_level) riskBreakdown[o.risk_level as keyof typeof riskBreakdown]++; });

      return { total, codOrders, flagged, rtoOrders, c2pAttempted, c2pConverted, totalRevenue, riskBreakdown, c2pRate: c2pAttempted > 0 ? Math.round((c2pConverted / c2pAttempted) * 100) : 0 };
    },
  });
}

export function useUpdateOmniOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: Record<string, any> }) => {
      const { data, error } = await supabase.from("orders").update(updates).eq("id", orderId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omni-orders"] });
      queryClient.invalidateQueries({ queryKey: ["omni-order-stats"] });
    },
  });
}
