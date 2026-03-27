import type { Client } from "@/components/admin/insurance/InsuranceLeadPipeline";
import type { PolicyRecord } from "@/components/admin/insurance/InsurancePolicyBook";

export const normalizePhoneNumber = (value: string | null | undefined) =>
  (value || "").replace(/\D/g, "").trim();

export const normalizeVehicleRegistration = (value: string | null | undefined) =>
  (value || "").replace(/\s+/g, "").toUpperCase().trim();

export const normalizePolicyNumber = (value: string | null | undefined) =>
  (value || "").replace(/\s+/g, "").toUpperCase().trim();

export const getClientIdentityKey = (client: Pick<Client, "id" | "phone" | "vehicle_number" | "current_policy_number">) => {
  const vehicleKey = normalizeVehicleRegistration(client.vehicle_number);
  if (vehicleKey) return `vehicle:${vehicleKey}`;

  const policyKey = normalizePolicyNumber(client.current_policy_number);
  if (policyKey) return `policy:${policyKey}`;

  const phoneKey = normalizePhoneNumber(client.phone);
  if (phoneKey) return `phone:${phoneKey}`;

  return `id:${client.id}`;
};

export const choosePreferredClient = (current: Client, candidate: Client) => {
  const currentStage = (current.pipeline_stage || "").toLowerCase();
  const candidateStage = (candidate.pipeline_stage || "").toLowerCase();
  const currentStatus = (current.lead_status || "").toLowerCase();
  const candidateStatus = (candidate.lead_status || "").toLowerCase();

  const score = (item: Client, stage: string, status: string) => {
    let total = 0;
    if (stage === "policy_issued") total += 100;
    if (["won", "converted"].includes(status)) total += 80;
    if (stage === "won") total += 70;
    if (normalizePolicyNumber(item.current_policy_number)) total += 60;
    if (item.policy_start_date || item.policy_expiry_date || item.booking_date) total += 40;
    if (stage === "lost" || status === "lost") total -= 30;
    if (item.updated_at) total += new Date(item.updated_at).getTime() / 1e13;
    return total;
  };

  return score(candidate, candidateStage, candidateStatus) > score(current, currentStage, currentStatus)
    ? candidate
    : current;
};

export const dedupeInsuranceClients = (clients: Client[]) => {
  const unique = new Map<string, Client>();

  for (const client of clients) {
    const key = getClientIdentityKey(client);
    const existing = unique.get(key);
    unique.set(key, existing ? choosePreferredClient(existing, client) : client);
  }

  return Array.from(unique.values());
};

export const getClientEffectiveDate = (client: Pick<Client, "policy_start_date" | "booking_date" | "created_at">) => (
  client.policy_start_date || client.booking_date || client.created_at
);

export const getPolicyEffectiveDate = (policy: Pick<PolicyRecord, "start_date" | "booking_date" | "issued_date" | "created_at" | "insurance_clients">) => (
  policy.start_date ||
  policy.booking_date ||
  policy.issued_date ||
  policy.insurance_clients?.booking_date ||
  policy.created_at
);

export const dedupeInsurancePolicies = (policies: PolicyRecord[]) => {
  const unique = new Map<string, PolicyRecord>();

  for (const policy of policies) {
    if (!policy.policy_number?.trim()) continue;

    const normalizedStatus = (policy.status || "").toLowerCase();
    if (["renewed", "lapsed", "cancelled", "lost"].includes(normalizedStatus)) continue;

    const vehicleKey = normalizeVehicleRegistration(policy.insurance_clients?.vehicle_number);
    const key = vehicleKey || `policy:${normalizePolicyNumber(policy.policy_number) || `${policy.client_id || "no-client"}:${policy.id}`}`;
    const existing = unique.get(key);

    if (!existing) {
      unique.set(key, policy);
      continue;
    }

    const existingDate = new Date(getPolicyEffectiveDate(existing)).getTime();
    const nextDate = new Date(getPolicyEffectiveDate(policy)).getTime();
    const existingStamp = new Date(existing.updated_at || existing.created_at).getTime();
    const nextStamp = new Date(policy.updated_at || policy.created_at).getTime();

    if (nextDate > existingDate || (nextDate === existingDate && nextStamp > existingStamp)) {
      unique.set(key, policy);
    }
  }

  return Array.from(unique.values());
};