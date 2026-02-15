import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { CompareProvider } from "@/hooks/useCompare";
import { FloatingCompareBar } from "@/components/FloatingCompareBar";
import { WhatsAppFloatingButton } from "@/components/WhatsAppCTA";
import { AdminSubdomainRouter } from "@/components/AdminSubdomainRouter";
import { isAdminSubdomain } from "@/hooks/useAdminSubdomain";
import { useGlobalRealtimeSync } from "@/hooks/useRealtimeSync";
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
import AdminLayout from "./pages/AdminLayout";
import AdminAuth from "./pages/AdminAuth";
import AdminResetPassword from "./pages/AdminResetPassword";
import SelfDriveRentals from "./pages/SelfDriveRentals";
import HSRP from "./pages/HSRP";
import UpcomingCars from "./pages/UpcomingCars";
import AutoNews from "./pages/AutoNews";
import DealerLocator from "./pages/DealerLocator";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import AutoIntelligence from "./pages/AutoIntelligence";

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
          <RealtimeSyncProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
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
                  <Route path="/admin" element={<AdminLayout />} />
                  <Route path="/admin-auth" element={<AdminAuth />} />
                  <Route path="/admin-reset-password" element={<AdminResetPassword />} />
                  <Route path="/self-drive" element={<SelfDriveRentals />} />
                  <Route path="/hsrp" element={<HSRP />} />
                  <Route path="/upcoming-cars" element={<UpcomingCars />} />
                  <Route path="/auto-news" element={<AutoNews />} />
                  <Route path="/dealers" element={<DealerLocator />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auto-intelligence" element={<AutoIntelligence />} />
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
            </BrowserRouter>
            </TooltipProvider>
          </RealtimeSyncProvider>
        </CompareProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;