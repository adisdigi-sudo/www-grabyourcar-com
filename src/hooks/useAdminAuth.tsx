import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = 'super_admin' | 'admin' | 'sales' | 'dealer' | 'finance' | 'insurance' | 'marketing' | 'calling' | 'operations' | 'vertical_manager' | 'executive';

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
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as UserRole[];
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
