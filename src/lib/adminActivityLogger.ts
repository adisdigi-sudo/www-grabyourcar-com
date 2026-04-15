import { supabase } from "@/integrations/supabase/client";

export type AdminAction = 
  | 'login'
  | 'logout'
  | 'view_dashboard'
  | 'view_leads'
  | 'update_lead'
  | 'assign_lead'
  | 'view_hsrp_bookings'
  | 'update_hsrp_booking'
  | 'update_homepage'
  | 'manage_roles'
  | 'assign_role'
  | 'remove_role'
  | 'migrate_data'
  | 'enhance_car_data'
  | 'validate_data';

export interface LogActivityParams {
  action: AdminAction;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log admin activity for security auditing
 */
export const logAdminActivity = async ({
  action,
  resourceType,
  resourceId,
  details,
}: LogActivityParams): Promise<void> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    
    if (!user) {
      console.warn('Attempted to log admin activity without authenticated user');
      return;
    }

    // Use type assertion to work around types not being regenerated yet
    await (supabase as any)
      .from('admin_activity_logs')
      .insert({
        user_id: user.id,
        user_email: user.email,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: details ? JSON.stringify(details) : null,
        user_agent: navigator.userAgent,
      });
  } catch (error) {
    // Don't throw - logging should not break the app
    console.error('Failed to log admin activity:', error);
  }
};

/**
 * Log admin login event
 */
export const logAdminLogin = () => logAdminActivity({ action: 'login' });

/**
 * Log admin logout event  
 */
export const logAdminLogout = () => logAdminActivity({ action: 'logout' });
