import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type CrmRole = "admin" | "manager" | "executive";

export interface CrmUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: CrmRole;
  is_active: boolean;
}

const ALL_VERTICALS = ["car_sales", "insurance", "loan", "corporate", "accessories", "rental"];

export function useCrmAccess() {
  console.log("==== CRM ACCESS HOOK START ====");
  const { user } = useAuth();

  const { data: crmUser, isLoading: crmLoading, error: crmError } = useQuery({
    queryKey: ["crm-user", user?.id],
    queryFn: async () => {
      console.log("[CRM] queryFn called, auth user ID:", user?.id);
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("crm_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      console.log("[CRM] crm_users query result:", { data, error });
      if (error) throw error;
      return data as unknown as CrmUser | null;
    },
    enabled: !!user?.id,
  });

  const { data: userVerticalAccess = [], isLoading: verticalAccessLoading } = useQuery({
    queryKey: ["crm-vertical-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_vertical_access")
        .select("vertical_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((d) => d.vertical_id);
    },
    enabled: !!user?.id,
  });

  console.log("[CRM Debug] Auth user:", user?.id, user?.email);
  console.log("[CRM Debug] CRM user:", crmUser, "error:", crmError);
  console.log("[CRM Debug] crmLoading:", crmLoading, "verticalAccessLoading:", verticalAccessLoading);

  const role = crmUser?.role;
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isExecutive = role === "executive";

  const accessibleVerticals = isAdmin ? ALL_VERTICALS : userVerticalAccess;

  const hasCrmAccess = !!crmUser && crmUser.is_active !== false;
  console.log("[CRM Debug] hasCrmAccess:", hasCrmAccess, "role:", role);

  const canAccessVertical = (vertical: string) =>
    isAdmin || accessibleVerticals.includes(vertical);

  const canManageTeam = isAdmin;

  return {
    crmUser,
    hasCrmAccess,
    isAdmin,
    isManager,
    isExecutive,
    accessibleVerticals,
    canAccessVertical,
    canManageTeam,
    isLoading: crmLoading || verticalAccessLoading,
  };
}
