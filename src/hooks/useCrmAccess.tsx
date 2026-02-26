import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type CrmRole = "super_admin" | "admin" | "manager" | "executive" | "marketing";

export interface CrmUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

const ALL_VERTICALS = ["car_sales", "insurance", "loan", "corporate", "accessories", "rental"];

export function useCrmAccess() {
  const { user } = useAuth();

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["crm-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((d) => d.role as CrmRole);
    },
    enabled: !!user?.id,
  });

  const { data: crmUser, isLoading: crmLoading } = useQuery({
    queryKey: ["crm-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: crmData, error: crmError } = await supabase
        .from("crm_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (crmError) throw crmError;

      if (crmData) {
        return crmData as unknown as CrmUser;
      }

      // Backward-compatible fallback via team_members
      const { data: teamMember, error: teamMemberError } = await supabase
        .from("team_members")
        .select("id, user_id, display_name, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (teamMemberError) throw teamMemberError;
      if (!teamMember) return null;

      return {
        id: teamMember.id,
        auth_user_id: teamMember.user_id,
        name: teamMember.display_name || user.email?.split("@")[0] || "CRM User",
        email: user.email || "",
        role: roles?.[0] || "executive",
        is_active: teamMember.is_active ?? true,
      } as CrmUser;
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

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuperAdmin;
  const isManager = roles.includes("manager");
  const isExecutive = roles.includes("executive");

  const accessibleVerticals = isSuperAdmin
    ? ALL_VERTICALS
    : userVerticalAccess;

  const hasRoleAccess = roles.length > 0;
  const hasActiveProfile = !!crmUser && crmUser.is_active !== false;
  const hasCrmAccess = hasRoleAccess || hasActiveProfile;

  const canAccessVertical = (vertical: string) =>
    isSuperAdmin || accessibleVerticals.includes(vertical);

  const canManageTeam = isSuperAdmin || isAdmin;

  return {
    roles,
    crmUser,
    tenantId: null,
    hasCrmAccess,
    isSuperAdmin,
    isAdmin,
    isManager,
    isExecutive,
    accessibleVerticals,
    canAccessVertical,
    canManageTeam,
    isLoading: rolesLoading || crmLoading || verticalAccessLoading,
  };
}
