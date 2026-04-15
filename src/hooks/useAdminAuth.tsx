import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const ADMIN_ROLE_QUERY_TIMEOUT_MS = 8000;

const withQueryTimeout = async <T,>(promise: Promise<T>, label: string): Promise<T> => {
  let timeoutId: number | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, ADMIN_ROLE_QUERY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
};

export type AppRole = 'super_admin' | 'admin' | 'sales' | 'dealer' | 'finance' | 'insurance' | 'marketing' | 'calling' | 'operations' | 'executive' | 'vertical_manager' | 'team_leader' | 'manager';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export const useAdminAuth = () => {
  const { user, loading: authLoading, initialized } = useAuth();
  const shouldLoadRoles = initialized && !!user?.id;

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        try {
          const { data: directRoles, error: directError } = await withQueryTimeout(
            supabase
              .from('user_roles')
              .select('*')
              .eq('user_id', user.id),
            'user_roles lookup',
          );

          if (directError) throw directError;
          if ((directRoles?.length ?? 0) > 0) {
            return directRoles as UserRole[];
          }
        } catch (directLookupError) {
          console.warn("[useAdminAuth] Direct role lookup failed, trying CRM fallback", directLookupError);
        }

        const { data: crmUser, error: crmError } = await withQueryTimeout(
          supabase
            .from('crm_users')
            .select('role')
            .eq('auth_user_id', user.id)
            .maybeSingle(),
          'crm_users lookup',
        );

        if (crmError) throw crmError;

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
      } catch (err) {
        console.warn("[useAdminAuth] Failed to fetch roles, returning empty", err);
        return [];
      }
    },
    enabled: shouldLoadRoles,
    retry: 1,
    staleTime: 1000 * 60,
  });

  const isReady = initialized && !authLoading && (!user || !rolesLoading);
  const safeRoles = useMemo(() => roles || [], [roles]);

  const hasRole = (role: AppRole): boolean => {
    return safeRoles.some(r => r.role === role);
  };

  const isAdmin = (): boolean => {
    return hasRole('super_admin') || hasRole('admin');
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };

  const canManageLeads = (): boolean => {
    return isAdmin() || hasRole('sales') || hasRole('team_leader') || hasRole('manager');
  };

  const canManageFinance = (): boolean => {
    return isAdmin() || hasRole('finance');
  };

  const canManageDealers = (): boolean => {
    return isAdmin() || hasRole('dealer');
  };

  const canManageUsers = (): boolean => {
    return hasRole('super_admin');
  };

  const isTeamLeader = (): boolean => {
    return hasRole('team_leader');
  };

  const isManager = (): boolean => {
    return hasRole('manager');
  };

  return {
    user,
    initialized,
    roles: safeRoles,
    isLoading: !isReady,
    isReady,
    hasRole,
    isAdmin,
    isSuperAdmin,
    canManageLeads,
    canManageFinance,
    canManageDealers,
    canManageUsers,
    isTeamLeader,
    isManager,
  };
};
