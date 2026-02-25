import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVerticalAccess, BusinessVertical } from "@/hooks/useVerticalAccess";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Banknote, Car, Key, CreditCard, ShoppingBag, Megaphone, LogOut, Crown } from "lucide-react";
import { motion } from "framer-motion";
import logoImage from "@/assets/logo-grabyourcar-main.png";
import { ThemeToggle } from "@/components/ThemeToggle";

const iconMap: Record<string, React.ElementType> = {
  Shield,
  Banknote,
  Car,
  Key,
  CreditCard,
  ShoppingBag,
  Megaphone,
};

const WorkspaceSelector = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { availableVerticals, setActiveVertical, isLoading: verticalLoading, teamMember } = useVerticalAccess();
  const { isSuperAdmin } = useAdminAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin-auth");
    }
  }, [user, authLoading, navigate]);

  // If only 1 vertical available, auto-select it
  useEffect(() => {
    if (!authLoading && !verticalLoading && user && availableVerticals.length === 1) {
      setActiveVertical(availableVerticals[0]);
      navigate("/crm");
    }
  }, [authLoading, verticalLoading, user, availableVerticals]);

  const handleSelectVertical = (vertical: BusinessVertical) => {
    setActiveVertical(vertical);
    navigate("/crm");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/admin-auth");
  };

  if (authLoading || verticalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <Badge className="mt-2 bg-amber-500/10 text-amber-600 border-amber-500/20">
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
            {availableVerticals.map((vertical, i) => {
              const Icon = iconMap[vertical.icon || "Shield"] || Shield;
              return (
                <motion.div
                  key={vertical.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * i }}
                >
                  <Card
                    className="p-6 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200 group border-border/50"
                    onClick={() => handleSelectVertical(vertical)}
                  >
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

          {availableVerticals.length === 0 && (
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
    </div>
  );
};

export default WorkspaceSelector;
