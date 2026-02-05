import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: { id: string; label: string; icon: React.ElementType }[];
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { 
    id: "leads", 
    label: "Lead Management", 
    icon: Users,
    children: [
      { id: "leads-all", label: "All Leads", icon: Users },
      { id: "leads-hot", label: "Hot Leads", icon: Users },
      { id: "leads-whatsapp", label: "WhatsApp Leads", icon: MessageSquare },
    ]
  },
  { 
    id: "cars", 
    label: "Car Catalog", 
    icon: Car,
    children: [
      { id: "cars-list", label: "All Cars", icon: Car },
      { id: "cars-images", label: "Car Images", icon: Image },
      { id: "cars-variants", label: "Variants & Pricing", icon: Tags },
      { id: "cars-compare", label: "Compare Manager", icon: PanelLeft },
      { id: "cars-migration", label: "Data Migration", icon: Database },
      { id: "cars-ai", label: "AI Enhancement", icon: Brain },
    ]
  },
  { 
    id: "website", 
    label: "Website Manager", 
    icon: Globe,
    children: [
      { id: "website-homepage", label: "Homepage", icon: Home },
      { id: "website-banners", label: "Banners & Sliders", icon: Image },
      { id: "website-menu", label: "Menu & Navigation", icon: Menu },
      { id: "website-branding", label: "Logo & Branding", icon: Palette },
      { id: "website-seo", label: "SEO Settings", icon: Settings },
    ]
  },
  { 
    id: "services", 
    label: "Services", 
    icon: Wrench,
    children: [
      { id: "services-hsrp", label: "HSRP Bookings", icon: Shield },
      { id: "services-rentals", label: "Self-Drive Rentals", icon: CalendarDays },
      { id: "services-insurance", label: "Insurance", icon: FileText },
      { id: "services-loans", label: "Car Loans", icon: CreditCard },
    ]
  },
  { 
    id: "ecommerce", 
    label: "E-Commerce", 
    icon: Package,
    children: [
      { id: "ecommerce-accessories", label: "Accessories", icon: Package },
      { id: "ecommerce-orders", label: "Orders", icon: FileText },
    ]
  },
  { 
    id: "content", 
    label: "Content", 
    icon: FileText,
    children: [
      { id: "content-blog", label: "Blog Posts", icon: FileText },
      { id: "content-news", label: "Auto News", icon: Newspaper },
      { id: "content-ai", label: "AI Content", icon: Brain },
    ]
  },
  { 
    id: "integrations", 
    label: "Integrations", 
    icon: Settings,
    children: [
      { id: "integrations-whatsapp", label: "WhatsApp API", icon: MessageSquare },
      { id: "integrations-payments", label: "Payment Gateway", icon: CreditCard },
    ]
  },
  { id: "roles", label: "User Roles", icon: UserCog },
  { id: "settings", label: "Settings", icon: Settings },
];

export const AdminSidebar = ({ activeTab, setActiveTab }: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["cars", "website"]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const isActiveChild = (item: NavItem) => {
    return item.children?.some(child => child.id === activeTab);
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSections.includes(item.id);
    const isActive = activeTab === item.id || isActiveChild(item);

    if (hasChildren) {
      return (
        <Collapsible key={item.id} open={isOpen} onOpenChange={() => toggleSection(item.id)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 px-3 py-2 h-auto font-normal",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
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
          <CollapsibleContent className="pl-4 space-y-1 mt-1">
            {item.children?.map((child) => {
              const ChildIcon = child.icon;
              return (
                <Button
                  key={child.id}
                  variant="ghost"
                  onClick={() => handleNavClick(child.id)}
                  className={cn(
                    "w-full justify-start gap-3 px-3 py-2 h-auto font-normal text-sm",
                    activeTab === child.id && "bg-primary/10 text-primary"
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{child.label}</span>}
                </Button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        key={item.id}
        variant="ghost"
        onClick={() => handleNavClick(item.id)}
        className={cn(
          "w-full justify-start gap-3 px-3 py-2 h-auto font-normal",
          activeTab === item.id && "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="text-sm">{item.label}</span>}
      </Button>
    );
  };

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            {!collapsed && (
              <div>
                <h2 className="font-bold text-lg">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">Grabyourcar.com</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navItems.map(renderNavItem)}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t">
            {!collapsed && (
              <p className="text-xs text-muted-foreground text-center">
                © 2024 Grabyourcar
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
};
