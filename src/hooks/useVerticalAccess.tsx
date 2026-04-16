import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from "react";
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
  const { user, loading: authLoading, initialized: authInitialized } = useAuth();
  const [activeVertical, setActiveVerticalState] = useState<BusinessVertical | null>(null);
  const [hasResolvedActiveVertical, setHasResolvedActiveVertical] = useState(false);
  const [allVerticals, setAllVerticals] = useState<BusinessVertical[]>([]);
  const [userAccessData, setUserAccessData] = useState<Array<{ vertical_id: string; access_level: string | null }>>([]);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const isAuthReady = authInitialized && !authLoading;

  const setActiveVertical = useCallback((vertical: BusinessVertical | null) => {
    setActiveVerticalState(vertical);
    setStoredActiveVerticalId(vertical?.id ?? null);
  }, []);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user?.id) {
      setAllVerticals([]);
      setUserAccessData([]);
      setTeamMember(null);
      setUserRoles([]);
      setDataLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchVerticalData = async () => {
      setDataLoading(true);

      const [verticals, access, member, roles] = await Promise.all([
        (async () => {
          const { data, error } = await supabase
            .from('business_verticals')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');

          if (error) {
            console.warn("[VerticalProvider] Failed to fetch verticals", error);
            return [] as BusinessVertical[];
          }

          return data as BusinessVertical[];
        })(),
        (async () => {
          const { data, error } = await supabase
            .from('user_vertical_access')
            .select('vertical_id, access_level')
            .eq('user_id', user.id);

          if (error) {
            console.warn("[VerticalProvider] Failed to fetch user access", error);
            return [] as Array<{ vertical_id: string; access_level: string | null }>;
          }

          return data as Array<{ vertical_id: string; access_level: string | null }>;
        })(),
        (async () => {
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
        })(),
        (async () => {
          try {
            const { data, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id);

            if (error) throw error;
            if ((data?.length ?? 0) > 0) return data.map((entry) => entry.role);

            const { data: crmUser } = await supabase
              .from('crm_users')
              .select('role')
              .eq('auth_user_id', user.id)
              .maybeSingle();

            if (crmUser?.role === 'admin') return ['admin'];
            if (crmUser?.role === 'manager') return ['operations'];
            if (crmUser?.role === 'executive') return ['sales'];
            return [];
          } catch (err) {
            console.warn("[VerticalProvider] Failed to fetch user roles", err);
            return [] as string[];
          }
        })(),
      ]);

      if (isCancelled) {
        return;
      }

      setAllVerticals(verticals);
      setUserAccessData(access);
      setTeamMember(member);
      setUserRoles(roles);
      setDataLoading(false);
    };

    fetchVerticalData().catch((error) => {
      if (isCancelled) {
        return;
      }

      console.warn("[VerticalProvider] Failed to bootstrap vertical context", error);
      setAllVerticals([]);
      setUserAccessData([]);
      setTeamMember(null);
      setUserRoles([]);
      setDataLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [isAuthReady, user?.id]);

  const userAccess = userAccessData.map(d => d.vertical_id);

  const isAdminUser = userRoles.includes('super_admin') || userRoles.includes('admin');

  // Super admins see all verticals, others see only assigned ones
  const availableVerticals = useMemo(() => {
    if (dataLoading) {
      return [] as BusinessVertical[];
    }

    return isAdminUser
      ? allVerticals
      : allVerticals.filter(v => userAccess.includes(v.id));
  }, [allVerticals, isAdminUser, dataLoading, userAccess]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    setHasResolvedActiveVertical(false);
  }, [isAuthReady, user?.id]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!user?.id) {
      setActiveVerticalState(null);
      setStoredActiveVerticalId(null);
      setHasResolvedActiveVertical(true);
      return;
    }

    if (dataLoading) {
      return;
    }

    if (activeVertical && availableVerticals.some(v => v.id === activeVertical.id)) {
      setHasResolvedActiveVertical(true);
      return;
    }

    const storedId = getStoredActiveVerticalId();
    const storedVertical = storedId
      ? availableVerticals.find(v => v.id === storedId) ?? null
      : null;

    if (storedVertical) {
      setActiveVerticalState(storedVertical);
      setHasResolvedActiveVertical(true);
      return;
    }

    if (availableVerticals.length === 1) {
      setActiveVertical(availableVerticals[0]);
      setHasResolvedActiveVertical(true);
      return;
    }

    if (activeVertical && !availableVerticals.some(v => v.id === activeVertical.id)) {
      setActiveVertical(null);
    }

    setHasResolvedActiveVertical(true);
  }, [isAuthReady, user?.id, dataLoading, availableVerticals, activeVertical, setActiveVertical]);

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
      isLoading: !isAuthReady || dataLoading || !hasResolvedActiveVertical,
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