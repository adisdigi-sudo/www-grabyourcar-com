import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { CompareProvider } from "@/hooks/useCompare";
import { FloatingCompareBar } from "@/components/FloatingCompareBar";
import { WhatsAppFloatingButton } from "@/components/WhatsAppCTA";
import { AdminSubdomainRouter } from "@/components/AdminSubdomainRouter";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";
import { useGlobalRealtimeSync } from "@/hooks/useRealtimeSync";
import { VerticalProvider } from "@/hooks/useVerticalAccess";
import { resetChunkLoadRecovery } from "@/lib/chunkLoadRecovery";
import { usePageViewTracking } from "@/hooks/usePageViewTracking";
import { initDynamicTracking } from "@/lib/adTracking";
import { FloatingCallButton } from "@/components/FloatingCallButton";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import Cars from "./pages/Cars";
import Index from "./pages/Index";
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
import AdminLayout from "./pages/AdminLayout";
import AdminAuth from "./pages/AdminAuth";
import AdminResetPassword from "./pages/AdminResetPassword";
import WorkspaceSelector from "./pages/WorkspaceSelector";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds default
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

// Component to initialize global real-time sync + page view tracking
const RealtimeSyncProvider = ({ children }: { children: React.ReactNode }) => {
  useGlobalRealtimeSync();
  return <>{children}</>;
};

const PageViewTracker = () => {
  usePageViewTracking();

  useEffect(() => {
    console.info("[AppBootstrap] Root route shell mounted", {
      href: window.location.href,
      hostname: window.location.hostname,
      path: window.location.pathname,
    });
    resetChunkLoadRecovery("global_chunk_recovery");
    resetChunkLoadRecovery("route_chunk_recovery");
    resetChunkLoadRecovery("bootstrap_chunk_recovery");
  }, []);

  useEffect(() => {
    initDynamicTracking().catch((error) => {
      console.warn("[AdTracking] Startup tracking init failed", error);
    });
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <CompareProvider>
          <VerticalProvider>
          <RealtimeSyncProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                }
              >
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
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  {/* Only show floating elements on main site, not admin subdomain */}
                  {!isAdminSubdomain() && (
                    <>
                      <FloatingCompareBar />
                      <WhatsAppFloatingButton />
                      <FloatingCallButton />
                      <CookieConsentBanner />
                    </>
                  )}
                </AdminSubdomainRouter>
              </Suspense>
            </BrowserRouter>
            </TooltipProvider>
          </RealtimeSyncProvider>
          </VerticalProvider>
        </CompareProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;