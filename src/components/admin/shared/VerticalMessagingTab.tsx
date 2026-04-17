import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { OmniMessagingWorkspace } from "./OmniMessagingWorkspace";

export type VerticalScope =
  | "insurance"
  | "loans"
  | "sales"
  | "hsrp"
  | "rentals"
  | "accessories";

const SCOPE_CONFIG: Record<VerticalScope, {
  label: string;
  table: string;
  phoneField: string;
  nameField?: string;
  emailField?: string;
}> = {
  insurance:   { label: "Insurance",   table: "insurance_clients",    phoneField: "phone",          nameField: "customer_name", emailField: "email" },
  loans:       { label: "Loans",       table: "loan_applications",    phoneField: "phone",          nameField: "customer_name", emailField: "email" },
  sales:       { label: "Car Sales",   table: "sales_pipeline",       phoneField: "phone",          nameField: "customer_name", emailField: "email" },
  hsrp:        { label: "HSRP",        table: "hsrp_bookings",        phoneField: "mobile",         nameField: "owner_name",    emailField: "email" },
  rentals:     { label: "Self-Drive",  table: "rental_bookings",      phoneField: "phone",          nameField: "customer_name", emailField: "email" },
  accessories: { label: "Accessories", table: "accessory_orders",     phoneField: "shipping_phone", nameField: "shipping_name", emailField: "shipping_email" },
};

interface VerticalMessagingTabProps {
  scope: VerticalScope;
  /** Optional context label sent to send/chat tools (default = scope label). */
  contextOverride?: string;
}

/**
 * Vertical-scoped messaging workspace.
 * Auto-fetches all customer phone numbers for the given vertical
 * and limits the Omni Chat + Campaign panels to ONLY those contacts.
 */
export function VerticalMessagingTab({ scope, contextOverride }: VerticalMessagingTabProps) {
  const cfg = SCOPE_CONFIG[scope];

  const { data, isLoading } = useQuery({
    queryKey: ["vertical-messaging-phones", scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(cfg.table as any)
        .select(`${cfg.phoneField}${cfg.nameField ? `, ${cfg.nameField}` : ""}${cfg.emailField ? `, ${cfg.emailField}` : ""}`)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const rows = (data || []) as any[];
      const phoneSet = new Set<string>();
      const recipients: { phone?: string; email?: string; name?: string }[] = [];
      for (const r of rows) {
        const phone = String(r[cfg.phoneField] || "").trim();
        if (!phone) continue;
        const key = phone.replace(/\D/g, "").slice(-10);
        if (!key || phoneSet.has(key)) continue;
        phoneSet.add(key);
        recipients.push({
          phone,
          name: cfg.nameField ? r[cfg.nameField] : undefined,
          email: cfg.emailField ? r[cfg.emailField] : undefined,
        });
      }
      return { phones: Array.from(phoneSet), recipients };
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading {cfg.label} conversations…
      </div>
    );
  }

  return (
    <OmniMessagingWorkspace
      scopeLabel={cfg.label}
      allowedPhones={data?.phones || []}
      recipients={data?.recipients || []}
      context={contextOverride || cfg.label}
    />
  );
}
