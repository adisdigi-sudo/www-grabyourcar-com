import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "crm-customers";

async function callCrm(action: string, payload: Record<string, any> = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...payload },
  });

  if (res.error) throw new Error(res.error.message);
  const result = res.data;
  if (!result.success) throw new Error(result.error || "Unknown error");
  return result;
}

export function useCustomerList(filters: {
  page?: number;
  limit?: number;
  status?: string;
  vertical?: string;
  search?: string;
  assigned_to?: string;
  lifecycle_stage?: string;
}) {
  return useQuery({
    queryKey: ["crm-customers", filters],
    queryFn: () => callCrm("list", filters),
  });
}

export function useCustomerDetail(customerId: string | undefined) {
  return useQuery({
    queryKey: ["crm-customer", customerId],
    queryFn: () => callCrm("get", { customerId }),
    enabled: !!customerId,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => callCrm("create", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-customers"] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => callCrm("update", data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-customers"] });
      qc.invalidateQueries({ queryKey: ["crm-customer", vars.customerId] });
    },
  });
}

export function useAddActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId: string; activity_type: string; notes?: string }) =>
      callCrm("add_activity", data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-customer", vars.customerId] });
    },
  });
}

export function useCustomersByVerticalStage(filters: {
  vertical_name?: string;
  stage?: string;
  assigned_to?: string;
  search?: string;
  is_final?: boolean;
  is_lost?: boolean;
}) {
  return useQuery({
    queryKey: ["crm-customers-by-vertical", filters],
    queryFn: () => callCrm("list_by_vertical_stage", filters),
    enabled: !!filters.vertical_name,
  });
}

export function useVerticalPipelineStages(verticalName: string | undefined) {
  return useQuery({
    queryKey: ["crm-pipeline-stages", verticalName],
    queryFn: () => callCrm("get_pipeline_stages", { vertical_name: verticalName }),
    enabled: !!verticalName,
  });
}

export function useCustomerVerticalStatus(customerId: string | undefined) {
  return useQuery({
    queryKey: ["crm-vertical-status", customerId],
    queryFn: () => callCrm("get_vertical_status", { customerId }),
    enabled: !!customerId,
  });
}

export function useUpdateVerticalStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId: string; vertical_name: string; new_stage: string }) =>
      callCrm("update_vertical_stage", data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-vertical-status", vars.customerId] });
      qc.invalidateQueries({ queryKey: ["crm-customers"] });
      qc.invalidateQueries({ queryKey: ["crm-customers-by-vertical"] });
    },
  });
}

export function useVerticalPipelineHistory(customerId: string | undefined, verticalName?: string) {
  return useQuery({
    queryKey: ["crm-vertical-history", customerId, verticalName],
    queryFn: () => callCrm("get_vertical_history", { customerId, vertical_name: verticalName }),
    enabled: !!customerId,
  });
}

export function useScheduleFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId: string; next_followup_at: string; notes?: string }) =>
      callCrm("schedule_followup", data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-customer", vars.customerId] });
      qc.invalidateQueries({ queryKey: ["crm-customers"] });
    },
  });
}

export function useLogCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId: string; call_status: string; call_notes?: string; call_duration?: number }) =>
      callCrm("log_call", data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-customer", vars.customerId] });
      qc.invalidateQueries({ queryKey: ["crm-call-logs", vars.customerId] });
      qc.invalidateQueries({ queryKey: ["crm-customers"] });
    },
  });
}

export function useCallLogs(customerId: string | undefined) {
  return useQuery({
    queryKey: ["crm-call-logs", customerId],
    queryFn: () => callCrm("get_call_logs", { customerId }),
    enabled: !!customerId,
  });
}

export function useOverdueFollowups(filters: { vertical_name?: string; assigned_to?: string }) {
  return useQuery({
    queryKey: ["crm-overdue-followups", filters],
    queryFn: () => callCrm("get_overdue_followups", filters),
  });
}

export function useDashboardMetrics(filters: { vertical_name?: string; assigned_to?: string }) {
  return useQuery({
    queryKey: ["crm-dashboard-metrics", filters],
    queryFn: () => callCrm("get_dashboard_metrics", filters),
  });
}

export function useExecutivePerformance(filters: { vertical_name?: string; executive_id?: string }) {
  return useQuery({
    queryKey: ["crm-executive-performance", filters],
    queryFn: () => callCrm("get_executive_performance", filters),
  });
}
