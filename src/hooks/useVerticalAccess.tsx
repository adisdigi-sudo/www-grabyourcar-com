import { createContext, useContext, useState, ReactNode } from "react";
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
}

const VerticalContext = createContext<VerticalContextType | undefined>(undefined);

export const VerticalProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeVertical, setActiveVertical] = useState<BusinessVertical | null>(null);

  // Fetch all verticals
  const { data: allVerticals = [], isLoading: verticalsLoading } = useQuery({
    queryKey: ['business-verticals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_verticals')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as BusinessVertical[];
    },
    enabled: !!user?.id,
  });

  // Fetch user's vertical access
  const { data: userAccess = [], isLoading: accessLoading } = useQuery({
    queryKey: ['user-vertical-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_vertical_access')
        .select('vertical_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(d => d.vertical_id);
    },
    enabled: !!user?.id,
  });

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
      if (error) throw error;
      return data as TeamMember | null;
    },
    enabled: !!user?.id,
  });

  // Check if user is super_admin/admin (they get all verticals)
  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles-vertical', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(d => d.role);
    },
    enabled: !!user?.id,
  });

  const isAdminUser = userRoles.includes('super_admin') || userRoles.includes('admin');

  // Super admins see all verticals, others see only assigned ones
  const availableVerticals = isAdminUser
    ? allVerticals
    : allVerticals.filter(v => userAccess.includes(v.id));

  return (
    <VerticalContext.Provider value={{
      activeVertical,
      setActiveVertical,
      availableVerticals,
      isLoading: verticalsLoading || accessLoading || memberLoading,
      teamMember,
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
