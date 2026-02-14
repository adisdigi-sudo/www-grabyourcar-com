import { supabase } from "@/integrations/supabase/client";

/**
 * Fire a WhatsApp automation trigger (non-blocking).
 * Routes through wa-automation-trigger edge function.
 */
export function triggerWhatsApp(payload: {
  event: string;
  phone: string;
  name?: string;
  leadId?: string;
  data?: Record<string, string>;
}) {
  supabase.functions
    .invoke("wa-automation-trigger", { body: payload })
    .then(({ error }) => {
      if (error) console.error("WA trigger error:", error);
    })
    .catch((err) => console.error("WA trigger failed:", err));
}
