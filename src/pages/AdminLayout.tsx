import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { cn } from "@/lib/utils";
import { logAdminActivity } from "@/lib/adminActivityLogger";

// Admin Components
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LeadManagement } from "@/components/admin/LeadManagement";
import { HomepageManagement } from "@/components/admin/HomepageManagement";
import { HSRPVerticalWorkspace } from "@/components/admin/verticals/HSRPVerticalWorkspace";
import { SalesWorkspace } from "@/components/admin/sales/SalesWorkspace";
import { CarDataManagement } from "@/components/admin/CarDataManagement";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { AIContentManagement } from "@/components/admin/AIContentManagement";
import { UnifiedCarManagement } from "@/components/admin/UnifiedCarManagement";
import { RentalManagement } from "@/components/admin/RentalManagement";
import { SelfDriveWorkspace } from "@/components/admin/rentals/SelfDriveWorkspace";
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
import { CarImageScrapingManager } from "@/components/admin/CarImageScrapingManager";
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
import { HoliBulkShare } from "@/components/admin/HoliBulkShare";
import VehicleAttributesManager from "@/components/admin/VehicleAttributesManager";
import DriverBookingsManagement from "@/components/admin/DriverBookingsManagement";
import APIPartnersManagement from "@/components/admin/APIPartnersManagement";
import { DealerManagement } from "@/components/admin/DealerManagement";
import BrandsManagement from "@/components/admin/BrandsManagement";
import QuickTextImporter from "@/components/admin/QuickTextImporter";
import URLDataScraper from "@/components/admin/URLDataScraper";
import SiteSettingsManager from "@/components/admin/SiteSettingsManager";
import BannersManager from "@/components/admin/BannersManager";
import TestimonialsManager from "@/components/admin/TestimonialsManager";
import FAQManager from "@/components/admin/FAQManager";
import ServicePricingManager from "@/components/admin/ServicePricingManager";
import { HeroSlidesManagement } from "@/components/admin/HeroSlidesManagement";
import PartnersManager from "@/components/admin/PartnersManager";
import { InsuranceManagement } from "@/components/admin/InsuranceManagement";
import { InsuranceImportExport } from "@/components/admin/insurance/InsuranceImportExport";
import { UnifiedMasterCRM } from "@/components/admin/UnifiedMasterCRM";
import { UnifiedCustomerProfile } from "@/components/admin/unified/UnifiedCustomerProfile";
import { CrossVerticalIntelligence } from "@/components/admin/unified/CrossVerticalIntelligence";
import { JourneyAutomationPanel } from "@/components/admin/JourneyAutomationPanel";
import { RevenueIntelligenceDashboard } from "@/components/admin/RevenueIntelligenceDashboard";
import { LoanCRMDashboard } from "@/components/admin/LoanCRMDashboard";
import { LeadScoringDashboard } from "@/components/admin/LeadScoringDashboard";
import { ClientManagement } from "@/components/admin/ClientManagement";
import { LeadImportManager } from "@/components/admin/LeadImportManager";
import { DataExportEngine } from "@/components/admin/DataExportEngine";
import { SuperAdminUserManager } from "@/components/admin/SuperAdminUserManager";
import { UserManagementDashboard } from "@/components/admin/UserManagementDashboard";
import { InsuranceDashboard } from "@/components/admin/verticals/InsuranceDashboard";
import { SalesDashboard } from "@/components/admin/verticals/SalesDashboard";
import { RentalDashboard } from "@/components/admin/verticals/RentalDashboard";
import { HSRPDashboard } from "@/components/admin/verticals/HSRPDashboard";
import { AccessoriesDashboard } from "@/components/admin/verticals/AccessoriesDashboard";
import { MarketingDashboard } from "@/components/admin/verticals/MarketingDashboard";
import { CallingDashboard } from "@/components/admin/calling/CallingDashboard";
import { ManagerDashboard } from "@/components/admin/ManagerDashboard";
import TeamEngagement from "@/components/admin/TeamEngagement";
import ErrorPrevention from "@/components/admin/ErrorPrevention";
import WorkflowEngine from "@/components/admin/WorkflowEngine";
import AutomationCommandCenter from "@/components/admin/AutomationCommandCenter";
import { LeadRoutingManager } from "@/components/admin/LeadRoutingManager";
import { AccountsFinanceWorkspace } from "@/components/admin/finance/AccountsFinanceWorkspace";
import { HRWorkspace } from "@/components/admin/hr/HRWorkspace";
import { CarDatabaseWorkspace } from "@/components/admin/car-database/CarDatabaseWorkspace";
import { OpenAPIPortal } from "@/components/admin/OpenAPIPortal";
import SuperAdminIncentiveWorkspace from "@/components/admin/incentives/SuperAdminIncentiveWorkspace";
import { HREmployeeManagement } from "@/components/admin/hr/HREmployeeManagement";
import { HROnboarding } from "@/components/admin/hr/HROnboarding";
import { HRKPIManagement } from "@/components/admin/hr/HRKPIManagement";
import { HRTemplates } from "@/components/admin/hr/HRTemplates";
import { DocumentVault } from "@/components/admin/documents/DocumentVault";
import { SalesIncentiveDashboard } from "@/components/admin/incentives/SalesIncentiveDashboard";
import { IncentivePayoutApproval } from "@/components/admin/finance/IncentivePayoutApproval";
import { DealsPipeline } from "@/components/admin/deals/DealsPipeline";
import { CRMAssistant } from "@/components/admin/CRMAssistant";

import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAdmin, roles } = useAdminAuth();
  const { activeVertical } = useVerticalAccess();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(false);

  // Auto-logout after 10 minutes of inactivity
  useSessionTimeout(!isLoading && !!user);
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
    return <Navigate to="/crm-auth" replace />;
  }

  // Redirect to workspace selector if no vertical selected
  if (!isLoading && user && !activeVertical) {
    return <Navigate to="/workspace" replace />;
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
  const hasAdminAccess = roles.length > 0;

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
      case "dashboard": {
        const slug = activeVertical?.slug;
        if (slug === "insurance") return <InsuranceDashboard onNavigate={setActiveTab} />;
        if (slug === "sales") return <SalesDashboard onNavigate={setActiveTab} />;
        if (slug === "rental") return <RentalDashboard onNavigate={setActiveTab} />;
        if (slug === "hsrp") return <HSRPDashboard onNavigate={setActiveTab} />;
        if (slug === "accessories") return <AccessoriesDashboard />;
        if (slug === "marketing") return <MarketingDashboard onNavigate={setActiveTab} />;
        if (slug === "loans") return <LoanCRMDashboard />;
        if (slug === "accounts") return <AccountsFinanceWorkspace />;
        if (slug === "hr") return <HRWorkspace />;
        return <AdminDashboard />;
      }
      case "sales-crm":
        return <SalesWorkspace />;
      case "loan-crm":
        return <LoanCRMDashboard />;
      case "unified-crm":
        return <UnifiedCustomerProfile />;
      case "unified-intelligence":
        return <CrossVerticalIntelligence />;
      case "journey-automation":
        return <JourneyAutomationPanel />;
      case "revenue-intelligence":
        return <RevenueIntelligenceDashboard />;
      case "lead-scoring":
        return <LeadScoringDashboard />;
      case "client-management":
        return <ClientManagement verticalSlug={activeVertical?.slug} />;
      case "lead-import": {
        const importVerticalMap: Record<string, string> = {
          sales: "car_inquiry", insurance: "insurance", loans: "finance",
          hsrp: "hsrp", rental: "rental", accessories: "accessories", corporate: "corporate",
        };
        const importCat = activeVertical?.slug ? importVerticalMap[activeVertical.slug] : undefined;
        return <LeadImportManager verticalCategory={importCat} />;
      }
      case "data-export":
        return <DataExportEngine verticalSlug={activeVertical?.slug} />;
      case "leads-all":
      case "leads-hot":
      case "leads-whatsapp": {
        const verticalSlugMap: Record<string, string> = {
          sales: "car_inquiry",
          insurance: "insurance",
          loans: "finance",
          hsrp: "hsrp",
          rental: "rental",
          accessories: "accessories",
          corporate: "corporate",
        };
        const verticalCat = activeVertical?.slug ? verticalSlugMap[activeVertical.slug] : undefined;
        return <LeadManagement verticalCategory={verticalCat} />;
      }
      case "cars-workspace":
      case "cars-list":
      case "cars-variants":
      case "cars-specs":
      case "cars-pricing":
      case "cars-compare":
      case "cars-colors":
      case "cars-images":
      case "cars-image-sync":
      case "cars-migration":
      case "cars-brands":
      case "cars-ai-entry":
      case "cars-bulk-import":
      case "cars-quick-import":
      case "cars-city-pricing":
      case "cars-attributes":
      case "cars-ai":
      case "cars-url-scraper":
        return <CarDatabaseWorkspace />;
      case "website-homepage":
        return (
          <div className="space-y-6">
            <HeroSlidesManagement />
            <HomepageManagement />
          </div>
        );
      case "website-content":
        return <WebsiteContentManagement />;
      case "website-banners":
        return <BannersManager />;
      case "website-offers":
        return <OffersManagement />;
      case "website-branding":
        return <BrandingSettings />;
      case "website-testimonials":
        return <TestimonialsManager />;
      case "website-faqs":
        return <FAQManager />;
      case "website-seo":
        return <SEOBuilder />;
      case "socialproof-reviews":
      case "socialproof-stories":
        return <SocialProofManagement />;
      case "services-hsrp":
        return <HSRPVerticalWorkspace />;
      case "services-rentals":
        return <SelfDriveWorkspace />;
      case "services-driver-bookings":
        return <DriverBookingsManagement />;
      case "services-api-partners":
        return <APIPartnersManagement />;
      case "services-insurance":
        return <InsuranceManagement />;
      case "services-insurance-import":
        return <InsuranceImportExport />;
      case "services-loans":
        return <LoanCRMDashboard />;
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
      case "holi-share":
        return <HoliBulkShare />;
      case "marketing-email":
        return <EmailMarketingManagement />;
      case "marketing-bulk":
        return <BulkDataManager />;
      case "integrations-api":
        return <APIIntegrationPortal />;
      case "open-api-portal":
        return <OpenAPIPortal />;
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
        return <SuperAdminUserManager />;
      case "team-management":
        return <UserManagementDashboard />;
      case "settings":
        return <SiteSettingsManager />;
      case "services-pricing":
        return <ServicePricingManager />;
      case "services-partners":
        return <PartnersManager />;
      case "calling-system":
        return <CallingDashboard />;
      case "manager-dashboard":
        return <ManagerDashboard />;
      case "team-engagement":
        return <TeamEngagement />;
      case "error-prevention":
        return <ErrorPrevention />;
      case "workflow-engine":
        return <WorkflowEngine />;
      case "automation-center":
        return <AutomationCommandCenter />;
      case "lead-routing":
        return <LeadRoutingManager />;
      case "dealer-inquiry":
        return <DealerManagement initialTab="inquiry" />;
      case "dealer-companies":
        return <DealerManagement initialTab="companies" />;
      case "dealer-reps":
        return <DealerManagement initialTab="reps" />;
      case "dealer-inventory":
        return <DealerManagement initialTab="inventory" />;
      case "dealer-broadcast":
        return <DealerManagement initialTab="broadcast" />;
      case "accounts-finance":
        return <AccountsFinanceWorkspace initialTab="overview" />;
      case "accounts-revenue":
        return <AccountsFinanceWorkspace initialTab="revenue" />;
      case "accounts-expenses":
        return <AccountsFinanceWorkspace initialTab="expenses" />;
      case "accounts-commissions":
        return <AccountsFinanceWorkspace initialTab="commissions" />;
      case "accounts-payouts":
        return <AccountsFinanceWorkspace initialTab="payouts" />;
      case "hr-workspace":
        return <HRWorkspace initialTab="overview" />;
      case "hr-directory":
        return <HRWorkspace initialTab="directory" />;
      case "hr-attendance":
        return <HRWorkspace initialTab="attendance" />;
      case "hr-leaves":
        return <HRWorkspace initialTab="leaves" />;
      case "hr-announcements":
        return <HRWorkspace initialTab="culture" />;
      case "incentive-management":
        return <SuperAdminIncentiveWorkspace />;
      case "incentive-my-dashboard":
        return <SalesIncentiveDashboard />;
      case "hr-employees":
        return <HREmployeeManagement />;
      case "hr-onboarding":
        return <HROnboarding />;
      case "hr-kpi":
        return <HRKPIManagement />;
      case "hr-templates":
        return <HRTemplates />;
      case "hr-documents":
      case "accounts-documents":
      case "document-vault":
        return <DocumentVault />;
      case "accounts-incentive-payouts":
        return <IncentivePayoutApproval />;
      case "deals-pipeline":
        return <DealsPipeline />;
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
