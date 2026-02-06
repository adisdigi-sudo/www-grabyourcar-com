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
import { UnifiedCarManagement } from "@/components/admin/UnifiedCarManagement";
import { RentalManagement } from "@/components/admin/RentalManagement";
import { AccessoriesManagement } from "@/components/admin/AccessoriesManagement";
import { WebsiteSettings } from "@/components/admin/WebsiteSettings";
import { WhatsAppManagement } from "@/components/admin/WhatsAppManagement";
import { BlogManagement } from "@/components/admin/BlogManagement";
import { NotificationCenter } from "@/components/admin/NotificationCenter";
import { SEOBuilder } from "@/components/admin/SEOBuilder";
import { BrandingSettings } from "@/components/admin/BrandingSettings";
// VariantPricingManagement consolidated into UnifiedCarManagement
import { APIIntegrationPortal } from "@/components/admin/APIIntegrationPortal";
import { EmailMarketingManagement } from "@/components/admin/EmailMarketingManagement";
import { AIContentHub } from "@/components/admin/AIContentHub";
import { BulkDataManager } from "@/components/admin/BulkDataManager";
import { ServiceCategoriesManager } from "@/components/admin/ServiceCategoriesManager";
import { WebsiteContentManagement } from "@/components/admin/WebsiteContentManagement";
import { SocialProofManagement } from "@/components/admin/SocialProofManagement";
import { IntegrationsManagement } from "@/components/admin/IntegrationsManagement";
import { OffersManagement } from "@/components/admin/OffersManagement";
import { AutoIntelligenceSettings } from "@/components/admin/AutoIntelligenceSettings";
import CrossSellManagement from "@/components/admin/CrossSellManagement";
import EMIPDFSettings from "@/components/admin/EMIPDFSettings";
import { CarColorManagement } from "@/components/admin/CarColorManagement";
import { CarImageSyncManager } from "@/components/admin/CarImageSyncManager";
import { ManualQuoteGenerator } from "@/components/admin/ManualQuoteGenerator";
import { DiscountManagement } from "@/components/admin/DiscountManagement";
import { LaunchesManagement } from "@/components/admin/LaunchesManagement";
import { ProfileSettings } from "@/components/admin/ProfileSettings";
import { TeamUserManagement } from "@/components/admin/TeamUserManagement";
import { AICarEntryGenerator } from "@/components/admin/AICarEntryGenerator";
import BulkCarUploader from "@/components/admin/BulkCarUploader";
import WhatsAppTemplateManager from "@/components/admin/WhatsAppTemplateManager";
import EmailAutomationManager from "@/components/admin/EmailAutomationManager";
import StateCityPricingManager from "@/components/admin/StateCityPricingManager";
import { MarketingCommandCenter } from "@/components/admin/marketing";
import VehicleAttributesManager from "@/components/admin/VehicleAttributesManager";
import DriverBookingsManagement from "@/components/admin/DriverBookingsManagement";
import APIPartnersManagement from "@/components/admin/APIPartnersManagement";
import BrandsManagement from "@/components/admin/BrandsManagement";
import QuickTextImporter from "@/components/admin/QuickTextImporter";

import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAdmin, roles } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Handle responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Log admin dashboard access
  useEffect(() => {
    if (user && !isLoading) {
      logAdminActivity({ action: 'view_dashboard' });
    }
  }, [user, isLoading]);

  // Redirect if not authenticated
  if (!isLoading && !user) {
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

  // Check admin access
  const hasAdminAccess = roles.length === 0 || isAdmin();

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4 text-center">You don't have permission to access the admin panel.</p>
        <Button onClick={() => navigate('/')}>Go to Homepage</Button>
      </div>
    );
  }

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard />;
      case "leads-all":
      case "leads-hot":
      case "leads-whatsapp":
        return <LeadManagement />;
      case "cars-list":
      case "cars-variants":
      case "cars-specs":
      case "cars-pricing":
      case "cars-compare":
        return <UnifiedCarManagement />;
      case "cars-colors":
        return <CarColorManagement />;
      case "cars-images":
        return <CarImageSyncManager />;
      case "cars-image-sync":
        return <CarImageSyncManager />;
      case "cars-migration":
        return <CarDataManagement />;
      case "cars-brands":
        return <BrandsManagement />;
      case "cars-ai-entry":
        return <AICarEntryGenerator />;
      case "cars-bulk-import":
        return <BulkCarUploader />;
      case "cars-quick-import":
        return <QuickTextImporter />;
      case "cars-city-pricing":
        return <StateCityPricingManager />;
      case "cars-attributes":
        return <VehicleAttributesManager />;
      case "cars-ai":
        return <AIContentManagement />;
      case "website-homepage":
        return <HomepageManagement />;
      case "website-content":
        return <WebsiteContentManagement />;
      case "website-banners":
        return <ServiceCategoriesManager />;
      case "website-offers":
        return <OffersManagement />;
      case "website-branding":
        return <BrandingSettings />;
      case "website-seo":
        return <SEOBuilder />;
      case "socialproof-reviews":
      case "socialproof-stories":
        return <SocialProofManagement />;
      case "services-hsrp":
        return <HSRPManagement />;
      case "services-rentals":
        return <RentalManagement />;
      case "services-driver-bookings":
        return <DriverBookingsManagement />;
      case "services-api-partners":
        return <APIPartnersManagement />;
      case "services-insurance":
      case "services-loans":
        return <WebsiteSettings />;
      case "services-emi-pdf":
        return <EMIPDFSettings />;
      case "services-discounts":
        return <DiscountManagement />;
      case "services-quote-generator":
        return <ManualQuoteGenerator />;
      case "ecommerce-accessories":
      case "ecommerce-orders":
        return <AccessoriesManagement />;
      case "ecommerce-crosssell":
        return <CrossSellManagement />;
      case "content-blog":
        return <BlogManagement />;
      case "content-news":
        return <AIContentManagement />;
      case "content-launches":
        return <LaunchesManagement />;
      case "content-ai":
        return <AIContentHub />;
      case "content-intelligence":
        return <AutoIntelligenceSettings />;
      case "marketing-command":
        return <MarketingCommandCenter />;
      case "marketing-email":
        return <EmailMarketingManagement />;
      case "marketing-bulk":
        return <BulkDataManager />;
      case "integrations-api":
        return <APIIntegrationPortal />;
      case "integrations-whatsapp":
        return <WhatsAppManagement />;
      case "marketing-templates":
        return <WhatsAppTemplateManager />;
      case "marketing-automation":
        return <EmailAutomationManager />;
      case "integrations-shipping":
        return <IntegrationsManagement />;
      case "integrations-payments":
        return <WebsiteSettings />;
      case "profile-business":
      case "profile-logo":
      case "profile-users":
      case "profile-contact":
      case "profile-otp":
        return <ProfileSettings />;
      case "roles":
        return <TeamUserManagement />;
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

      {/* Notification Bell - Responsive positioning */}
      <div className={cn(
        "fixed z-50",
        isMobile ? "top-3 right-3" : "top-4 right-4 md:right-6"
      )}>
        <NotificationCenter />
      </div>

      {/* Main Content - Responsive margins and padding */}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        // Mobile: no left margin, top padding for header
        isMobile && "ml-0 pt-16 px-3 pb-4",
        // Tablet: collapsed sidebar width
        isTablet && "ml-16 p-4 pt-4",
        // Desktop: full sidebar width
        !isMobile && !isTablet && "md:ml-64 p-6"
      )}>
        <div className={cn(
          "mx-auto",
          // Responsive max-width
          isMobile ? "max-w-full" : "max-w-7xl"
        )}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
