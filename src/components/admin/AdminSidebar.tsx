import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Settings,
  Shield,
  MessageSquare,
  Newspaper,
  Image,
  CreditCard,
  FileText,
  Package,
  CalendarDays,
  Database,
  UserCog,
  Brain,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Home,
  Palette,
  PanelLeft,
  Wrench,
  Tags,
  Globe,
  ChevronLeft,
  Sparkles,
  FileSignature,
  Rocket,
  Mail,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdminGlobalSearch } from "./AdminGlobalSearch";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  children?: { id: string; label: string; icon: React.ElementType; badge?: string }[];
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "unified-crm", label: "🧠 Master CRM", icon: Users, badge: "New" },
  { id: "journey-automation", label: "⚡ Journey Automation", icon: Sparkles, badge: "New" },
  { 
    id: "leads", 
    label: "Lead Management", 
    icon: Users,
    children: [
      { id: "leads-all", label: "All Leads", icon: Users },
      { id: "leads-hot", label: "Hot Leads", icon: Users, badge: "Hot" },
      { id: "leads-whatsapp", label: "WhatsApp Leads", icon: MessageSquare },
    ]
  },
  { 
    id: "cars", 
    label: "Car Management", 
    icon: Car,
    children: [
      { id: "cars-list", label: "Cars & Details", icon: Car },
      { id: "cars-brands", label: "🏭 Brands Management", icon: Database, badge: "New" },
      { id: "cars-ai-entry", label: "🚗 AI Car Entry", icon: Sparkles, badge: "New" },
      { id: "cars-bulk-import", label: "📊 Bulk Import", icon: Database, badge: "New" },
      { id: "cars-quick-import", label: "💬 Quick Text Import", icon: MessageSquare, badge: "New" },
      { id: "cars-city-pricing", label: "📍 State/City Pricing", icon: CreditCard, badge: "New" },
      { id: "cars-attributes", label: "🏷️ Vehicle Attributes", icon: Tags, badge: "New" },
      { id: "cars-colors", label: "Colors & Images", icon: Palette },
      { id: "cars-image-sync", label: "🤖 AI Image Sync", icon: Sparkles, badge: "AI" },
      { id: "cars-images", label: "Gallery", icon: Image },
      { id: "cars-variants", label: "Variants & Specs", icon: Tags },
      { id: "cars-pricing", label: "Pricing & Breakup", icon: CreditCard },
      { id: "cars-migration", label: "Data Migration", icon: Database },
      { id: "cars-ai", label: "AI Enhancement", icon: Brain },
      { id: "cars-url-scraper", label: "🌐 URL Scraper", icon: Globe, badge: "New" },
    ]
  },
  { 
    id: "website", 
    label: "Website Manager", 
    icon: Globe,
    children: [
      { id: "website-homepage", label: "Homepage", icon: Home },
      { id: "website-content", label: "Header & Footer", icon: Menu },
      { id: "website-offers", label: "Offers & Layout", icon: Settings, badge: "New" },
      { id: "website-banners", label: "Banners & Sliders", icon: Image },
      { id: "website-branding", label: "Logo & Branding", icon: Palette },
      { id: "website-seo", label: "SEO Settings", icon: Settings },
    ]
  },
  { 
    id: "socialproof", 
    label: "Social Proof", 
    icon: Users,
    badge: "New",
    children: [
      { id: "socialproof-reviews", label: "Google Reviews", icon: MessageSquare },
      { id: "socialproof-stories", label: "Delivery Stories", icon: Image },
    ]
  },
  { 
    id: "services", 
    label: "Services", 
    icon: Wrench,
    children: [
      { id: "services-hsrp", label: "HSRP & FASTag", icon: Shield },
      { id: "services-rentals", label: "Self-Drive Rentals", icon: CalendarDays },
      { id: "services-driver-bookings", label: "🚗 Driver Bookings", icon: Car, badge: "New" },
      { id: "services-api-partners", label: "🔗 API Partners", icon: Globe, badge: "New" },
      { id: "services-insurance", label: "Insurance", icon: FileText },
      { id: "services-loans", label: "Car Loans", icon: CreditCard },
      { id: "services-discounts", label: "Discount Presets", icon: Tags, badge: "New" },
      { id: "services-emi-pdf", label: "EMI PDF Settings", icon: FileText },
      { id: "services-quote-generator", label: "Manual Quote", icon: FileSignature, badge: "New" },
    ]
  },
  { 
    id: "ecommerce", 
    label: "E-Commerce", 
    icon: Package,
    children: [
      { id: "ecommerce-accessories", label: "Accessories", icon: Package },
      { id: "ecommerce-orders", label: "Orders", icon: FileText },
      { id: "ecommerce-crosssell", label: "Cross-Sell", icon: Tags, badge: "New" },
    ]
  },
  { 
    id: "content", 
    label: "Content", 
    icon: FileText,
    children: [
      { id: "content-blog", label: "Blog Posts", icon: FileText },
      { id: "content-news", label: "Auto News", icon: Newspaper },
      { id: "content-launches", label: "Launches & Upcoming", icon: Rocket, badge: "New" },
      { id: "content-ai", label: "AI Content Hub", icon: Brain },
      { id: "content-intelligence", label: "Auto Intelligence", icon: Sparkles },
    ]
  },
  { 
    id: "marketing", 
    label: "Marketing", 
    icon: Users,
    badge: "New",
    children: [
      { id: "marketing-templates", label: "📱 WhatsApp Templates", icon: MessageSquare, badge: "New" },
      { id: "marketing-automation", label: "📧 Email Automation", icon: Mail, badge: "New" },
      { id: "marketing-email", label: "Email Campaigns", icon: MessageSquare },
      { id: "marketing-bulk", label: "Bulk Data Manager", icon: Database },
    ]
  },
  { 
    id: "integrations", 
    label: "Integrations", 
    icon: Settings,
    children: [
      { id: "integrations-api", label: "API Portal", icon: Database },
      { id: "integrations-whatsapp", label: "WhatsApp API", icon: MessageSquare },
      { id: "integrations-chatbot", label: "AI Chatbot", icon: Brain, badge: "New" },
      { id: "integrations-shipping", label: "Shipping Partners", icon: Package },
      { id: "integrations-payments", label: "Payment Gateway", icon: CreditCard },
    ]
  },
  { 
    id: "profile", 
    label: "Profile & Settings", 
    icon: UserCog,
    badge: "New",
    children: [
      { id: "profile-business", label: "Business Profile", icon: Settings },
      { id: "profile-logo", label: "Logo & Branding", icon: Palette },
      { id: "profile-users", label: "User Management", icon: Users },
      { id: "profile-contact", label: "Contact Config", icon: MessageSquare },
      { id: "profile-otp", label: "OTP & Verification", icon: Shield },
    ]
  },
  { id: "roles", label: "User Roles", icon: UserCog },
  { id: "settings", label: "Settings", icon: Settings },
];

export const AdminSidebar = ({ activeTab, setActiveTab }: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["cars", "website"]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Handle responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      // Auto-collapse on tablet
      if (width >= 768 && width < 1024) {
        setCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mobileOpen]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const isActiveChild = (item: NavItem) => {
    return item.children?.some(child => child.id === activeTab);
  };

  const getActiveLabel = () => {
    for (const item of navItems) {
      if (item.id === activeTab) return item.label;
      if (item.children) {
        const child = item.children.find(c => c.id === activeTab);
        if (child) return child.label;
      }
    }
    return "Dashboard";
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSections.includes(item.id);
    const isActive = activeTab === item.id || isActiveChild(item);

    if (hasChildren) {
      return (
        <Collapsible key={item.id} open={isOpen && !collapsed} onOpenChange={() => toggleSection(item.id)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 px-3 py-3 h-auto font-normal touch-manipulation",
                "min-h-[44px]", // Touch-friendly minimum height
                isActive && "bg-accent text-accent-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          {!collapsed && (
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
              {item.children?.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <Button
                    key={child.id}
                    variant="ghost"
                    onClick={() => handleNavClick(child.id)}
                    className={cn(
                      "w-full justify-start gap-3 px-3 py-3 h-auto font-normal text-sm touch-manipulation",
                      "min-h-[44px]",
                      activeTab === child.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <ChildIcon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{child.label}</span>
                    {child.badge && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {child.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </CollapsibleContent>
          )}
        </Collapsible>
      );
    }

    return (
      <Button
        key={item.id}
        variant="ghost"
        onClick={() => handleNavClick(item.id)}
        className={cn(
          "w-full justify-start gap-3 px-3 py-3 h-auto font-normal touch-manipulation",
          "min-h-[44px]",
          activeTab === item.id && "bg-primary/10 text-primary",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="text-sm">{item.label}</span>}
      </Button>
    );
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-card border-b h-14 flex items-center px-4 gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 touch-manipulation"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{getActiveLabel()}</h1>
          <p className="text-[10px] text-muted-foreground">Admin Panel</p>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300",
          // Width based on state
          collapsed ? "w-16" : "w-64",
          // Mobile: full-width drawer
          isMobile && "w-[280px]",
          // Transform for mobile drawer
          isMobile && (mobileOpen ? "translate-x-0" : "-translate-x-full"),
          // Tablet & Desktop: always visible
          !isMobile && "translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "border-b flex items-center",
            collapsed ? "p-3 justify-center" : "p-4 justify-between",
            isMobile && "mt-14" // Account for mobile header
          )}>
            {!collapsed && (
              <div className="min-w-0">
                <h2 className="font-bold text-lg truncate">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">Grabyourcar.com</p>
              </div>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="shrink-0"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Navigation */}
          {/* Global Search */}
          {!collapsed && (
            <div className="px-3 py-2 border-b">
              <AdminGlobalSearch onNavigate={handleNavClick} />
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2 py-3">
            <nav className="space-y-1">
              {navItems.map(renderNavItem)}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className={cn(
            "border-t",
            collapsed ? "p-2" : "p-4"
          )}>
            {!collapsed && (
              <p className="text-xs text-muted-foreground text-center">
                © 2025 Grabyourcar
              </p>
            )}
            {collapsed && (
              <div className="flex justify-center">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobile && mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
};
