import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PartnerLink {
  id: string;
  partner_name: string;
  vertical: string;
  partner_url: string;
  is_active: boolean;
  last_health_check: string | null;
  health_status: string;
  expires_at: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePartnerLink(vertical: string, partnerName?: string) {
  return useQuery({
    queryKey: ["partner-link", vertical, partnerName],
    queryFn: async () => {
      let q = supabase
        .from("partner_links" as any)
        .select("*")
        .eq("vertical", vertical)
        .eq("is_active", true);
      if (partnerName) q = q.eq("partner_name", partnerName);
      const { data, error } = await q.limit(1).single();
      if (error) throw error;
      return data as unknown as PartnerLink;
    },
    retry: 1,
  });
}

export function usePartnerLinks() {
  return useQuery({
    queryKey: ["partner-links-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_links" as any)
        .select("*")
        .order("vertical")
        .order("partner_name");
      if (error) throw error;
      return (data || []) as unknown as PartnerLink[];
    },
  });
}

export function useUpdatePartnerLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, partner_url, notes }: { id: string; partner_url: string; notes?: string }) => {
      const { error } = await supabase
        .from("partner_links" as any)
        .update({
          partner_url,
          notes: notes || null,
          health_status: "unknown",
          last_health_check: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-link"] });
      qc.invalidateQueries({ queryKey: ["partner-links-all"] });
      toast.success("Partner link updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCheckPartnerLinkHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: PartnerLink) => {
      // We can't directly fetch external URLs from browser due to CORS
      // So we just try opening and mark it as "checked"
      const now = new Date().toISOString();
      await supabase
        .from("partner_links" as any)
        .update({
          last_health_check: now,
          health_status: "checked",
          updated_at: now,
        } as any)
        .eq("id", link.id);
      return link.partner_url;
    },
    onSuccess: (url) => {
      qc.invalidateQueries({ queryKey: ["partner-link"] });
      qc.invalidateQueries({ queryKey: ["partner-links-all"] });
      window.open(url, "_blank");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
