import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WaPdfAutomationRule {
  id: string;
  vertical: string;
  event_name: string;
  pdf_type: string;
  template_name: string | null;
  caption_template: string | null;
  is_active: boolean;
  delay_minutes: number;
  cooldown_hours: number;
  max_sends_per_record: number;
  description: string | null;
  total_sent: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaPdfDeliveryLog {
  id: string;
  rule_id: string | null;
  vertical: string;
  event_name: string;
  pdf_type: string;
  record_id: string | null;
  phone: string;
  customer_name: string | null;
  pdf_url: string | null;
  caption: string | null;
  status: string;
  error_message: string | null;
  message_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export function useWaPdfRules() {
  return useQuery({
    queryKey: ["wa-pdf-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_pdf_automation_rules")
        .select("*")
        .order("vertical")
        .order("event_name");
      if (error) throw error;
      return data as WaPdfAutomationRule[];
    },
  });
}

export function useUpsertWaPdfRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Partial<WaPdfAutomationRule> & { id?: string }) => {
      if (rule.id) {
        const { id, ...updates } = rule;
        const { data, error } = await supabase
          .from("wa_pdf_automation_rules")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("wa_pdf_automation_rules")
        .insert(rule as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-pdf-rules"] }),
  });
}

export function useDeleteWaPdfRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("wa_pdf_automation_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-pdf-rules"] }),
  });
}

export function useWaPdfLogs(limit = 100) {
  return useQuery({
    queryKey: ["wa-pdf-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_pdf_delivery_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as WaPdfDeliveryLog[];
    },
    refetchInterval: 15_000,
  });
}
