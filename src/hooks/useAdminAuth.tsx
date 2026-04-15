import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = 'super_admin' | 'admin' | 'sales' | 'dealer' | 'finance' | 'insurance' | 'marketing' | 'calling' | 'operations';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: directRoles, error: directError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (directError) throw directError;
      if ((directRoles?.length ?? 0) > 0) {
        return directRoles as UserRole[];
      }

      // Fallback: CRM role mapping for legacy/admin accounts
      const { data: crmUser } = await supabase
        .from('crm_users')
        .select('role')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!crmUser?.role) return [];

      const mappedRole: AppRole | null = crmUser.role === 'admin'
        ? 'admin'
        : crmUser.role === 'manager'
          ? 'operations'
          : crmUser.role === 'executive'
            ? 'sales'
            : null;

      if (!mappedRole) return [];

      return [{
        id: `crm-${user.id}`,
        user_id: user.id,
        role: mappedRole,
        created_at: new Date().toISOString(),
      }];
    },
    enabled: !!user?.id,
  });

  const hasRole = (role: AppRole): boolean => {
    return roles?.some(r => r.role === role) ?? false;
  };

  const isAdmin = (): boolean => {
    return hasRole('super_admin') || hasRole('admin');
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };

  const canManageLeads = (): boolean => {
    return isAdmin() || hasRole('sales');
  };

  const canManageFinance = (): boolean => {
    return isAdmin() || hasRole('finance');
  };

  const canManageDealers = (): boolean => {
    return isAdmin() || hasRole('dealer');
  };

  return {
    user,
    roles: roles || [],
    isLoading: authLoading || rolesLoading,
    hasRole,
    isAdmin,
    isSuperAdmin,
    canManageLeads,
    canManageFinance,
    canManageDealers,
  };
};
