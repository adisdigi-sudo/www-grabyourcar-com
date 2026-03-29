import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface BusinessVertical {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface TeamMember {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  is_active: boolean;
}

interface VerticalContextType {
  activeVertical: BusinessVertical | null;
  setActiveVertical: (v: BusinessVertical | null) => void;
  availableVerticals: BusinessVertical[];
  isLoading: boolean;
  teamMember: TeamMember | null;
  isManagerInVertical: boolean;
}

const VerticalContext = createContext<VerticalContextType | undefined>(undefined);
const ACTIVE_VERTICAL_STORAGE_KEY = "gyc_active_vertical_id";

const getStoredActiveVerticalId = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(ACTIVE_VERTICAL_STORAGE_KEY);
  } catch {
    return null;
  }
};

const setStoredActiveVerticalId = (verticalId: string | null) => {
  if (typeof window === "undefined") return;

  try {
    if (verticalId) {
      window.localStorage.setItem(ACTIVE_VERTICAL_STORAGE_KEY, verticalId);
      return;
    }

    window.localStorage.removeItem(ACTIVE_VERTICAL_STORAGE_KEY);
  } catch {
    // ignore blocked storage
  }
};

export const VerticalProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeVertical, setActiveVerticalState] = useState<BusinessVertical | null>(null);

  const setActiveVertical = useCallback((vertical: BusinessVertical | null) => {
    setActiveVerticalState(vertical);
    setStoredActiveVerticalId(vertical?.id ?? null);
  }, []);

  // Fetch all verticals
  const { data: allVerticals = [], isLoading: verticalsLoading } = useQuery({
    queryKey: ['business-verticals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_verticals')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) {
        console.warn("[VerticalProvider] Failed to fetch verticals", error);
        return [];
      }
      return data as BusinessVertical[];
    },
    enabled: !!user?.id,
    retry: 2,
    staleTime: 1000 * 60,
  });

  // Fetch user's vertical access with access_level
  const { data: userAccessData = [], isLoading: accessLoading } = useQuery({
    queryKey: ['user-vertical-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_vertical_access')
        .select('vertical_id, access_level')
        .eq('user_id', user.id);
      if (error) {
        console.warn("[VerticalProvider] Failed to fetch user access", error);
        return [];
      }
      return data as Array<{ vertical_id: string; access_level: string | null }>;
    },
    enabled: !!user?.id,
    retry: 2,
    staleTime: 1000 * 60,
  });

  const userAccess = userAccessData.map(d => d.vertical_id);

  // Fetch team member info
  const { data: teamMember = null, isLoading: memberLoading } = useQuery({
    queryKey: ['team-member', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        console.warn("[VerticalProvider] Failed to fetch team member", error);
        return null;
      }
      return data as TeamMember | null;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  // Check if user is super_admin/admin (they get all verticals)
  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['userRoles-vertical', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      if ((data?.length ?? 0) > 0) return data.map(d => d.role);

      // Fallback to CRM role for legacy/admin accounts
      const { data: crmUser } = await supabase
        .from('crm_users')
        .select('role')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (crmUser?.role === 'admin') return ['admin'];
      if (crmUser?.role === 'manager') return ['operations'];
      if (crmUser?.role === 'executive') return ['sales'];
      return [];
    },
    enabled: !!user?.id,
  });

  const isAdminUser = userRoles.includes('super_admin') || userRoles.includes('admin');

  // Super admins see all verticals, others see only assigned ones
  const availableVerticals = useMemo(() => {
    if (rolesLoading) {
      return [] as BusinessVertical[];
    }

    return isAdminUser
      ? allVerticals
      : allVerticals.filter(v => userAccess.includes(v.id));
  }, [allVerticals, isAdminUser, rolesLoading, userAccess]);

  useEffect(() => {
    if (!user?.id) {
      setActiveVerticalState(null);
      setStoredActiveVerticalId(null);
      return;
    }

    if (verticalsLoading || accessLoading || rolesLoading) return;

    if (activeVertical && availableVerticals.some(v => v.id === activeVertical.id)) {
      return;
    }

    const storedId = getStoredActiveVerticalId();
    const storedVertical = storedId
      ? availableVerticals.find(v => v.id === storedId) ?? null
      : null;

    if (storedVertical) {
      setActiveVerticalState(storedVertical);
      return;
    }

    if (availableVerticals.length === 1) {
      setActiveVertical(availableVerticals[0]);
      return;
    }

    if (activeVertical && !availableVerticals.some(v => v.id === activeVertical.id)) {
      setActiveVertical(null);
    }
  }, [user?.id, verticalsLoading, accessLoading, rolesLoading, availableVerticals, activeVertical, setActiveVertical]);

  // Check if user is manager in currently active vertical
  const isManagerInVertical = isAdminUser || (
    activeVertical
      ? userAccessData.some(d => d.vertical_id === activeVertical.id && d.access_level === "manager")
      : false
  );

  return (
    <VerticalContext.Provider value={{
      activeVertical,
      setActiveVertical,
      availableVerticals,
      isLoading: verticalsLoading || accessLoading || memberLoading || rolesLoading,
      teamMember,
      isManagerInVertical,
    }}>
      {children}
    </VerticalContext.Provider>
  );
};

export const useVerticalAccess = () => {
  const context = useContext(VerticalContext);
  if (!context) {
    throw new Error("useVerticalAccess must be used within a VerticalProvider");
  }
  return context;
};