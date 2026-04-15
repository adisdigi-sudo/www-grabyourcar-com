import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BulkRenewalQuote {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_number: string;
  vehicle_year: number;
  fuel_type: string;
  insurance_company: string;
  policy_type: string;
  idv: number;
  basic_od: number;
  od_discount: number;
  ncb_discount: number;
  third_party: number;
  secure_premium: number;
  addon_premium: number;
  addons: string[];
  status: string;
  pdf_generated: boolean;
  pdf_generated_at: string | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  notes: string | null;
  batch_label: string | null;
  created_at: string;
  updated_at: string;
}

export type BulkQuoteInsert = Omit<BulkRenewalQuote, "id" | "created_at" | "updated_at" | "pdf_generated" | "pdf_generated_at" | "whatsapp_sent" | "whatsapp_sent_at"> & {
  id?: string;
};

const QUERY_KEY = ["bulk-renewal-quotes"];

export function useBulkRenewalQuotes(statusFilter?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("bulk_renewal_quotes")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as BulkRenewalQuote[];
    },
  });
}

export function useAddBulkQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quote: BulkQuoteInsert) => {
      const { data, error } = await supabase
        .from("bulk_renewal_quotes")
        .insert(quote as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Quote added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddBulkQuotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quotes: BulkQuoteInsert[]) => {
      const { data, error } = await supabase
        .from("bulk_renewal_quotes")
        .insert(quotes as any[])
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(`${data?.length || 0} quotes imported`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBulkQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BulkRenewalQuote> & { id: string }) => {
      const { error } = await supabase
        .from("bulk_renewal_quotes")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteBulkQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bulk_renewal_quotes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Quote deleted");
    },
  });
}
