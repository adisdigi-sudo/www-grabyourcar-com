import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function invokeFinance(action: string, payload: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("finance-engine", {
    body: { action, ...payload },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "Unknown error");
  return data;
}

export function useFinancialDashboard(vertical_name?: string, month_year?: string) {
  return useQuery({
    queryKey: ["financial-dashboard", vertical_name, month_year],
    queryFn: () => invokeFinance("get_financial_dashboard", { vertical_name, month_year }),
    enabled: true,
  });
}

export function useDealAging(vertical_name?: string) {
  return useQuery({
    queryKey: ["deal-aging", vertical_name],
    queryFn: () => invokeFinance("get_deal_aging", { vertical_name }),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      customer_id: string;
      vertical_name: string;
      deal_value: number;
      assigned_to?: string;
      notes?: string;
      metadata?: any;
      payout_rule_id?: string;
      commission_rule_id?: string;
    }) => invokeFinance("create_deal", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-dashboard"] });
      qc.invalidateQueries({ queryKey: ["deal-aging"] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { deal_id: string; amount: number }) =>
      invokeFinance("update_payment", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-dashboard"] });
      qc.invalidateQueries({ queryKey: ["deal-aging"] });
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      vertical_name: string;
      category: string;
      description?: string;
      amount: number;
      expense_date?: string;
    }) => invokeFinance("create_expense", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-dashboard"] });
    },
  });
}
