import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVerticalAccess, BusinessVertical } from "@/hooks/useVerticalAccess";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Banknote, Car, Key, CreditCard, ShoppingBag, Megaphone, LogOut, Crown, Lock } from "lucide-react";
import { motion } from "framer-motion";
import logoImage from "@/assets/logo-grabyourcar-main.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerticalPasswordDialog, getVerifiedVerticals } from "@/components/admin/VerticalPasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { performSafePreviewReload } from "@/lib/chunkLoadRecovery";
import { withPreviewParams } from "@/lib/previewRouting";

const iconMap: Record<string, React.ElementType> = {
  Shield,
  Banknote,
  Car,
  Key,
  CreditCard,
  ShoppingBag,
  Megaphone,
};

const WORKSPACE_BOOTSTRAP_TIMEOUT_MS = 12000;

const WorkspaceSelector = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, initialized: authInitialized, signOut } = useAuth();
  const { availableVerticals, setActiveVertical, isLoading: verticalLoading, teamMember } = useVerticalAccess();
  const { isSuperAdmin, isAdmin } = useAdminAuth();

  const [passwordTarget, setPasswordTarget] = useState<BusinessVertical | null>(null);
  const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false);
  const isBootstrapping = !authInitialized || authLoading || verticalLoading;

  useEffect(() => {
    if (!isBootstrapping) {
      setBootstrapTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => {
      console.error("[WorkspaceSelector] Workspace bootstrap timed out", {
        authInitialized,
        authLoading,
        verticalLoading,
        hasUser: !!user,
      });
      setBootstrapTimedOut(true);
    }, WORKSPACE_BOOTSTRAP_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [authInitialized, authLoading, verticalLoading, user, isBootstrapping]);

  // Fetch which verticals have passwords set (for lock icon display)
  // Note: actual password is server-side only (admin-only column).
  const { data: verticalPasswords = {} } = useQuery({
    queryKey: ["vertical-passwords-check"],
    queryFn: async () => {
      // Super admins/admins bypass password
      if (isAdmin()) return {};
      const { data } = await supabase
        .from("business_verticals")
        .select("id, has_vertical_password")
        .eq("is_active", true);
      const map: Record<string, boolean> = {};
      (data || []).forEach((v: any) => {
        if (v.has_vertical_password) map[v.id] = true;
      });
      return map;
    },
    enabled: !!user?.id,
  });

  const sortedVerticals = useMemo(
    () => [...availableVerticals].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)),
    [availableVerticals],
  );

  useEffect(() => {
    if (authInitialized && !authLoading && !user) {
      navigate(withPreviewParams("/crm-auth"));
    }
  }, [user, authLoading, authInitialized, navigate]);

  // If only 1 vertical available, auto-select it (skip password for single vertical)
  useEffect(() => {
    if (!authLoading && !verticalLoading && user && sortedVerticals.length === 1) {
      const v = sortedVerticals[0];
      const hasPassword = verticalPasswords[v.id];
      const alreadyVerified = getVerifiedVerticals().includes(v.id);
      if (!hasPassword || alreadyVerified || isAdmin()) {
        setActiveVertical(v);
        navigate(withPreviewParams("/crm"));
      }
    }
  }, [authLoading, verticalLoading, user, sortedVerticals, setActiveVertical, navigate, verticalPasswords]);

  const handleSelectVertical = (vertical: BusinessVertical) => {
    const hasPassword = verticalPasswords[vertical.id];
    const alreadyVerified = getVerifiedVerticals().includes(vertical.id);
    
    if (hasPassword && !alreadyVerified && !isAdmin()) {
      setPasswordTarget(vertical);
      return;
    }
    
    setActiveVertical(vertical);
    navigate(withPreviewParams("/crm"));
  };

  const handlePasswordSuccess = (vertical: BusinessVertical) => {
    setPasswordTarget(null);
    setActiveVertical(vertical);
    navigate(withPreviewParams("/crm"));
  };

  const handleLogout = async () => {
    await signOut();
    navigate(withPreviewParams("/crm-auth"));
  };

  if (isBootstrapping) {
    if (bootstrapTimedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4">
          <Card className="w-full max-w-lg p-8 text-center border-border/60 shadow-xl shadow-primary/5">
            <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Workspace load ruk gaya</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Login ya workspace sync hang ho gaya tha. Blank screen ke bajaye recovery options dikh rahe hain.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={performSafePreviewReload}>Retry</Button>
              <Button variant="outline" onClick={() => navigate(withPreviewParams("/crm-auth"))}>
                Back to sign in
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  const displayName = teamMember?.display_name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Theme Toggle - top right */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <img src={logoImage} alt="Grabyourcar" className="h-12 mx-auto mb-4 dark:invert" />
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              Welcome, {displayName}
            </h1>
            <p className="text-muted-foreground mt-2">Select your workspace to continue</p>
            {isSuperAdmin() && (
              <Badge className="mt-2 border-border bg-secondary text-secondary-foreground">
                <Crown className="h-3 w-3 mr-1" />
                Super Admin
              </Badge>
            )}
          </motion.div>

          {/* Vertical Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {sortedVerticals.map((vertical, i) => {
              const Icon = iconMap[vertical.icon || "Shield"] || Shield;
              const hasPassword = verticalPasswords[vertical.id] && !isAdmin();
              const isVerified = getVerifiedVerticals().includes(vertical.id);
              return (
                <motion.div
                  key={vertical.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * i }}
                >
                  <Card
                    className="p-6 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200 group border-border/50 relative"
                    onClick={() => handleSelectVertical(vertical)}
                  >
                    {hasPassword && !isVerified && (
                      <Lock className="absolute top-3 right-3 h-4 w-4 text-muted-foreground" />
                    )}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${vertical.color}15` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: vertical.color || '#3B82F6' }} />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">{vertical.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {vertical.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {sortedVerticals.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Workspaces Assigned</h3>
              <p className="text-muted-foreground mt-2">
                Contact your Super Admin to get access to a business vertical.
              </p>
            </div>
          )}

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </motion.div>
        </div>
      </div>

      <VerticalPasswordDialog
        vertical={passwordTarget}
        open={!!passwordTarget}
        onClose={() => setPasswordTarget(null)}
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
};

export default WorkspaceSelector;
