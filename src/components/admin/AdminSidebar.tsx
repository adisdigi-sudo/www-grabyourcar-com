import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  BarChart3,
  FileSignature,
  Rocket,
  Mail,
  LogOut,
  Building2,
  MessageCircle,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdminGlobalSearch } from "./AdminGlobalSearch";
import { useAdminAuth, AppRole } from "@/hooks/useAdminAuth";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  /** Roles that can see this item. Empty/undefined = all roles */
  allowedRoles?: AppRole[];
  /** Which vertical slugs this item belongs to. undefined = show in all verticals */
  verticals?: string[];
  children?: { id: string; label: string; icon: React.ElementType; badge?: string; allowedRoles?: AppRole[]; verticals?: string[] }[];
}

const navItems: NavItem[] = [
  // ── Universal ──
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },

  // ── Sales CRM — sales vertical ──
  { id: "sales-crm", label: "🚗 Sales CRM", icon: Car, verticals: ["sales"], allowedRoles: ["super_admin", "admin", "sales"] },

  // ── Services — vertical-specific children ──
  { 
    id: "services", 
    label: "Services", 
    icon: Wrench,
    children: [
      { id: "services-hsrp", label: "HSRP & FASTag", icon: Shield, verticals: ["hsrp"], allowedRoles: ["super_admin", "admin", "operations"] },
      { id: "services-rentals", label: "Self-Drive Rentals", icon: CalendarDays, verticals: ["rental"], allowedRoles: ["super_admin", "admin", "operations"] },
      { id: "services-driver-bookings", label: "🚗 Driver Bookings", icon: Car, verticals: ["rental"], allowedRoles: ["super_admin", "admin", "operations"] },
      { id: "services-api-partners", label: "🔗 API Partners", icon: Globe, verticals: ["rental"], allowedRoles: ["super_admin", "admin"] },
      { id: "services-insurance", label: "🛡️ Insurance CRM", icon: FileText, verticals: ["insurance"], allowedRoles: ["super_admin", "admin", "insurance"] },
      { id: "services-insurance-import", label: "📥 Insurance Import", icon: Database, verticals: ["insurance"], allowedRoles: ["super_admin", "admin", "insurance"] },
      { id: "services-loans", label: "💰 Car Loans CRM", icon: CreditCard, verticals: ["loans"], allowedRoles: ["super_admin", "admin", "finance"] },
      { id: "services-emi-pdf", label: "EMI PDF Settings", icon: FileText, verticals: ["loans"], allowedRoles: ["super_admin", "admin", "finance"] },
      { id: "services-discounts", label: "Discount Presets", icon: Tags, verticals: ["sales"], allowedRoles: ["super_admin", "admin", "sales"] },
      { id: "services-quote-generator", label: "Manual Quote", icon: FileSignature, verticals: ["sales"], allowedRoles: ["super_admin", "admin", "sales"] },
      { id: "services-pricing", label: "Service Pricing", icon: CreditCard, verticals: ["hsrp", "rental"], allowedRoles: ["super_admin", "admin", "operations"] },
      { id: "services-partners", label: "Partners", icon: Users, verticals: ["insurance", "rental"], allowedRoles: ["super_admin", "admin"] },
    ]
  },

  // ── E-Commerce — accessories vertical only ──
  { 
    id: "ecommerce", 
    label: "E-Commerce", 
    icon: Package,
    verticals: ["accessories"],
    allowedRoles: ["super_admin", "admin", "operations", "sales"],
    children: [
      { id: "ecommerce-accessories", label: "Accessories", icon: Package },
      { id: "ecommerce-orders", label: "Orders", icon: FileText },
      { id: "ecommerce-crosssell", label: "Cross-Sell", icon: Tags },
    ]
  },

  // ── Dealer Network — dedicated vertical ──
  { 
    id: "dealer", 
    label: "🏢 Dealer Network", 
    icon: Building2,
    verticals: ["dealer-network"],
    allowedRoles: ["super_admin", "admin", "dealer"],
    children: [
      { id: "dealer-inquiry", label: "Inquiry Hub", icon: MessageCircle },
      { id: "dealer-companies", label: "Companies", icon: Building2 },
      { id: "dealer-reps", label: "Representatives", icon: Users },
      { id: "dealer-inventory", label: "Inventory", icon: Car },
      { id: "dealer-broadcast", label: "Broadcast", icon: Mail },
    ]
  },

  // ── Services — marketing workspace ──
  { 
    id: "mkt-services", 
    label: "🛠️ Services", 
    icon: Wrench,
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"],
    children: [
      { id: "services-insurance", label: "🛡️ Insurance CRM", icon: FileText },
      { id: "services-loans", label: "💰 Car Loans", icon: CreditCard },
      { id: "services-hsrp", label: "HSRP & FASTag", icon: Shield },
      { id: "services-rentals", label: "Self-Drive Rentals", icon: CalendarDays },
      { id: "services-pricing", label: "Service Pricing", icon: CreditCard },
      { id: "services-partners", label: "Partners", icon: Users },
    ]
  },

  // ══════════════════════════════════════════════════
  // MARKETING & TECH WORKSPACE — comprehensive hub
  // ══════════════════════════════════════════════════

  // ── Manager Tools ──
  { id: "manager-dashboard", label: "📊 Manager Dashboard", icon: BarChart3, badge: "New",
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"] },
  { id: "team-engagement", label: "🏆 Team Engagement", icon: BarChart3, badge: "New",
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"] },
  { id: "error-prevention", label: "⚠️ Error Prevention", icon: BarChart3,
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"] },
  { id: "workflow-engine", label: "⚙️ Workflow Engine", icon: BarChart3,
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"] },

  // ── Cross-Vertical Intelligence ──
  { id: "unified-crm", label: "🧠 Unified Customers", icon: Users, badge: "New",
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"] },
  { id: "unified-intelligence", label: "🔗 Cross-Vertical Intel", icon: Sparkles, badge: "AI",
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"] },
  { id: "journey-automation", label: "⚡ Journey Automation", icon: Sparkles, badge: "New",
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"] },
  { id: "automation-center", label: "🤖 Automation Center", icon: Sparkles, badge: "🔥",
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"] },
  { id: "lead-routing", label: "🔀 Lead Routing", icon: Users, badge: "New",
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"] },
  { id: "revenue-intelligence", label: "📊 Revenue Intelligence", icon: BarChart3, badge: "New",
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin", "finance"] },

  // ── Car Database — marketing workspace ──
  { 
    id: "cars", 
    label: "🚗 Car Database", 
    icon: Car,
    verticals: ["car-database", "marketing"],
    allowedRoles: ["super_admin", "admin"],
    children: [
      { id: "cars-list", label: "Cars & Details", icon: Car },
      { id: "cars-brands", label: "🏭 Brands", icon: Database },
      { id: "cars-variants", label: "Variants & Specs", icon: Tags },
      { id: "cars-pricing", label: "Pricing & Breakup", icon: CreditCard },
      { id: "cars-city-pricing", label: "📍 State/City Pricing", icon: CreditCard },
      { id: "cars-colors", label: "Colors & Images", icon: Palette },
      { id: "cars-images", label: "Gallery", icon: Image },
      { id: "cars-attributes", label: "🏷️ Vehicle Attributes", icon: Tags },
      { id: "cars-ai-entry", label: "🤖 AI Car Entry", icon: Sparkles, badge: "AI" },
      { id: "cars-bulk-import", label: "📊 Bulk Import", icon: Database },
      { id: "cars-quick-import", label: "💬 Quick Text Import", icon: MessageSquare },
      { id: "cars-image-sync", label: "🤖 AI Image Sync", icon: Sparkles, badge: "AI" },
      { id: "cars-migration", label: "Data Migration", icon: Database },
      { id: "cars-ai", label: "AI Enhancement", icon: Brain },
      { id: "cars-url-scraper", label: "🌐 URL Scraper", icon: Globe },
    ]
  },

  // ── Website Manager — marketing only ──
  { 
    id: "website", 
    label: "🌐 Website Manager", 
    icon: Globe,
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin", "marketing"],
    children: [
      { id: "website-homepage", label: "Homepage", icon: Home },
      { id: "website-content", label: "Header & Footer", icon: Menu },
      { id: "website-offers", label: "Offers & Layout", icon: Settings },
      { id: "website-banners", label: "Banners & Sliders", icon: Image },
      { id: "website-branding", label: "Logo & Branding", icon: Palette },
      { id: "website-testimonials", label: "Testimonials", icon: MessageSquare },
      { id: "website-faqs", label: "FAQs", icon: FileText },
      { id: "website-seo", label: "SEO Settings", icon: Settings },
    ]
  },

  // ── Social Proof — marketing only ──
  { 
    id: "socialproof", 
    label: "⭐ Social Proof", 
    icon: Users,
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin", "marketing"],
    children: [
      { id: "socialproof-reviews", label: "Google Reviews", icon: MessageSquare },
      { id: "socialproof-stories", label: "Delivery Stories", icon: Image },
    ]
  },

  // ── Content — marketing only ──
  { 
    id: "content", 
    label: "📝 Content", 
    icon: FileText,
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin", "marketing"],
    children: [
      { id: "content-blog", label: "Blog Posts", icon: FileText },
      { id: "content-news", label: "Auto News", icon: Newspaper },
      { id: "content-launches", label: "Launches & Upcoming", icon: Rocket },
      { id: "content-ai", label: "AI Content Hub", icon: Brain },
      { id: "content-intelligence", label: "Auto Intelligence", icon: Sparkles },
    ]
  },

  // ── Marketing Campaigns — marketing only ──
  { 
    id: "marketing", 
    label: "📢 Marketing", 
    icon: Users,
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin", "marketing"],
    children: [
      { id: "marketing-command", label: "🎯 Command Center", icon: Rocket },
      { id: "holi-share", label: "📣 Bulk Broadcast", icon: MessageSquare, badge: "New" },
      { id: "marketing-templates", label: "📱 WhatsApp Templates", icon: MessageSquare },
      { id: "marketing-automation", label: "📧 Email Automation", icon: Mail },
      { id: "marketing-email", label: "Email Campaigns", icon: MessageSquare },
      { id: "marketing-bulk", label: "Bulk Data Manager", icon: Database },
    ]
  },

  // ── Integrations — super admin only ──
  { 
    id: "integrations", 
    label: "🔌 Integrations", 
    icon: Settings,
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"],
    children: [
      { id: "integrations-api", label: "API Portal", icon: Database },
      { id: "integrations-whatsapp", label: "WhatsApp API", icon: MessageSquare },
      { id: "integrations-shipping", label: "Shipping Partners", icon: Package },
      { id: "integrations-payments", label: "Payment Gateway", icon: CreditCard },
    ]
  },

  // ── Profile & Settings — super admin only ──
  { 
    id: "profile", 
    label: "⚙️ Profile & Settings", 
    icon: UserCog,
    verticals: ["marketing"],
    allowedRoles: ["super_admin", "admin"],
    children: [
      { id: "profile-business", label: "Business Profile", icon: Settings },
      { id: "profile-logo", label: "Logo & Branding", icon: Palette },
      { id: "profile-users", label: "User Management", icon: Users },
      { id: "profile-contact", label: "Contact Config", icon: MessageSquare },
      { id: "profile-otp", label: "OTP & Verification", icon: Shield },
    ]
  },
  { id: "roles", label: "👥 User Roles", icon: UserCog, verticals: ["marketing"], allowedRoles: ["super_admin", "admin"] },
  { id: "settings", label: "⚙️ Site Settings", icon: Settings, verticals: ["marketing"], allowedRoles: ["super_admin", "admin"] },

  // ── Accounts & Finance — shows in accounts vertical + always for admins ──
  { 
    id: "finance-hub", 
    label: "💰 Accounts & Finance", 
    icon: CreditCard,
    verticals: ["accounts"],
    allowedRoles: ["super_admin", "admin", "finance"],
    children: [
      { id: "accounts-finance", label: "📊 Finance Overview", icon: BarChart3 },
      { id: "accounts-revenue", label: "💵 Revenue Entries", icon: CreditCard },
      { id: "accounts-expenses", label: "📤 Expenses", icon: CreditCard },
      { id: "accounts-commissions", label: "🏆 Commissions", icon: CreditCard },
      { id: "accounts-payouts", label: "💳 Payouts", icon: CreditCard },
    ]
  },

  // ── HR & Office Culture — shows in hr vertical + always for admins ──
  { 
    id: "hr-hub", 
    label: "👥 HR & Office", 
    icon: Users,
    verticals: ["hr"],
    allowedRoles: ["super_admin", "admin"],
    children: [
      { id: "hr-workspace", label: "📊 HR Overview", icon: BarChart3 },
      { id: "hr-directory", label: "👥 Team Directory", icon: Users },
      { id: "hr-attendance", label: "📋 Attendance", icon: CalendarDays },
      { id: "hr-leaves", label: "🏖️ Leave Management", icon: CalendarDays },
      { id: "hr-announcements", label: "📢 Announcements", icon: FileText },
    ]
  },
];

export const AdminSidebar = ({ activeTab, setActiveTab }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const { roles, isAdmin, isSuperAdmin } = useAdminAuth();
  const { activeVertical, setActiveVertical } = useVerticalAccess();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["cars", "website"]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Determine user's role set
  const userRoles = useMemo(() => roles.map(r => r.role), [roles]);
  const hasFullAccess = isSuperAdmin() || isAdmin();

  // Filter nav items based on role AND active vertical
  const activeSlug = activeVertical?.slug;
  const normalizedActiveSlug = (activeSlug || "").trim().toLowerCase();
  
  const filteredNavItems = useMemo(() => {
    const filterByVertical = (item: NavItem) => {
      // Items without verticals tag show everywhere
      if (!item.verticals) return true;
      // Finance & HR hubs always visible for admins
      if ((item.id === "finance-hub" || item.id === "hr-hub") && hasFullAccess) return true;
      // If no vertical is active, hide vertical-specific items
      if (!normalizedActiveSlug) return false;
      // Only show if item belongs to active vertical
      return item.verticals.map(v => v.trim().toLowerCase()).includes(normalizedActiveSlug);
    };

    let items = navItems.filter(filterByVertical);

    if (!hasFullAccess) {
      items = items.filter(item => {
        if (!item.allowedRoles) return true;
        return item.allowedRoles.some(r => userRoles.includes(r));
      });
    }

    // Insurance workspace should stay focused: keep Dashboard + Smart Calling + Insurance CRM tools
    if (normalizedActiveSlug === "insurance") {
      items = items
        .map(item => {
          if (item.id === "dashboard" || item.id === "calling-system") return item;
          if (item.id === "services" && item.children) {
            const allowedInsuranceChildren = item.children.filter(
              child => child.id === "services-insurance" || child.id === "services-insurance-import"
            );
            return allowedInsuranceChildren.length > 0
              ? { ...item, children: allowedInsuranceChildren }
              : null;
          }
          return null;
        })
        .filter(Boolean) as NavItem[];
    }

    return items
      .map(item => {
        if (!item.children) return item;
        const filteredChildren = item.children.filter(child => {
          if (child.verticals && normalizedActiveSlug) {
            const normalizedChildVerticals = child.verticals.map(v => v.trim().toLowerCase());
            if (!normalizedChildVerticals.includes(normalizedActiveSlug)) return false;
          }
          if (!hasFullAccess && child.allowedRoles) {
            return child.allowedRoles.some(r => userRoles.includes(r));
          }
          return true;
        });
        return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
      })
      .filter(Boolean) as NavItem[];
  }, [hasFullAccess, userRoles, normalizedActiveSlug]);

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
            isMobile && "mt-14"
          )}>
            {!collapsed && (
              <div className="min-w-0">
                <h2 className="font-bold text-lg truncate">
                  {activeVertical?.name || "Admin Panel"}
                </h2>
                <p className="text-xs text-muted-foreground">Grabyourcar.com</p>
              </div>
            )}
            {!isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="shrink-0">
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Switch Workspace Button */}
          {!collapsed && (
            <div className="px-3 py-2 border-b">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => {
                  setActiveVertical(null);
                  navigate('/workspace');
                }}
              >
                <PanelLeft className="h-3 w-3 mr-2" />
                Switch Workspace
              </Button>
            </div>
          )}

          {/* Navigation */}
          {/* Global Search */}
          {!collapsed && (
            <div className="px-3 py-2 border-b">
              <AdminGlobalSearch onNavigate={handleNavClick} activeVerticalSlug={activeSlug} />
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2 py-3">
            <nav className="space-y-1">
              {filteredNavItems.map(renderNavItem)}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className={cn(
            "border-t space-y-2",
            collapsed ? "p-2" : "p-3"
          )}>
            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation",
                collapsed ? "justify-center px-2" : "justify-start gap-2"
              )}
              onClick={async () => {
                await signOut();
                navigate('/crm-auth');
              }}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">Sign Out</span>}
            </Button>
            
            <div className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "justify-between"
            )}>
              {!collapsed && (
                <p className="text-xs text-muted-foreground">
                  © 2025 Grabyourcar
                </p>
              )}
              <ThemeToggle />
            </div>
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
