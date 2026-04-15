import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Car, 
  Clock, 
  GitCompare, 
  Shield, 
  Banknote, 
  Building2, 
  CarFront, 
  Package,
  ChevronLeft,
  ChevronRight,
  LucideIcon
} from "lucide-react";

interface CategoryItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  href: string;
  type: 'scroll' | 'navigate' | 'coming-soon';
  sort_order: number;
  is_active: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  Car,
  Clock,
  GitCompare,
  Shield,
  Banknote,
  Building2,
  CarFront,
  Package,
};

// Rich themed gradient styles for each category
const categoryStyles: Record<string, { gradient: string; iconBg: string; iconColor: string; badge?: string }> = {
  "New Cars": {
    gradient: "bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/30",
    iconBg: "bg-primary",
    iconColor: "text-primary-foreground",
  },
  "Zero Waiting": {
    gradient: "bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent border-amber-500/30",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
    iconColor: "text-white",
    badge: "🔥 Hot",
  },
  "Compare Offers": {
    gradient: "bg-gradient-to-br from-blue-500/15 via-indigo-500/5 to-transparent border-blue-500/30",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-500",
    iconColor: "text-white",
  },
  "Car Insurance": {
    gradient: "bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent border-emerald-500/30",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
    iconColor: "text-white",
    badge: "Save 25%",
  },
  "Car Loans": {
    gradient: "bg-gradient-to-br from-violet-500/15 via-purple-500/5 to-transparent border-violet-500/30",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
    iconColor: "text-white",
  },
  "Corporate Buying": {
    gradient: "bg-gradient-to-br from-slate-600/15 via-slate-500/5 to-transparent border-slate-500/30",
    iconBg: "bg-gradient-to-br from-slate-600 to-slate-700",
    iconColor: "text-white",
  },
  "Self-Drive Rentals": {
    gradient: "bg-gradient-to-br from-rose-500/15 via-pink-500/5 to-transparent border-rose-500/30",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-500",
    iconColor: "text-white",
    badge: "New",
  },
  "Accessories": {
    gradient: "bg-gradient-to-br from-cyan-500/15 via-sky-500/5 to-transparent border-cyan-500/30",
    iconBg: "bg-gradient-to-br from-cyan-500 to-sky-500",
    iconColor: "text-white",
  },
};

// Default categories - used when no backend data
const defaultCategories: CategoryItem[] = [
  {
    id: "1",
    icon: "Car",
    title: "New Cars",
    description: "Pan-India Deals from Authorized Dealers",
    color: "text-primary",
    bgColor: "bg-primary/10",
    href: "#cars",
    type: "scroll",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "2",
    icon: "Clock",
    title: "Zero Waiting",
    description: "Ready Stock Cars Available Now",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    href: "#cars",
    type: "scroll",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "3",
    icon: "GitCompare",
    title: "Compare Offers",
    description: "Best Deals from Multiple Dealers",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    href: "/compare",
    type: "navigate",
    sort_order: 3,
    is_active: true,
  },
  {
    id: "4",
    icon: "Shield",
    title: "Car Insurance",
    description: "Best Rates from Top Insurers",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    href: "/car-insurance",
    type: "navigate",
    sort_order: 4,
    is_active: true,
  },
  {
    id: "5",
    icon: "Banknote",
    title: "Car Loans",
    description: "Easy Finance from Banks & NBFCs",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    href: "/car-loans",
    type: "navigate",
    sort_order: 5,
    is_active: true,
  },
  {
    id: "6",
    icon: "Building2",
    title: "Corporate Buying",
    description: "Bulk Deals for Businesses",
    color: "text-slate-600",
    bgColor: "bg-slate-500/10",
    href: "/corporate",
    type: "navigate",
    sort_order: 6,
    is_active: true,
  },
  {
    id: "7",
    icon: "CarFront",
    title: "Self-Drive Rentals",
    description: "Premium Cars on Rent",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    href: "/self-drive",
    type: "navigate",
    sort_order: 7,
    is_active: true,
  },
  {
    id: "8",
    icon: "Package",
    title: "Accessories",
    description: "HSRP Frames & More",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    href: "/accessories",
    type: "navigate",
    sort_order: 8,
    is_active: true,
  },
];

export const CategoryGrid = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch categories from backend
  const { data: categories = defaultCategories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'service_categories')
          .single();

        if (error || !data) {
          return defaultCategories;
        }

        const parsed = data.setting_value as { categories?: CategoryItem[] };
        return parsed?.categories?.filter(c => c.is_active)?.sort((a, b) => a.sort_order - b.sort_order) || defaultCategories;
      } catch {
        return defaultCategories;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleCategoryClick = (category: CategoryItem) => {
    if (category.type === "coming-soon") {
      toast.info(`${category.title} - Coming Soon!`, {
        description: "We're working on this feature. Stay tuned!",
      });
      return;
    }

    if (category.type === "scroll") {
      const element = document.querySelector(category.href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (category.type === "navigate") {
      navigate(category.href);
    }
  };

  return (
    <section className="py-12 md:py-16 bg-secondary/50 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <div className="text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
            Everything You Need to Buy Your Car
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            From finding the best deals to financing and insurance — we've got you covered
          </p>
        </div>
      </div>

      <div className="relative">
        {/* Left scroll button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm shadow-md hover:bg-card"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Right scroll button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm shadow-md hover:bg-card"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-6 md:w-12 lg:w-20 bg-gradient-to-r from-secondary/50 to-transparent z-[5] pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 md:w-12 lg:w-20 bg-gradient-to-l from-secondary/50 to-transparent z-[5] pointer-events-none" />

        <div
          ref={scrollRef}
          className="flex gap-4 px-4 md:px-12 lg:px-20 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {categories.map((category) => {
            const IconComponent = iconMap[category.icon] || Car;
            const style = categoryStyles[category.title] || { 
              gradient: "bg-card border-border/50", 
              iconBg: category.bgColor, 
              iconColor: category.color 
            };
            
            return (
              <Card
                key={category.id}
                variant="deal"
                className={`flex-shrink-0 w-40 md:w-48 p-4 cursor-pointer group relative overflow-hidden border-2 ${style.gradient} ${
                  category.type === 'coming-soon' ? 'opacity-60' : ''
                }`}
                onClick={() => handleCategoryClick(category)}
              >
                {/* Badge */}
                {style.badge && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                    {style.badge}
                  </span>
                )}
                
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${style.iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                  <IconComponent className={`h-5 w-5 md:h-6 md:w-6 ${style.iconColor}`} />
                </div>
                <h3 className="font-heading font-semibold text-foreground text-sm md:text-base mb-1">
                  {category.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {category.description}
                </p>
                {category.type === 'coming-soon' && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded mt-2 inline-block">
                    Coming Soon
                  </span>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
