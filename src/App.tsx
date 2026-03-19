import { Suspense, lazy, ComponentType } from "react";
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
import { isDynamicImportError, recoverFromChunkLoadError } from "@/lib/chunkLoadRecovery";
import { usePageViewTracking } from "@/hooks/usePageViewTracking";
import { FloatingCallButton } from "@/components/FloatingCallButton";

// Retry wrapper for lazy imports — handles stale chunk errors after deployments
function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err) => {
      if (isDynamicImportError(err) && recoverFromChunkLoadError("route_chunk_recovery")) {
        return new Promise(() => {});
      }

      throw err;
    })
  );
}

const Index = lazyRetry(() => import("./pages/Index"));
const Cars = lazyRetry(() => import("./pages/Cars"));
const CarImages = lazyRetry(() => import("./pages/CarImages"));
const FeaturesSpecs = lazyRetry(() => import("./pages/FeaturesSpecs"));
const Brochures = lazyRetry(() => import("./pages/Brochures"));
const CarLoan = lazyRetry(() => import("./pages/CarLoan"));
const CarDetail = lazyRetry(() => import("./pages/CarDetail"));
const CarOnRoadPrice = lazyRetry(() => import("./pages/CarOnRoadPrice"));
const CompareCars = lazyRetry(() => import("./pages/CompareCards"));
const CarInsurance = lazyRetry(() => import("./pages/CarInsurance"));
const CorporateBuying = lazyRetry(() => import("./pages/CorporateBuying"));
const Accessories = lazyRetry(() => import("./pages/Accessories"));
const AccessoryWishlist = lazyRetry(() => import("./pages/AccessoryWishlist"));
const Blog = lazyRetry(() => import("./pages/Blog"));
const BlogPost = lazyRetry(() => import("./pages/BlogPost"));
const Auth = lazyRetry(() => import("./pages/Auth"));
const MyFavorites = lazyRetry(() => import("./pages/MyFavorites"));
const MyBookings = lazyRetry(() => import("./pages/MyBookings"));
const MyOrders = lazyRetry(() => import("./pages/MyOrders"));
const CarFinder = lazyRetry(() => import("./pages/CarFinder"));
const AdminLayout = lazyRetry(() => import("./pages/AdminLayout"));
const AdminAuth = lazyRetry(() => import("./pages/AdminAuth"));
const AdminResetPassword = lazyRetry(() => import("./pages/AdminResetPassword"));
const WorkspaceSelector = lazyRetry(() => import("./pages/WorkspaceSelector"));
const SelfDriveRentals = lazyRetry(() => import("./pages/SelfDriveRentals"));
const HSRP = lazyRetry(() => import("./pages/HSRP"));
const UpcomingCars = lazyRetry(() => import("./pages/UpcomingCars"));
const AutoNews = lazyRetry(() => import("./pages/AutoNews"));
const DealerLocator = lazyRetry(() => import("./pages/DealerLocator"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const About = lazyRetry(() => import("./pages/About"));
const AutoIntelligence = lazyRetry(() => import("./pages/AutoIntelligence"));
const HoliGreeting = lazyRetry(() => import("./pages/HoliGreeting"));
const VehicleLookup = lazyRetry(() => import("./pages/VehicleLookup"));
const ThankYou = lazyRetry(() => import("./pages/ThankYou"));
const NoWaitingCars = lazyRetry(() => import("./pages/NoWaitingCars"));
const BestCarDeals = lazyRetry(() => import("./pages/BestCarDeals"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds default
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

// Component to initialize global real-time sync
const RealtimeSyncProvider = ({ children }: { children: React.ReactNode }) => {
  useGlobalRealtimeSync();
  return <>{children}</>;
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
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  {/* Only show floating elements on main site, not admin subdomain */}
                  {!isAdminSubdomain() && (
                    <>
                      <FloatingCompareBar />
                      <WhatsAppFloatingButton />
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