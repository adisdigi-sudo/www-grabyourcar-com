import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeTemplateName, syncTemplateToMeta } from "@/lib/whatsappTemplateMirror";

export function useWhatsAppTemplates() {
  return useQuery({
    queryKey: ["wa-suite-templates"],
    queryFn: async () => {
      // Use wa_templates (Meta-synced single source of truth), only show approved
      const { data, error } = await supabase.from("wa_templates").select("*").eq("status", "approved").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWhatsAppTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: { name: string; category?: string; language?: string; body_text: string; header_type?: string; header_content?: string; footer_text?: string; buttons?: unknown[]; variables?: unknown[] }) => {
      const normalizedName = normalizeTemplateName(template.name);
      // Save directly to wa_templates (Meta source of truth)
      const { data, error } = await supabase.from("wa_templates").insert({
        name: normalizedName,
        display_name: template.name,
        category: template.category || 'marketing',
        language: template.language || 'en',
        body: template.body_text,
        header_type: template.header_type || null,
        header_content: template.header_content || null,
        footer: template.footer_text || null,
        buttons: (template.buttons as any) || [],
        variables: (template.variables as any) || [],
        status: 'draft',
      }).select().single();
      if (error) throw error;

      // Auto-submit to Meta
      const syncRes = await supabase.functions.invoke("meta-templates", {
        body: { action: "submit_template", template_id: data.id },
      });

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-suite-templates"] }),
  });
}

export function useDeleteWhatsAppTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("wa_templates").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-suite-templates"] }),
  });
}

export function useChatbotFlows() {
  return useQuery({
    queryKey: ["chatbot-flows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chatbot_flows").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateChatbotFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (flow: { name: string; description?: string; trigger_type?: string; trigger_value?: string; flow_data?: Record<string, unknown> }) => {
      const { data, error } = await supabase.from("chatbot_flows").insert({
        name: flow.name, description: flow.description, trigger_type: flow.trigger_type || 'keyword',
        trigger_value: flow.trigger_value, flow_data: flow.flow_data as any,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-flows"] }),
  });
}

export function useUpdateChatbotFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase.from("chatbot_flows").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-flows"] }),
  });
}

export function useDeleteChatbotFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("chatbot_flows").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatbot-flows"] }),
  });
}

export function useQuickReplies() {
  return useQuery({
    queryKey: ["quick-replies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quick_replies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reply: { shortcut: string; message: string; category?: string }) => {
      const { data, error } = await supabase.from("quick_replies").insert(reply).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quick-replies"] }),
  });
}

export function useDeleteQuickReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("quick_replies").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quick-replies"] }),
  });
}
