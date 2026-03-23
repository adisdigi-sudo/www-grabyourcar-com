import { supabase } from "@/integrations/supabase/client";

interface AccessoryAiPayload {
  action: string;
  category?: string;
  name?: string;
  description?: string;
  features?: string;
  imagePrompt?: string;
  imageCount?: number;
  userIdea?: string;
}

export async function invokeAccessoryAI(payload: AccessoryAiPayload) {
  const { data, error } = await supabase.functions.invoke("accessory-ai-helper", {
    body: payload,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data;
}