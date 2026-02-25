import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type CrmRole = "super_admin" | "admin" | "manager" | "executive";

export interface CrmUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  vertical_access: string[] | null;
  is_active: boolean;
  tenant_id: string | null;
}

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
      const { data, error } = await supabase
        .from("crm_users")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as CrmUser | null;
    },
    enabled: !!user?.id,
  });

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuperAdmin;
  const isManager = roles.includes("manager");
  const isExecutive = roles.includes("executive");

  const accessibleVerticals = isSuperAdmin
    ? ["car_sales", "insurance", "loan", "corporate", "accessories", "rental"]
    : crmUser?.vertical_access || [];

  const canAccessVertical = (vertical: string) =>
    isSuperAdmin || accessibleVerticals.includes(vertical);

  const canManageTeam = isSuperAdmin || isAdmin;

  const tenantId = crmUser?.tenant_id || null;

  return {
    roles,
    crmUser,
    tenantId,
    isSuperAdmin,
    isAdmin,
    isManager,
    isExecutive,
    accessibleVerticals,
    canAccessVertical,
    canManageTeam,
    isLoading: rolesLoading || crmLoading,
  };
}
