import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWACampaigns() {
  return useQuery({
    queryKey: ["wa-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWACampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: { name: string; type: string; message_template: string; channel?: string }) => {
      const { data, error } = await supabase.from("campaigns").insert({ ...campaign, channel: campaign.channel || "whatsapp" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-campaigns"] }),
  });
}

export function useUpdateWACampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; [key: string]: unknown }) => {
      const { data, error } = await supabase.from("campaigns").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-campaigns"] }),
  });
}
