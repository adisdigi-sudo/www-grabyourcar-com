import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEmailLists() {
  return useQuery({ queryKey: ["email-lists"], queryFn: async () => { const { data, error } = await supabase.from("email_lists").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });
}

export function useCreateEmailList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (list: { name: string; description?: string }) => { const { data, error } = await supabase.from("email_lists").insert(list).select().single(); if (error) throw error; return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-lists"] }),
  });
}

export function useEmailSubscribers(listId?: string) {
  return useQuery({
    queryKey: ["email-subscribers", listId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("email_subscribers").select("*").eq("list_id", listId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });
}

export function useAddSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sub: { list_id: string; email: string; name?: string }) => { const { data, error } = await supabase.from("email_subscribers").insert(sub).select().single(); if (error) throw error; return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-subscribers"] }),
  });
}

export function useEmailTemplates() {
  return useQuery({ queryKey: ["email-templates"], queryFn: async () => { const { data, error } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: { name: string; subject?: string; html_content?: string; category?: string; is_ai_generated?: boolean }) => {
      const { data, error } = await supabase.from("email_templates").insert({
        name: template.name,
        subject: template.subject || '',
        html_content: template.html_content,
        category: template.category || 'custom',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("email_templates").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => { const { data, error } = await supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
}

export function useCreateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: { name: string; subject: string; from_name?: string; from_email?: string; template_id?: string; html_content?: string }) => {
      const { data, error } = await supabase.from("email_campaigns").insert({
        name: campaign.name,
        subject: campaign.subject,
        template_id: campaign.template_id,
        html_content: campaign.html_content,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-campaigns"] }),
  });
}

export function useUpdateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => { const { data, error } = await supabase.from("email_campaigns").update(updates).eq("id", id).select().single(); if (error) throw error; return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-campaigns"] }),
  });
}
