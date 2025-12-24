import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import Index from "./pages/Index";
import CarLoans from "./pages/CarLoans";
import CarDetail from "./pages/CarDetail";
import CompareCars from "./pages/CompareCards";
import CarInsurance from "./pages/CarInsurance";
import CorporateBuying from "./pages/CorporateBuying";
import Accessories from "./pages/Accessories";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Auth from "./pages/Auth";
import MyFavorites from "./pages/MyFavorites";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/car-loans" element={<CarLoans />} />
              <Route path="/car/:slug" element={<CarDetail />} />
              <Route path="/compare" element={<CompareCars />} />
              <Route path="/car-insurance" element={<CarInsurance />} />
              <Route path="/corporate" element={<CorporateBuying />} />
              <Route path="/accessories" element={<Accessories />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/favorites" element={<MyFavorites />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;