import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RentalAgreement {
  id: string;
  booking_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  vehicle_name: string | null;
  vehicle_number: string | null;
  pickup_date: string | null;
  dropoff_date: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  rental_amount: number;
  security_deposit: number;
  terms_html: string;
  agreement_number: string | null;
  status: string;
  share_token: string | null;
  shared_via_whatsapp: boolean;
  shared_at: string | null;
  client_viewed_at: string | null;
  client_signed_at: string | null;
  client_signature_type: string | null;
  client_signature_data: string | null;
  client_signed_name: string | null;
  client_ip_address: string | null;
  client_user_agent: string | null;
  admin_signed_at: string | null;
  admin_signed_by: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalKYCDocument {
  id: string;
  agreement_id: string | null;
  customer_phone: string;
  customer_name: string | null;
  document_type: string;
  document_number: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  extracted_data: Record<string, unknown>;
  verification_status: string;
  verified_via: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  surepass_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AgreementHistory {
  id: string;
  agreement_id: string;
  action: string;
  action_by: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export const useRentalAgreements = () => {
  return useQuery({
    queryKey: ["rental-agreements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_agreements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RentalAgreement[];
    },
  });
};

export const useAgreementByToken = (token: string | null) => {
  return useQuery({
    queryKey: ["agreement-by-token", token],
    queryFn: async () => {
      if (!token) throw new Error("No token");
      const { data, error } = await supabase
        .from("rental_agreements")
        .select("*")
        .eq("share_token", token)
        .single();
      if (error) throw error;
      return data as RentalAgreement;
    },
    enabled: !!token,
  });
};

export const useAgreementHistory = (agreementId: string | null) => {
  return useQuery({
    queryKey: ["agreement-history", agreementId],
    queryFn: async () => {
      if (!agreementId) return [];
      const { data, error } = await supabase
        .from("rental_agreement_history")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AgreementHistory[];
    },
    enabled: !!agreementId,
  });
};

export const useKYCDocuments = (agreementId?: string | null, phone?: string | null) => {
  return useQuery({
    queryKey: ["rental-kyc", agreementId, phone],
    queryFn: async () => {
      let q = supabase.from("rental_kyc_documents").select("*");
      if (agreementId) q = q.eq("agreement_id", agreementId);
      if (phone) q = q.eq("customer_phone", phone);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data as RentalKYCDocument[];
    },
    enabled: !!(agreementId || phone),
  });
};

export const useCreateAgreement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<RentalAgreement>) => {
      const { data, error } = await supabase
        .from("rental_agreements")
        .insert([input as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rental-agreements"] }),
  });
};

export const useUpdateAgreement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RentalAgreement> }) => {
      const { error } = await supabase
        .from("rental_agreements")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rental-agreements"] }),
  });
};

export const useAddAgreementHistory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { agreement_id: string; action: string; action_by?: string; details?: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("rental_agreement_history")
        .insert([entry as any]);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["agreement-history", vars.agreement_id] }),
  });
};

export const useUpdateKYC = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RentalKYCDocument> }) => {
      const { error } = await supabase
        .from("rental_kyc_documents")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rental-kyc"] }),
  });
};
