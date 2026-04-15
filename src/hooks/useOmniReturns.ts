import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useReturnRequests(statusFilter?: string) {
  return useQuery({
    queryKey: ["omni-return-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("return_requests")
        .select("*, orders(order_number, total, payment_method), contacts(name, email, phone)")
        .order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateReturnRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; resolution?: string; qc_status?: string; refund_amount?: number; rejected_reason?: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from("return_requests")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["omni-return-requests"] }),
  });
}

export function useReturnRules() {
  return useQuery({
    queryKey: ["omni-return-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("return_rules").select("*").order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReturnRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: { name: string; return_window_days: number; require_media?: boolean; auto_approve?: boolean; exchange_allowed?: boolean; refund_allowed?: boolean }) => {
      const { data, error } = await supabase.from("return_rules").insert(rule).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["omni-return-rules"] }),
  });
}
