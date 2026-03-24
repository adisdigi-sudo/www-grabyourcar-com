import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { cn } from "@/lib/utils";
import { logAdminActivity } from "@/lib/adminActivityLogger";
import { Button } from "@/components/ui/button";
import { AdminRenderBoundary } from "@/components/admin/shared/AdminRenderBoundary";
import { Shield } from "lucide-react";

const AdminSidebar = lazy(() =>
  import("@/components/admin/AdminSidebar").then((module) => ({ default: module.AdminSidebar })),
);
const AdminDashboard = lazy(() =>
  import("@/components/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard })),
);
const LeadManagement = lazy(() =>
  import("@/components/admin/LeadManagement").then((module) => ({ default: module.LeadManagement })),
);
const HomepageManagement = lazy(() =>
  import("@/components/admin/HomepageManagement").then((module) => ({ default: module.HomepageManagement })),
);
const HSRPVerticalWorkspace = lazy(() =>
  import("@/components/admin/verticals/HSRPVerticalWorkspace").then((module) => ({ default: module.HSRPVerticalWorkspace })),
);
const SalesVerticalWorkspace = lazy(() =>
  import("@/components/admin/verticals/SalesVerticalWorkspace").then((module) => ({ default: module.SalesVerticalWorkspace })),
);
const SelfDriveWorkspace = lazy(() =>
  import("@/components/admin/rentals/SelfDriveWorkspace").then((module) => ({ default: module.SelfDriveWorkspace })),
);
const AccessoriesEcommerceWorkspace = lazy(() =>
  import("@/components/admin/accessories/AccessoriesEcommerceWorkspace").then((module) => ({ default: module.AccessoriesEcommerceWorkspace })),
);
const RTOSuitePage = lazy(() =>
  import("@/components/admin/d2c/RTOSuitePage").then((module) => ({ default: module.RTOSuitePage })),
);
const ReturnManagementPage = lazy(() =>
  import("@/components/admin/d2c/ReturnManagementPage").then((module) => ({ default: module.ReturnManagementPage })),
);
const CheckoutPageD2C = lazy(() =>
  import("@/components/admin/d2c/CheckoutPage").then((module) => ({ default: module.CheckoutPage })),
);
const OmniInboxPage = lazy(() =>
  import("@/components/admin/d2c/OmniInboxPage").then((module) => ({ default: module.OmniInboxPage })),
);
const WebsiteSettings = lazy(() =>
  import("@/components/admin/WebsiteSettings").then((module) => ({ default: module.WebsiteSettings })),
);
const AdTrackingSettings = lazy(() =>
  import("@/components/admin/AdTrackingSettings").then((module) => ({ default: module.AdTrackingSettings })),
);
const WhatsAppManagement = lazy(() =>
  import("@/components/admin/WhatsAppManagement").then((module) => ({ default: module.WhatsAppManagement })),
);
const BlogManagement = lazy(() =>
  import("@/components/admin/BlogManagement").then((module) => ({ default: module.BlogManagement })),
);
const NotificationCenter = lazy(() =>
  import("@/components/admin/NotificationCenter").then((module) => ({ default: module.NotificationCenter })),
);
const SEOBuilder = lazy(() =>
  import("@/components/admin/SEOBuilder").then((module) => ({ default: module.SEOBuilder })),
);
const BrandingSettings = lazy(() =>
  import("@/components/admin/BrandingSettings").then((module) => ({ default: module.BrandingSettings })),
);
const APIIntegrationPortal = lazy(() =>
  import("@/components/admin/APIIntegrationPortal").then((module) => ({ default: module.APIIntegrationPortal })),
);
const EmailMarketingManagement = lazy(() =>
  import("@/components/admin/EmailMarketingManagement").then((module) => ({ default: module.EmailMarketingManagement })),
);
const AIContentHub = lazy(() =>
  import("@/components/admin/AIContentHub").then((module) => ({ default: module.AIContentHub })),
);
const BulkDataManager = lazy(() =>
  import("@/components/admin/BulkDataManager").then((module) => ({ default: module.BulkDataManager })),
);
const WebsiteContentManagement = lazy(() =>
  import("@/components/admin/WebsiteContentManagement").then((module) => ({ default: module.WebsiteContentManagement })),
);
const SocialProofManagement = lazy(() =>
  import("@/components/admin/SocialProofManagement").then((module) => ({ default: module.SocialProofManagement })),
);
const IntegrationsManagement = lazy(() =>
  import("@/components/admin/IntegrationsManagement").then((module) => ({ default: module.IntegrationsManagement })),
);
const OffersManagement = lazy(() =>
  import("@/components/admin/OffersManagement").then((module) => ({ default: module.OffersManagement })),
);
const AutoIntelligenceSettings = lazy(() =>
  import("@/components/admin/AutoIntelligenceSettings").then((module) => ({ default: module.AutoIntelligenceSettings })),
);
const CrossSellManagement = lazy(() => import("@/components/admin/CrossSellManagement"));
const EMIPDFSettings = lazy(() => import("@/components/admin/EMIPDFSettings"));
const ManualQuoteGenerator = lazy(() =>
  import("@/components/admin/ManualQuoteGenerator").then((module) => ({ default: module.ManualQuoteGenerator })),
);
const ProfileSettings = lazy(() =>
  import("@/components/admin/ProfileSettings").then((module) => ({ default: module.ProfileSettings })),
);
const MarketingCommandCenter = lazy(() =>
  import("@/components/admin/marketing").then((module) => ({ default: module.MarketingCommandCenter })),
);
const HoliBulkShare = lazy(() =>
  import("@/components/admin/HoliBulkShare").then((module) => ({ default: module.HoliBulkShare })),
);
const DriverBookingsManagement = lazy(() => import("@/components/admin/DriverBookingsManagement"));
const APIPartnersManagement = lazy(() => import("@/components/admin/APIPartnersManagement"));
const DealerManagement = lazy(() =>
  import("@/components/admin/DealerManagement").then((module) => ({ default: module.DealerManagement })),
);
const SiteSettingsManager = lazy(() => import("@/components/admin/SiteSettingsManager"));
const BannersManager = lazy(() => import("@/components/admin/BannersManager"));
const TestimonialsManager = lazy(() => import("@/components/admin/TestimonialsManager"));
const FAQManager = lazy(() => import("@/components/admin/FAQManager"));
const ServicePricingManager = lazy(() => import("@/components/admin/ServicePricingManager"));
const HeroSlidesManagement = lazy(() =>
  import("@/components/admin/HeroSlidesManagement").then((module) => ({ default: module.HeroSlidesManagement })),
);
const RentalVerticalWorkspace = lazy(() =>
  import("@/components/admin/verticals/RentalVerticalWorkspace").then((module) => ({ default: module.RentalVerticalWorkspace })),
);
const FleetVerticalWorkspace = lazy(() =>
  import("@/components/admin/verticals/FleetVerticalWorkspace").then((module) => ({ default: module.FleetVerticalWorkspace })),
);
const PartnersManager = lazy(() => import("@/components/admin/PartnersManager"));
const InsuranceManagement = lazy(() =>
  import("@/components/admin/InsuranceManagement").then((module) => ({ default: module.InsuranceManagement })),
);
const InsuranceImportExport = lazy(() =>
  import("@/components/admin/insurance/InsuranceImportExport").then((module) => ({ default: module.InsuranceImportExport })),
);
const UnifiedCustomerProfile = lazy(() =>
  import("@/components/admin/unified/UnifiedCustomerProfile").then((module) => ({ default: module.UnifiedCustomerProfile })),
);
const CrossVerticalIntelligence = lazy(() =>
  import("@/components/admin/unified/CrossVerticalIntelligence").then((module) => ({ default: module.CrossVerticalIntelligence })),
);
const JourneyAutomationPanel = lazy(() =>
  import("@/components/admin/JourneyAutomationPanel").then((module) => ({ default: module.JourneyAutomationPanel })),
);
const RevenueIntelligenceDashboard = lazy(() =>
  import("@/components/admin/RevenueIntelligenceDashboard").then((module) => ({ default: module.RevenueIntelligenceDashboard })),
);
const LoanCRMDashboard = lazy(() =>
  import("@/components/admin/LoanCRMDashboard").then((module) => ({ default: module.LoanCRMDashboard })),
);
const LeadScoringDashboard = lazy(() =>
  import("@/components/admin/LeadScoringDashboard").then((module) => ({ default: module.LeadScoringDashboard })),
);
const ClientManagement = lazy(() =>
  import("@/components/admin/ClientManagement").then((module) => ({ default: module.ClientManagement })),
);
const LeadImportManager = lazy(() =>
  import("@/components/admin/LeadImportManager").then((module) => ({ default: module.LeadImportManager })),
);
const DataExportEngine = lazy(() =>
  import("@/components/admin/DataExportEngine").then((module) => ({ default: module.DataExportEngine })),
);
const SuperAdminUserManager = lazy(() =>
  import("@/components/admin/SuperAdminUserManager").then((module) => ({ default: module.SuperAdminUserManager })),
);
const UserManagementDashboard = lazy(() =>
  import("@/components/admin/UserManagementDashboard").then((module) => ({ default: module.UserManagementDashboard })),
);
const AIContentManagement = lazy(() =>
  import("@/components/admin/AIContentManagement").then((module) => ({ default: module.AIContentManagement })),
);
const DiscountManagement = lazy(() =>
  import("@/components/admin/DiscountManagement").then((module) => ({ default: module.DiscountManagement })),
);
const LaunchesManagement = lazy(() =>
  import("@/components/admin/LaunchesManagement").then((module) => ({ default: module.LaunchesManagement })),
);
const WhatsAppTemplateManager = lazy(() => import("@/components/admin/WhatsAppTemplateManager"));
const EmailAutomationManager = lazy(() => import("@/components/admin/EmailAutomationManager"));
const InsuranceDashboard = lazy(() =>
  import("@/components/admin/verticals/InsuranceDashboard").then((module) => ({ default: module.InsuranceDashboard })),
);
const SalesDashboard = lazy(() =>
  import("@/components/admin/verticals/SalesDashboard").then((module) => ({ default: module.SalesDashboard })),
);
const RentalDashboard = lazy(() =>
  import("@/components/admin/verticals/RentalDashboard").then((module) => ({ default: module.RentalDashboard })),
);
const HSRPDashboard = lazy(() =>
  import("@/components/admin/verticals/HSRPDashboard").then((module) => ({ default: module.HSRPDashboard })),
);
const AccessoriesDashboard = lazy(() =>
  import("@/components/admin/verticals/AccessoriesDashboard").then((module) => ({ default: module.AccessoriesDashboard })),
);
const MarketingDashboard = lazy(() =>
  import("@/components/admin/verticals/MarketingDashboard").then((module) => ({ default: module.MarketingDashboard })),
);
const CallingDashboard = lazy(() =>
  import("@/components/admin/calling/CallingDashboard").then((module) => ({ default: module.CallingDashboard })),
);
const ManagerDashboard = lazy(() =>
  import("@/components/admin/ManagerDashboard").then((module) => ({ default: module.ManagerDashboard })),
);
const TeamEngagement = lazy(() => import("@/components/admin/TeamEngagement"));
const ErrorPrevention = lazy(() => import("@/components/admin/ErrorPrevention"));
const WorkflowEngine = lazy(() => import("@/components/admin/WorkflowEngine"));
const AutomationCommandCenter = lazy(() => import("@/components/admin/AutomationCommandCenter"));
const LeadRoutingManager = lazy(() =>
  import("@/components/admin/LeadRoutingManager").then((module) => ({ default: module.LeadRoutingManager })),
);
// Accounts — Zoho Books-style unified workspace
const ZohoAccountsWorkspace = lazy(() => import("@/components/admin/finance/ZohoAccountsWorkspace").then(m => ({ default: m.ZohoAccountsWorkspace })));

// HR — Zoho People-style unified workspace
const ZohoHRWorkspace = lazy(() => import("@/components/admin/hr/ZohoHRWorkspace").then(m => ({ default: m.ZohoHRWorkspace })));
const CarDatabaseWorkspace = lazy(() =>
  import("@/components/admin/car-database/CarDatabaseWorkspace").then((module) => ({ default: module.CarDatabaseWorkspace })),
);
const OpenAPIPortal = lazy(() =>
  import("@/components/admin/OpenAPIPortal").then((module) => ({ default: module.OpenAPIPortal })),
);
const HREmployeeManagement = lazy(() =>
  import("@/components/admin/hr/HREmployeeManagement").then((module) => ({ default: module.HREmployeeManagement })),
);
const HROnboarding = lazy(() =>
  import("@/components/admin/hr/HROnboarding").then((module) => ({ default: module.HROnboarding })),
);
const HRKPIManagement = lazy(() =>
  import("@/components/admin/hr/HRKPIManagement").then((module) => ({ default: module.HRKPIManagement })),
);
const HRTemplates = lazy(() =>
  import("@/components/admin/hr/HRTemplates").then((module) => ({ default: module.HRTemplates })),
);
const CRMAssistant = lazy(() =>
  import("@/components/admin/CRMAssistant").then((module) => ({ default: module.CRMAssistant })),
);

const AdminPanelLoader = ({ className }: { className?: string }) => (
  <div className={cn("flex min-h-[240px] items-center justify-center", className)}>
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
  </div>
);

const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, isLoading, roles } = useAdminAuth();
  const { activeVertical } = useVerticalAccess();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useSessionTimeout(!isLoading && !!user);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (user && !isLoading) {
      logAdminActivity({ action: "view_dashboard" });
    }
  }, [user, isLoading]);

  if (!isLoading && !user) {
    return <Navigate to="/crm-auth" replace />;
  }

  if (!isLoading && user && !activeVertical) {
    return <Navigate to="/workspace" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hasAdminAccess = roles.length > 0;

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4 text-center">You don't have permission to access the admin panel.</p>
        <Button onClick={() => navigate("/")}>Go to Homepage</Button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": {
        const slug = activeVertical?.slug;
        if (slug === "insurance") return <InsuranceDashboard onNavigate={setActiveTab} />;
        if (slug === "sales") return <SalesVerticalWorkspace />;
        if (slug === "rental") return <RentalVerticalWorkspace />;
        if (slug === "hsrp") return <HSRPVerticalWorkspace />;
        if (slug === "corporate" || slug === "fleet") return <FleetVerticalWorkspace />;
        if (slug === "accessories") return <AccessoriesEcommerceWorkspace />;
        if (slug === "marketing") return <MarketingDashboard onNavigate={setActiveTab} />;
        if (slug === "loans") return <LoanCRMDashboard />;
        if (slug === "accounts") return <ZohoAccountsWorkspace />;
        if (slug === "hr") return <HRCoreModule />;
        return <AdminDashboard />;
      }
      case "sales-crm":
        return <SalesVerticalWorkspace />;
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
          sales: "car_inquiry",
          insurance: "insurance",
          loans: "finance",
          hsrp: "hsrp",
          rental: "rental",
          accessories: "accessories",
          corporate: "corporate",
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
      case "services-loans-pipeline":
        return <LoanCRMDashboard initialView="pipeline" />;
      case "services-loans-disbursement":
        return <LoanCRMDashboard initialView="disbursement" />;
      case "services-loans-after-sales":
        return <LoanCRMDashboard initialView="after_sales" />;
      case "services-loans-bulk":
        return <LoanCRMDashboard initialView="bulk_tools" />;
      case "services-emi-calculator":
        return <LoanCRMDashboard initialView="emi_calculator" />;
      case "services-emi-pdf":
        return <EMIPDFSettings />;
      case "services-discounts":
        return <DiscountManagement />;
      case "services-quote-generator":
        return <ManualQuoteGenerator />;
      case "ecommerce-accessories":
      case "ecommerce-orders":
        return <AccessoriesEcommerceWorkspace />;
      case "ecommerce-crosssell":
        return <CrossSellManagement />;
      case "d2c-rto":
        return <RTOSuitePage />;
      case "d2c-returns":
        return <ReturnManagementPage />;
      case "d2c-checkout":
        return <CheckoutPageD2C />;
      case "d2c-inbox":
        return <OmniInboxPage />;
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
      case "integrations-ad-tracking":
        return <AdTrackingSettings />;
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
      // ── Accounts (Zoho Books style) ──
      case "accounts-dashboard":
      case "accounts-invoices":
      case "accounts-expenses":
      case "accounts-bills":
      case "accounts-banking":
      case "accounts-chart":
      case "accounts-journal":
      case "accounts-reports":
      case "accounts-documents":
        return <ZohoAccountsWorkspace />;
      // ── HR (Zoho People-style unified workspace) ──
      case "hr-core":
      case "hr-recruitment":
      case "hr-workforce":
      case "hr-attendance":
      case "hr-payroll":
      case "hr-expense":
      case "hr-performance":
      case "hr-engagement":
      case "hr-assets":
      case "hr-helpdesk":
        return <ZohoHRWorkspace />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Suspense fallback={<AdminPanelLoader className="min-h-screen" />}>
        <AdminRenderBoundary contextLabel="CRM sidebar">
          <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </AdminRenderBoundary>
      </Suspense>

      <div className={cn("fixed z-50", isMobile ? "top-3 right-3" : "top-4 right-4 md:right-6")}>
        <Suspense fallback={null}>
          <AdminRenderBoundary fallback={null} contextLabel="Notifications center">
            <NotificationCenter />
          </AdminRenderBoundary>
        </Suspense>
      </div>

      <main
        className={cn(
          "transition-all duration-300 min-h-screen",
          isMobile && "ml-0 pt-16 px-3 pb-4",
          isTablet && "ml-16 p-4 pt-4",
          !isMobile && !isTablet && "md:ml-64 p-6",
        )}
      >
        <div
          className={cn(
            "mx-auto",
            isMobile
              ? "max-w-full"
              : [
                    "services-insurance",
                    "services-insurance-import",
                    "services-loans-pipeline",
                    "services-loans-disbursement",
                    "services-loans-after-sales",
                    "services-loans-bulk",
                    "sales-crm",
                    "loan-crm",
                    "rental-crm",
                    "hsrp-crm",
                    "calling-system",
                    "manager-dashboard",
                  ].includes(activeTab)
                ? "max-w-full"
                : "max-w-7xl",
          )}
        >
          <AdminRenderBoundary
            key={`${activeVertical?.id ?? "no-vertical"}:${activeTab}`}
            contextLabel="CRM workspace"
          >
            <Suspense fallback={<AdminPanelLoader />}>
              {renderContent()}
            </Suspense>
          </AdminRenderBoundary>
        </div>
      </main>

      <Suspense fallback={null}>
        <AdminRenderBoundary fallback={null} contextLabel="CRM assistant">
          <CRMAssistant />
        </AdminRenderBoundary>
      </Suspense>
    </div>
  );
};

export default AdminLayout;
