import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { FloatingCompareBar } from "@/components/FloatingCompareBar";
import { WhatsAppFloatingButton } from "@/components/WhatsAppCTA";
import { AdminSubdomainRouter } from "@/components/AdminSubdomainRouter";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";
import { usePageViewTracking } from "@/hooks/usePageViewTracking";
import { initDynamicTracking } from "@/lib/adTracking";
import { FloatingCallButton } from "@/components/FloatingCallButton";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { resetChunkLoadRecovery } from "@/lib/chunkLoadRecovery";
import { SiteStructuredData } from "@/components/seo/SiteStructuredData";
import { RouteProviderGate } from "@/components/app/RouteProviderGate";

// Only the homepage is statically imported for fastest first paint
import Index from "./pages/Index";

// Route-level pages stay lazy-loaded so admin-only code can't block public startup
const AdminLayout = lazy(() => import("./pages/AdminLayout"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const InsuranceDocumentViewer = lazy(() => import("./pages/InsuranceDocumentViewer"));
const WorkspaceSelector = lazy(() => import("./pages/WorkspaceSelector"));

// Public-facing pages stay lazy-loaded to keep the main site bundle small
const Cars = lazy(() => import("./pages/Cars"));
const CarImages = lazy(() => import("./pages/CarImages"));
const FeaturesSpecs = lazy(() => import("./pages/FeaturesSpecs"));
const Brochures = lazy(() => import("./pages/Brochures"));
const CarLoan = lazy(() => import("./pages/CarLoan"));
const CarDetail = lazy(() => import("./pages/CarDetail"));
const CarOnRoadPrice = lazy(() => import("./pages/CarOnRoadPrice"));
const CompareCars = lazy(() => import("./pages/CompareCards"));
const CarInsurance = lazy(() => import("./pages/CarInsurance"));
const CorporateBuying = lazy(() => import("./pages/CorporateBuying"));
const Accessories = lazy(() => import("./pages/Accessories"));
const AccessoryWishlist = lazy(() => import("./pages/AccessoryWishlist"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Auth = lazy(() => import("./pages/Auth"));
const MyFavorites = lazy(() => import("./pages/MyFavorites"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const CarFinder = lazy(() => import("./pages/CarFinder"));
const SelfDriveRentals = lazy(() => import("./pages/SelfDriveRentals"));
const HSRP = lazy(() => import("./pages/HSRP"));
const UpcomingCars = lazy(() => import("./pages/UpcomingCars"));
const AutoNews = lazy(() => import("./pages/AutoNews"));
const DealerLocator = lazy(() => import("./pages/DealerLocator"));
const About = lazy(() => import("./pages/About"));
const AutoIntelligence = lazy(() => import("./pages/AutoIntelligence"));
const HoliGreeting = lazy(() => import("./pages/HoliGreeting"));
const VehicleLookup = lazy(() => import("./pages/VehicleLookup"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const NoWaitingCars = lazy(() => import("./pages/NoWaitingCars"));
const BestCarDeals = lazy(() => import("./pages/BestCarDeals"));
const AgreementSignPage = lazy(() => import("./pages/AgreementSignPage"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
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
];

const isAdminRoutePath = (pathname: string) =>
  ADMIN_ROUTE_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));

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

const PageViewTracker = () => {
  const location = useLocation();
  const isAdminExperience =
    !isDocumentViewerPath(location.pathname) && (isAdminSubdomain() || isAdminRoutePath(location.pathname));

  usePageViewTracking(!isAdminExperience);

  useEffect(() => {
    resetChunkLoadRecovery();

    console.info("[AppBootstrap] Root route shell mounted", {
      href: window.location.href,
      hostname: window.location.hostname,
      path: window.location.pathname,
    });
  }, []);

  useEffect(() => {
    if (isAdminExperience) {
      return;
    }

    initDynamicTracking().catch((error) => {
      console.warn("[AdTracking] Startup tracking init failed", error);
    });
  }, [isAdminExperience]);

  return null;
};

const AppRouterShell = () => {
  const location = useLocation();
  const isAdminExperience =
    !isDocumentViewerPath(location.pathname) && (isAdminSubdomain() || isAdminRoutePath(location.pathname));
  const isChromelessExperience = isAdminExperience || isDocumentViewerPath(location.pathname);

  return (
    <RouteProviderGate isAdminExperience={isAdminExperience}>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }
      >
        <RouteAwareStructuredData isChromelessExperience={isChromelessExperience} />
        <PageViewTracker />
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
            <Route path="/crm" element={<AdminLayout />} />
            <Route path="/crm-auth" element={<AdminAuth />} />
            <Route path="/crm-reset-password" element={<AdminResetPassword />} />
            <Route path="/admin" element={<Navigate to="/crm" replace />} />
            <Route path="/admin-auth" element={<Navigate to="/crm-auth" replace />} />
            <Route path="/admin-reset-password" element={<Navigate to="/crm-reset-password" replace />} />
            <Route path="/workspace" element={<WorkspaceSelector />} />
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

  return <SiteStructuredData />;
};

const RouteAwareChrome = ({ isChromelessExperience }: { isChromelessExperience: boolean }) => {
  if (isChromelessExperience) {
    return null;
  }

  return (
    <>
      <FloatingCompareBar />
      <WhatsAppFloatingButton />
      <FloatingCallButton />
      <CookieConsentBanner />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRouterShell />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
