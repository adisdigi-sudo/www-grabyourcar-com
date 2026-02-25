import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type CrmRole = "super_admin" | "admin" | "manager" | "executive" | "marketing";

export interface CrmUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  vertical_access: string[] | null;
  is_active: boolean;
  tenant_id: string | null;
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
        .eq("user_id", user.id)
        .maybeSingle();
      if (crmError) throw crmError;

      if (crmData) {
        return crmData as CrmUser;
      }

      // Backward-compatible fallback for rebuilt CRM where team_members is the source of truth
      const { data: teamMember, error: teamMemberError } = await supabase
        .from("team_members")
        .select("id, user_id, display_name, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (teamMemberError) throw teamMemberError;
      if (!teamMember) return null;

      return {
        id: teamMember.id,
        user_id: teamMember.user_id,
        name: teamMember.display_name || user.email?.split("@")[0] || "CRM User",
        email: user.email || "",
        vertical_access: null,
        is_active: teamMember.is_active ?? true,
        tenant_id: null,
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
    : crmUser?.vertical_access?.length
      ? crmUser.vertical_access
      : userVerticalAccess;

  const hasRoleAccess = roles.length > 0;
  const hasActiveProfile = !!crmUser && crmUser.is_active !== false;
  const hasCrmAccess = hasRoleAccess || hasActiveProfile;

  const canAccessVertical = (vertical: string) =>
    isSuperAdmin || accessibleVerticals.includes(vertical);

  const canManageTeam = isSuperAdmin || isAdmin;
  const tenantId = crmUser?.tenant_id || null;

  return {
    roles,
    crmUser,
    tenantId,
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

