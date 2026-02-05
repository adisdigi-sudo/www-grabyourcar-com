import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { cn } from "@/lib/utils";
import { logAdminActivity } from "@/lib/adminActivityLogger";

// Admin Components
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LeadManagement } from "@/components/admin/LeadManagement";
import { HomepageManagement } from "@/components/admin/HomepageManagement";
import { HSRPManagement } from "@/components/admin/HSRPManagement";
import { CarDataManagement } from "@/components/admin/CarDataManagement";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { AIContentManagement } from "@/components/admin/AIContentManagement";
import { CarCatalogManagement } from "@/components/admin/CarCatalogManagement";
import { RentalManagement } from "@/components/admin/RentalManagement";
import { AccessoriesManagement } from "@/components/admin/AccessoriesManagement";
import { WebsiteSettings } from "@/components/admin/WebsiteSettings";
import { WhatsAppManagement } from "@/components/admin/WhatsAppManagement";
import { BlogManagement } from "@/components/admin/BlogManagement";

import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAdmin, roles } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Log admin dashboard access
  useEffect(() => {
    if (user && !isLoading) {
      logAdminActivity({ action: 'view_dashboard' });
    }
  }, [user, isLoading]);

  // Redirect if not authenticated
  if (!isLoading && !user) {
    // Check if on admin subdomain to use dedicated admin auth
    const isAdminSubdomain = window.location.hostname.startsWith("admin.");
    navigate(isAdminSubdomain ? '/admin-auth' : '/auth');
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check admin access - if no roles, allow access (for initial setup)
  const hasAdminAccess = roles.length === 0 || isAdmin();

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You don't have permission to access the admin panel.</p>
        <Button onClick={() => navigate('/')}>Go to Homepage</Button>
      </div>
    );
  }

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard />;
      
      // Lead Management
      case "leads-all":
      case "leads-hot":
      case "leads-whatsapp":
        return <LeadManagement />;
      
      // Car Catalog
      case "cars-list":
        return <CarCatalogManagement />;
      case "cars-images":
        return <CarCatalogManagement />;
      case "cars-variants":
        return <CarCatalogManagement />;
      case "cars-compare":
        return <CarCatalogManagement />;
      case "cars-migration":
        return <CarDataManagement />;
      case "cars-ai":
        return <AIContentManagement />;
      
      // Website Manager
      case "website-homepage":
        return <HomepageManagement />;
      case "website-banners":
        return <HomepageManagement />;
      case "website-menu":
        return <WebsiteSettings />;
      case "website-branding":
        return <WebsiteSettings />;
      case "website-seo":
        return <WebsiteSettings />;
      
      // Services
      case "services-hsrp":
        return <HSRPManagement />;
      case "services-rentals":
        return <RentalManagement />;
      case "services-insurance":
        return <WebsiteSettings />;
      case "services-loans":
        return <WebsiteSettings />;
      
      // E-Commerce
      case "ecommerce-accessories":
        return <AccessoriesManagement />;
      case "ecommerce-orders":
        return <AccessoriesManagement />;
      
      // Content
      case "content-blog":
        return <BlogManagement />;
      case "content-news":
        return <AIContentManagement />;
      case "content-ai":
        return <AIContentManagement />;
      
      // Integrations
      case "integrations-whatsapp":
        return <WhatsAppManagement />;
      case "integrations-payments":
        return <WebsiteSettings />;
      
      // User Management
      case "roles":
        return <RoleManagement />;
      case "settings":
        return <WebsiteSettings />;
      
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        "md:ml-64 p-6 pt-16 md:pt-6"
      )}>
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
