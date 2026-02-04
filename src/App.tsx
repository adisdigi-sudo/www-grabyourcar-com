import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { CompareProvider } from "@/hooks/useCompare";
import { FloatingCompareBar } from "@/components/FloatingCompareBar";
import Index from "./pages/Index";
import Cars from "./pages/Cars";
import CarImages from "./pages/CarImages";
import FeaturesSpecs from "./pages/FeaturesSpecs";
import Brochures from "./pages/Brochures";
import CarLoans from "./pages/CarLoans";
import CarDetail from "./pages/CarDetail";
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
import CarFinder from "./pages/CarFinder";
import AdminLayout from "./pages/AdminLayout";
import SelfDriveRentals from "./pages/SelfDriveRentals";
import HSRP from "./pages/HSRP";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <CompareProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/cars" element={<Cars />} />
                <Route path="/car-images" element={<CarImages />} />
                <Route path="/features-specs" element={<FeaturesSpecs />} />
                <Route path="/brochures" element={<Brochures />} />
                <Route path="/car-loans" element={<CarLoans />} />
                <Route path="/car/:slug" element={<CarDetail />} />
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
                <Route path="/car-finder" element={<CarFinder />} />
                <Route path="/admin" element={<AdminLayout />} />
                <Route path="/self-drive" element={<SelfDriveRentals />} />
                <Route path="/hsrp" element={<HSRP />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <FloatingCompareBar />
            </BrowserRouter>
          </TooltipProvider>
        </CompareProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;