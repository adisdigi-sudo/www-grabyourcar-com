import type { Client } from "@/components/admin/insurance/InsuranceLeadPipeline";
import type { PolicyRecord } from "@/components/admin/insurance/InsurancePolicyBook";

export const normalizePhoneNumber = (value: string | null | undefined) =>
  (value || "").replace(/\D/g, "").trim();

export const normalizeVehicleRegistration = (value: string | null | undefined) => {
  const compact = (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim();
  if (!compact) return "";

  const indianPlateMatch = compact.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  if (!indianPlateMatch) return compact;

  const [, stateCode, districtCode, seriesCode, serialNumber] = indianPlateMatch;
  return `${stateCode}${String(Number(districtCode))}${seriesCode}${String(Number(serialNumber))}`;
};

export const normalizePolicyNumber = (value: string | null | undefined) =>
  (value || "").replace(/\s+/g, "").toUpperCase().trim();

const STAGE_ALIASES: Record<string, string> = {
  new: "new_lead",
  new_lead: "new_lead",
  contact_attempted: "smart_calling",
  requirement_collected: "smart_calling",
  smart_calling: "smart_calling",
  contacted: "smart_calling",
  in_process: "smart_calling",
  quote_shared: "quote_shared",
  follow_up: "follow_up",
  interested: "follow_up",
  hot_prospect: "follow_up",
  won: "won",
  converted: "won",
  policy_issued: "policy_issued",
  lost: "lost",
  not_interested: "lost",
};

const ACTIVE_PIPELINE_STAGES = new Set(["new_lead", "smart_calling", "quote_shared", "follow_up"]);

const getNormalizedLifecycleStage = (pipelineStage: string | null | undefined, leadStatus: string | null | undefined) => {
  const normalizedPipelineStage = pipelineStage ? STAGE_ALIASES[pipelineStage] : undefined;
  const normalizedLeadStatus = leadStatus ? STAGE_ALIASES[leadStatus] : undefined;

  if (normalizedPipelineStage && normalizedPipelineStage !== "policy_issued") return normalizedPipelineStage;
  if (normalizedLeadStatus && normalizedLeadStatus !== "policy_issued") return normalizedLeadStatus;
  return normalizedPipelineStage || normalizedLeadStatus || "new_lead";
};

export const getClientIdentityKey = (client: Pick<Client, "id" | "phone" | "vehicle_number" | "current_policy_number">) => {
  const vehicleKey = normalizeVehicleRegistration(client.vehicle_number);
  if (vehicleKey) return `vehicle:${vehicleKey}`;

  return `id:${client.id}`;
};

export const choosePreferredClient = (current: Client, candidate: Client) => {
  const currentStage = (current.pipeline_stage || "").toLowerCase();
  const candidateStage = (candidate.pipeline_stage || "").toLowerCase();
  const currentStatus = (current.lead_status || "").toLowerCase();
  const candidateStatus = (candidate.lead_status || "").toLowerCase();

  const score = (item: Client, stage: string, status: string) => {
    const normalizedStage = getNormalizedLifecycleStage(stage, status);
    let total = 0;

    if (ACTIVE_PIPELINE_STAGES.has(normalizedStage)) total += 220;
    if (normalizedStage === "quote_shared") total += 40;
    if (normalizedStage === "follow_up") total += 30;
    if (normalizedStage === "smart_calling") total += 20;
    if (stage === "policy_issued") total += 120;
    if (["won", "converted"].includes(status)) total += 80;
    if (stage === "won") total += 70;
    if (normalizePolicyNumber(item.current_policy_number)) total += 20;
    if (item.policy_start_date || item.policy_expiry_date || item.booking_date) total += 10;
    if (normalizedStage === "lost") total -= 60;
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
  policy.booking_date ||
  policy.issued_date ||
  policy.insurance_clients?.booking_date ||
  policy.start_date ||
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