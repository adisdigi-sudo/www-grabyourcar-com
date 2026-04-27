import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminSubdomainRouter } from "@/components/AdminSubdomainRouter";
import { AdminRenderBoundary } from "@/components/admin/shared/AdminRenderBoundary";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";
import { usePageViewTracking } from "@/hooks/usePageViewTracking";
import { scheduleChunkLoadRecoveryReset } from "@/lib/chunkLoadRecovery";
import { withPreviewParams } from "@/lib/previewRouting";
import { RouteProviderGate } from "@/components/app/RouteProviderGate";
import { PublicRouteChrome, PublicRouteStructuredData } from "@/components/app/PublicRouteChrome";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import AdminAuth from "./pages/AdminAuth";
import AdminLayout from "./pages/AdminLayout";
import AdminResetPassword from "./pages/AdminResetPassword";
import InsuranceDocumentViewer from "./pages/InsuranceDocumentViewer";
import WorkspaceSelector from "./pages/WorkspaceSelector";

// Public pages are statically imported so the live/custom domain never gets stuck
// on a Suspense "Loading page..." screen because of stale lazy-route chunks.
import Index from "./pages/Index";
import Cars from "./pages/Cars";
import CarImages from "./pages/CarImages";
import FeaturesSpecs from "./pages/FeaturesSpecs";
import Brochures from "./pages/Brochures";
import CarLoan from "./pages/CarLoan";
import CarDetail from "./pages/CarDetail";
import CarOnRoadPrice from "./pages/CarOnRoadPrice";
import CompareCars from "./pages/CompareCards";
import CarInsurance from "./pages/CarInsurance";
import CorporateBuying from "./pages/CorporateBuying";
import Accessories from "./pages/Accessories";
import AccessoryWishlist from "./pages/AccessoryWishlist";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Auth from "./pages/Auth";
import MyFavorites from "./pages/MyFavorites";
import MyBookings from "./pages/MyBookings";
import MyOrders from "./pages/MyOrders";
import CarFinder from "./pages/CarFinder";
import SelfDriveRentals from "./pages/SelfDriveRentals";
import HSRP from "./pages/HSRP";
import UpcomingCars from "./pages/UpcomingCars";
import AutoNews from "./pages/AutoNews";
import DealerLocator from "./pages/DealerLocator";
import About from "./pages/About";
import AutoIntelligence from "./pages/AutoIntelligence";
import HoliGreeting from "./pages/HoliGreeting";
import VehicleLookup from "./pages/VehicleLookup";
import ThankYou from "./pages/ThankYou";
import NoWaitingCars from "./pages/NoWaitingCars";
import BestCarDeals from "./pages/BestCarDeals";
import AgreementSignPage from "./pages/AgreementSignPage";
import TrackOrder from "./pages/TrackOrder";
import Unsubscribe from "./pages/Unsubscribe";
import PrivacyPolicy from "./pages/PrivacyPolicy";
const IntegrationControlCenter = lazy(() => import("./pages/IntegrationControlCenter"));
const MarutiScrape = lazy(() => import("./pages/admin/MarutiScrape"));
const BrandScrape = lazy(() => import("./pages/admin/BrandScrape"));
const BulkEnrichment = lazy(() => import("./pages/admin/BulkEnrichment"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

const ADMIN_ROUTE_PREFIXES = [
  "/crm",
  "/crm-auth",
  "/crm-reset-password",
  "/workspace",
  "/admin",
  "/admin-auth",
  "/admin-reset-password",
  "/integration-control-center",
];

const ADMIN_AUTH_ROUTE_PREFIXES = ["/crm-auth", "/crm-reset-password", "/admin-auth", "/admin-reset-password"];

const isAdminRoutePath = (pathname: string) =>
  ADMIN_ROUTE_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const isAdminAuthRoutePath = (pathname: string) =>
  ADMIN_AUTH_ROUTE_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const DOCUMENT_VIEWER_ROUTE_PREFIX = "/document-viewer";

const isDocumentViewerPath = (pathname: string) =>
  pathname === DOCUMENT_VIEWER_ROUTE_PREFIX || pathname.startsWith(`${DOCUMENT_VIEWER_ROUTE_PREFIX}/`);

const LegacyRouteHandler = () => {
  const location = useLocation();

  const normalizedPath = decodeURIComponent(location.pathname)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

  if (normalizedPath === "/no-waiting") {
    return <Navigate to={`/no-waiting-cars${location.search}${location.hash}`} replace />;
  }

  return <NotFound />;
};

const PageViewTracker = ({
  isAdminExperience,
  pathname,
  search,
}: {
  isAdminExperience: boolean;
  pathname: string;
  search: string;
}) => {
  usePageViewTracking({
    enabled: !isAdminExperience,
    pathname,
    search,
  });

  useEffect(() => {
    const resetTimer = scheduleChunkLoadRecoveryReset();

    console.info("[AppBootstrap] Root route shell mounted", {
      href: window.location.href,
      hostname: window.location.hostname,
      path: window.location.pathname,
    });

    return () => {
      if (resetTimer) {
        window.clearTimeout(resetTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (isAdminExperience) {
      return;
    }

    import("./lib/adTracking")
      .then(({ initDynamicTracking }) => initDynamicTracking())
      .catch((error) => {
        console.warn("[AdTracking] Startup tracking init failed", error);
      });
  }, [isAdminExperience]);

  return null;
};

const AppRouterShell = () => {
  const location = useLocation();
  const isAdminExperience =
    !isDocumentViewerPath(location.pathname) && (isAdminSubdomain() || isAdminRoutePath(location.pathname));
  const isAdminAuthShell = isAdminAuthRoutePath(location.pathname);
  const isChromelessExperience = isAdminExperience || isDocumentViewerPath(location.pathname);

  return (
    <RouteProviderGate
      isAdminExperience={isAdminExperience}
      requiresWorkspaceProviders={isAdminExperience && !isAdminAuthShell}
    >
      <Suspense fallback={<RouteSuspenseFallback />}>
        <RouteAwareStructuredData isChromelessExperience={isChromelessExperience} />
        <PageViewTracker
          isAdminExperience={isAdminExperience}
          pathname={location.pathname}
          search={location.search}
        />
        <AdminSubdomainRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cars" element={<Cars />} />
            <Route path="/car-images" element={<CarImages />} />
            <Route path="/features-specs" element={<FeaturesSpecs />} />
            <Route path="/brochures" element={<Brochures />} />
            <Route path="/car-loans" element={<CarLoan />} />
            <Route path="/car/:slug" element={<CarDetail />} />
            <Route path="/cars/:slug" element={<CarDetail />} />
            <Route path="/car/:slug/on-road-price" element={<CarOnRoadPrice />} />
            <Route path="/cars/:slug/on-road-price" element={<CarOnRoadPrice />} />
            <Route path="/compare" element={<CompareCars />} />
            <Route path="/car-insurance" element={<CarInsurance />} />
            <Route path="/corporate" element={<CorporateBuying />} />
            <Route path="/accessories" element={<Accessories />} />
            <Route path="/accessory-wishlist" element={<AccessoryWishlist />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/favorites" element={<MyFavorites />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/car-finder" element={<CarFinder />} />
            <Route
              path="/crm"
              element={
                <AdminRenderBoundary contextLabel="CRM route shell">
                  <AdminLayout />
                </AdminRenderBoundary>
              }
            />
            <Route path="/crm-auth" element={<AdminAuth />} />
            <Route path="/crm-reset-password" element={<AdminResetPassword />} />
            <Route
              path="/admin"
              element={
                <AdminRenderBoundary contextLabel="Admin route shell">
                  <AdminLayout />
                </AdminRenderBoundary>
              }
            />
            <Route path="/admin-auth" element={<AdminAuth />} />
            <Route path="/admin-reset-password" element={<AdminResetPassword />} />
            <Route path="/admin/maruti-scrape" element={<MarutiScrape />} />
            <Route path="/admin/brand-scrape" element={<BrandScrape />} />
            <Route path="/admin/bulk-enrichment" element={<BulkEnrichment />} />
            <Route
              path="/workspace"
              element={
                <AdminRenderBoundary contextLabel="Workspace route shell">
                  <WorkspaceSelector />
                </AdminRenderBoundary>
              }
            />
            <Route path="/self-drive" element={<SelfDriveRentals />} />
            <Route path="/hsrp" element={<HSRP />} />
            <Route path="/upcoming-cars" element={<UpcomingCars />} />
            <Route path="/auto-news" element={<AutoNews />} />
            <Route path="/dealers" element={<DealerLocator />} />
            <Route path="/about" element={<About />} />
            <Route path="/auto-intelligence" element={<AutoIntelligence />} />
            <Route path="/holi" element={<HoliGreeting />} />
            <Route path="/vehicle-lookup" element={<VehicleLookup />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/no-waiting-cars" element={<NoWaitingCars />} />
            <Route path="/best-car-deals" element={<BestCarDeals />} />
            <Route path="/agreement/:token" element={<AgreementSignPage />} />
            <Route path="/document-viewer" element={<InsuranceDocumentViewer />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/integration-control-center" element={<IntegrationControlCenter />} />
            <Route path="*" element={<LegacyRouteHandler />} />
          </Routes>
          <RouteAwareChrome isChromelessExperience={isChromelessExperience} />
        </AdminSubdomainRouter>
      </Suspense>
    </RouteProviderGate>
  );
};

const RouteAwareStructuredData = ({ isChromelessExperience }: { isChromelessExperience: boolean }) => {
  if (isChromelessExperience) {
    return null;
  }

  return <PublicRouteStructuredData />;
};

const RouteAwareChrome = ({ isChromelessExperience }: { isChromelessExperience: boolean }) => {
  if (isChromelessExperience) {
    return null;
  }

  return <PublicRouteChrome />;
};

import { WhatsAppPreviewProvider } from "@/components/whatsapp/WhatsAppPreviewDialog";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <WhatsAppPreviewProvider />
        <BrowserRouter>
          <AppRouterShell />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
