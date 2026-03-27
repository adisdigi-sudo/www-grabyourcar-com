import type { Client } from "@/components/admin/insurance/InsuranceLeadPipeline";

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