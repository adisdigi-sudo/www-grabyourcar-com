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

const ROLE_PRIORITY: Record<CrmRole, number> = {
  admin: 3,
  manager: 2,
  executive: 1,
};

const ROLE_MAP: Record<string, CrmRole | undefined> = {
  super_admin: "admin",
  admin: "admin",
  vertical_manager: "manager",
  executive: "executive",
};

export function useCrmAccess() {
  const { user } = useAuth();

  const { data: crmUser, isLoading: crmLoading } = useQuery({
    queryKey: ["crm-user", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("crm_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CrmUser | null;
    },
    enabled: !!user?.id,
  });

  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["crm-user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((r) => r.role);
    },
    enabled: !!user?.id,
  });

  const { data: allVerticalSlugs = [], isLoading: allVerticalsLoading } = useQuery({
    queryKey: ["crm-all-verticals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_verticals")
        .select("slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []).map((v) => v.slug);
    },
    enabled: !!user?.id,
  });

  const { data: userVerticalSlugs = [], isLoading: verticalAccessLoading } = useQuery({
    queryKey: ["crm-vertical-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: accessRows, error: accessError } = await supabase
        .from("user_vertical_access")
        .select("vertical_id")
        .eq("user_id", user.id);
      if (accessError) throw accessError;

      const verticalIds = (accessRows || []).map((row) => row.vertical_id).filter(Boolean);
      if (verticalIds.length === 0) return [];

      const { data: verticalRows, error: verticalError } = await supabase
        .from("business_verticals")
        .select("id, slug")
        .in("id", verticalIds)
        .eq("is_active", true);
      if (verticalError) throw verticalError;

      return (verticalRows || []).map((row) => row.slug);
    },
    enabled: !!user?.id,
  });

  const roleFromUserRoles = userRoles
    .map((role) => ROLE_MAP[role])
    .filter((role): role is CrmRole => !!role)
    .sort((a, b) => ROLE_PRIORITY[b] - ROLE_PRIORITY[a])[0];

  const normalizedCrmRole: CrmRole | undefined =
    crmUser?.role === "admin" || crmUser?.role === "manager" || crmUser?.role === "executive"
      ? crmUser.role
      : undefined;

  const role: CrmRole | undefined = roleFromUserRoles || normalizedCrmRole;

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isExecutive = role === "executive";

  const accessibleVerticals = isAdmin ? allVerticalSlugs : userVerticalSlugs;
  const hasCrmAccess = !!role && (roleFromUserRoles !== undefined || (!!crmUser && crmUser.is_active !== false));

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
    isLoading: crmLoading || rolesLoading || verticalAccessLoading || allVerticalsLoading,
  };
}

