import { supabase } from "@/integrations/supabase/client";

interface SenderIdentity {
  name: string;
  designation: string;
  company: string;
}

// Cache per session
let cachedIdentity: SenderIdentity | null = null;
let cacheTs = 0;
const TTL = 5 * 60 * 1000; // 5 min

/**
 * Get the logged-in admin's name & designation for message signatures.
 * Falls back to "GrabYourCar Team" if not found.
 */
export async function getSenderIdentity(): Promise<SenderIdentity> {
  if (cachedIdentity && Date.now() - cacheTs < TTL) return cachedIdentity;

  const fallback: SenderIdentity = { name: "Team", designation: "GrabYourCar", company: "GrabYourCar" };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fallback;

    // Try team_members first (has display_name + designation)
    const { data: tm } = await supabase
      .from("team_members")
      .select("display_name, designation")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (tm?.display_name) {
      cachedIdentity = {
        name: tm.display_name,
        designation: tm.designation || "Team Member",
        company: "GrabYourCar",
      };
      cacheTs = Date.now();
      return cachedIdentity;
    }

    // Fallback to crm_users
    const { data: cu } = await supabase
      .from("crm_users")
      .select("name, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (cu?.name) {
      const roleMap: Record<string, string> = {
        admin: "Founder",
        super_admin: "Founder",
        manager: "Manager",
        executive: "Relationship Representative",
      };
      cachedIdentity = {
        name: cu.name,
        designation: roleMap[cu.role] || "Relationship Representative",
        company: "GrabYourCar",
      };
      cacheTs = Date.now();
      return cachedIdentity;
    }
  } catch (e) {
    console.warn("Failed to get sender identity:", e);
  }

  return fallback;
}

/**
 * Generate a formatted signature line for WhatsApp messages.
 * E.g.: "Regards,\nAnshdeep | Relationship Representative | GrabYourCar 🚗"
 */
export async function getWhatsAppSignature(): Promise<string> {
  const id = await getSenderIdentity();
  return `\n\nRegards,\n*${id.name}* | ${id.designation} | ${id.company} 🚗`;
}

/**
 * Generate a formatted signature for emails.
 */
export async function getEmailSignature(): Promise<string> {
  const id = await getSenderIdentity();
  return `\n\nRegards,\n${id.name}\n${id.designation} | ${id.company}`;
}

/** Clear cache (e.g. on logout) */
export function clearSenderIdentityCache() {
  cachedIdentity = null;
  cacheTs = 0;
}
