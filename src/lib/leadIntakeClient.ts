import { supabase } from "@/integrations/supabase/client";

type LeadPayload = Record<string, unknown>;

type SubmitLeadReliablyOptions = {
  enableSubmitLeadFallback?: boolean;
};

const DIRECT_FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const RETRY_DELAYS_MS = [250, 700];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Lead capture failed";
}

function isSuccessfulResponse(data: unknown) {
  return Boolean(data) && typeof data === "object" && !("error" in (data as Record<string, unknown>));
}

async function invokeFunction(functionName: string, payload: LeadPayload) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });

  if (error) throw error;
  if (!isSuccessfulResponse(data)) {
    throw new Error(((data as Record<string, unknown> | null)?.error as string | undefined) || `${functionName} returned an invalid response`);
  }

  return data;
}

async function postFunctionWithKeepAlive(functionName: string, payload: LeadPayload) {
  if (!DIRECT_FUNCTIONS_BASE || !PUBLISHABLE_KEY) {
    throw new Error("Backend function configuration is missing");
  }

  const response = await fetch(`${DIRECT_FUNCTIONS_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !isSuccessfulResponse(data)) {
    throw new Error(((data as Record<string, unknown> | null)?.error as string | undefined) || `${functionName} request failed with status ${response.status}`);
  }

  return data;
}

export async function submitLeadReliably(
  payload: LeadPayload,
  { enableSubmitLeadFallback = false }: SubmitLeadReliablyOptions = {},
) {
  let lastError: unknown;

  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await invokeFunction("lead-intake-engine", payload);
    } catch (error) {
      lastError = error;
      await wait(delay);
    }
  }

  try {
    return await postFunctionWithKeepAlive("lead-intake-engine", payload);
  } catch (error) {
    lastError = error;
  }

  if (enableSubmitLeadFallback) {
    try {
      return await invokeFunction("submit-lead", payload);
    } catch (error) {
      lastError = error;
    }

    try {
      return await postFunctionWithKeepAlive("submit-lead", payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(extractErrorMessage(lastError));
}
