export const INSURANCE_ALL_STAGES = [
  "new_lead",
  "smart_calling",
  "quote_shared",
  "follow_up",
  "won",
  "policy_issued",
  "lost",
] as const;

export type InsuranceStage = typeof INSURANCE_ALL_STAGES[number];

export const INSURANCE_VISIBLE_PIPELINE_STAGES: readonly InsuranceStage[] = [
  "new_lead",
  "smart_calling",
  "quote_shared",
  "follow_up",
  "won",
  "lost",
];

export const INSURANCE_ACTIVE_STAGES = new Set<InsuranceStage>([
  "new_lead",
  "smart_calling",
  "quote_shared",
  "follow_up",
]);

export const INSURANCE_TERMINAL_STAGES = new Set<InsuranceStage>([
  "won",
  "policy_issued",
  "lost",
]);

export const INSURANCE_STAGE_DEFINITIONS: ReadonlyArray<{
  value: InsuranceStage;
  label: string;
  aliases: readonly string[];
  visibleInPipeline: boolean;
  terminal: boolean;
}> = [
  {
    value: "new_lead",
    label: "New Lead",
    aliases: ["new_lead", "new"],
    visibleInPipeline: true,
    terminal: false,
  },
  {
    value: "smart_calling",
    label: "Calling",
    aliases: ["smart_calling", "contact_attempted", "requirement_collected", "contacted", "in_process"],
    visibleInPipeline: true,
    terminal: false,
  },
  {
    value: "quote_shared",
    label: "Quote Shared",
    aliases: ["quote_shared"],
    visibleInPipeline: true,
    terminal: false,
  },
  {
    value: "follow_up",
    label: "Follow-Up",
    aliases: ["follow_up", "interested", "hot_prospect"],
    visibleInPipeline: true,
    terminal: false,
  },
  {
    value: "won",
    label: "Won",
    aliases: ["won", "converted"],
    visibleInPipeline: true,
    terminal: true,
  },
  {
    value: "policy_issued",
    label: "Policy Issued",
    aliases: ["policy_issued"],
    visibleInPipeline: false,
    terminal: true,
  },
  {
    value: "lost",
    label: "Lost",
    aliases: ["lost", "not_interested"],
    visibleInPipeline: true,
    terminal: true,
  },
] as const;

const INSURANCE_STAGE_ALIAS_MAP = INSURANCE_STAGE_DEFINITIONS.reduce<Record<string, InsuranceStage>>((acc, definition) => {
  definition.aliases.forEach((alias) => {
    acc[alias] = definition.value;
  });
  return acc;
}, {});

export const CALL_STATUSES = ["Interested", "Not Interested", "Call Back", "No Answer", "Wrong Number"] as const;

export const LOST_REASONS = ["Too expensive", "Existing agent", "No response", "Not renewing", "Competitor offer", "Other"] as const;

export const LEAD_SOURCES = ["Meta Lead", "Google Lead", "Referral", "Walk-in Lead", "WhatsApp Lead", "Website Lead", "Manual", "Rollover"] as const;

export const getInsuranceStageDefinition = (stage: string | null | undefined) => {
  if (!stage) return INSURANCE_STAGE_DEFINITIONS[0];
  return INSURANCE_STAGE_DEFINITIONS.find((definition) => definition.value === stage) || INSURANCE_STAGE_DEFINITIONS[0];
};

export const normalizeInsuranceStage = (
  stage: string | null | undefined,
  leadStatus?: string | null | undefined,
): InsuranceStage => {
  const normalizedStage = stage ? INSURANCE_STAGE_ALIAS_MAP[stage.toLowerCase()] : undefined;
  const normalizedLeadStatus = leadStatus ? INSURANCE_STAGE_ALIAS_MAP[leadStatus.toLowerCase()] : undefined;

  if (normalizedStage === "lost" || normalizedLeadStatus === "lost") {
    return "lost";
  }

  if (normalizedStage === "policy_issued" || normalizedLeadStatus === "policy_issued") {
    return "policy_issued";
  }

  if (normalizedStage && INSURANCE_ACTIVE_STAGES.has(normalizedStage)) {
    return normalizedStage;
  }

  if (normalizedStage === "won") {
    return "won";
  }

  if (normalizedLeadStatus === "won") {
    return "won";
  }

  if (normalizedLeadStatus && INSURANCE_ACTIVE_STAGES.has(normalizedLeadStatus)) {
    return normalizedLeadStatus;
  }

  return normalizedStage || normalizedLeadStatus || "new_lead";
};

export const isInsuranceWonStage = (stage: string | null | undefined, leadStatus?: string | null | undefined) => {
  const normalized = normalizeInsuranceStage(stage, leadStatus);
  return normalized === "won" || normalized === "policy_issued";
};

export const isInsuranceLostStage = (stage: string | null | undefined, leadStatus?: string | null | undefined) => {
  return normalizeInsuranceStage(stage, leadStatus) === "lost";
};