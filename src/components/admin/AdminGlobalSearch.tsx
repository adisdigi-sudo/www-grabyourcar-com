import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Car, Image, FileText, Package, Users, Globe, Settings, Palette, Shield, MessageSquare, CreditCard, Tags, Brain, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  label: string;
  category: string;
  icon: React.ElementType;
  keywords: string[];
}

const allSearchItems: SearchResult[] = [
  // Dashboard
  { id: "dashboard", label: "Dashboard", category: "Navigation", icon: Settings, keywords: ["home", "overview", "stats", "analytics", "revenue"] },
  
  { id: "leads-all", label: "All Leads", category: "Leads", icon: Users, keywords: ["leads", "customers", "inquiries", "prospects"] },
  
  // Car Management
  { id: "cars-list", label: "Cars & Details", category: "Cars", icon: Car, keywords: ["cars", "models", "catalog", "vehicles", "edit", "add", "delete"] },
  { id: "cars-brands", label: "Brands Management", category: "Cars", icon: Settings, keywords: ["brands", "manufacturers", "oem", "maruti", "hyundai", "tata", "mahindra"] },
  { id: "cars-ai-entry", label: "AI Car Entry", category: "Cars", icon: Sparkles, keywords: ["ai", "generate", "auto", "entry", "new car"] },
  { id: "cars-bulk-import", label: "Bulk Import", category: "Cars", icon: Settings, keywords: ["bulk", "import", "csv", "upload", "mass"] },
  { id: "cars-quick-import", label: "Quick Text Import", category: "Cars", icon: MessageSquare, keywords: ["text", "paste", "quick", "import"] },
  { id: "cars-city-pricing", label: "State/City Pricing", category: "Cars", icon: CreditCard, keywords: ["pricing", "state", "city", "on-road", "rto", "insurance"] },
  { id: "cars-attributes", label: "Vehicle Attributes", category: "Cars", icon: Tags, keywords: ["attributes", "body type", "fuel", "segment"] },
  { id: "cars-colors", label: "Colors & Images", category: "Cars", icon: Palette, keywords: ["colors", "swatches", "color images", "paint"] },
  { id: "cars-image-sync", label: "AI Image Sync", category: "Cars", icon: Sparkles, keywords: ["image", "sync", "scrape", "oem", "download"] },
  { id: "cars-images", label: "Car Gallery", category: "Cars", icon: Image, keywords: ["gallery", "images", "photos", "pictures", "upload"] },
  { id: "cars-variants", label: "Variants & Specs", category: "Cars", icon: Tags, keywords: ["variants", "specifications", "trim", "features", "engine"] },
  { id: "cars-pricing", label: "Pricing & Breakup", category: "Cars", icon: CreditCard, keywords: ["pricing", "breakup", "ex-showroom", "on-road"] },
  { id: "cars-migration", label: "Data Migration", category: "Cars", icon: Settings, keywords: ["migration", "data", "transfer", "sync"] },
  { id: "cars-ai", label: "AI Enhancement", category: "Cars", icon: Brain, keywords: ["ai", "enhance", "generate", "overview", "tagline"] },
  
  // Website Manager
  { id: "website-homepage", label: "Homepage", category: "Website", icon: Globe, keywords: ["homepage", "hero", "sections", "layout", "design"] },
  { id: "website-content", label: "Header & Footer", category: "Website", icon: Settings, keywords: ["header", "footer", "navigation", "menu", "links"] },
  { id: "website-offers", label: "Offers & Layout", category: "Website", icon: Settings, keywords: ["offers", "promotions", "deals", "layout"] },
  { id: "website-banners", label: "Banners & Sliders", category: "Website", icon: Image, keywords: ["banners", "sliders", "carousel", "hero", "promotional"] },
  { id: "website-branding", label: "Logo & Branding", category: "Website", icon: Palette, keywords: ["logo", "branding", "favicon", "colors", "identity"] },
  { id: "website-seo", label: "SEO Settings", category: "Website", icon: Settings, keywords: ["seo", "meta", "title", "description", "keywords", "sitemap"] },
  
  // Social Proof
  { id: "socialproof-reviews", label: "Google Reviews", category: "Social Proof", icon: MessageSquare, keywords: ["reviews", "google", "ratings", "testimonials"] },
  { id: "socialproof-stories", label: "Delivery Stories", category: "Social Proof", icon: Image, keywords: ["delivery", "stories", "customers", "success"] },
  
  // Services
  { id: "services-hsrp", label: "HSRP & FASTag", category: "Services", icon: Shield, keywords: ["hsrp", "fastag", "registration", "plate", "number plate"] },
  { id: "services-rentals", label: "Self-Drive Rentals", category: "Services", icon: Car, keywords: ["rental", "self-drive", "hire", "booking"] },
  { id: "services-driver-bookings", label: "Driver Bookings", category: "Services", icon: Car, keywords: ["driver", "chauffeur", "booking", "hire"] },
  { id: "services-api-partners", label: "API Partners", category: "Services", icon: Globe, keywords: ["api", "partners", "integration", "webhook"] },
  { id: "services-insurance", label: "Insurance", category: "Services", icon: FileText, keywords: ["insurance", "policy", "coverage", "claim"] },
  { id: "services-loans", label: "Car Loans", category: "Services", icon: CreditCard, keywords: ["loan", "finance", "emi", "interest", "bank"] },
  { id: "services-discounts", label: "Discount Presets", category: "Services", icon: Tags, keywords: ["discount", "coupon", "offer", "deal", "preset"] },
  { id: "services-emi-pdf", label: "EMI PDF Settings", category: "Services", icon: FileText, keywords: ["emi", "pdf", "quote", "document"] },
  { id: "services-quote-generator", label: "Manual Quote", category: "Services", icon: FileText, keywords: ["quote", "manual", "estimate", "proposal"] },
  
  // E-Commerce
  { id: "ecommerce-accessories", label: "Accessories", category: "E-Commerce", icon: Package, keywords: ["accessories", "products", "shop", "store", "add-on"] },
  { id: "ecommerce-orders", label: "Orders", category: "E-Commerce", icon: FileText, keywords: ["orders", "purchases", "transactions", "shipment"] },
  { id: "ecommerce-crosssell", label: "Cross-Sell", category: "E-Commerce", icon: Tags, keywords: ["cross-sell", "upsell", "recommend", "bundle"] },
  
  // Content
  { id: "content-blog", label: "Blog Posts", category: "Content", icon: FileText, keywords: ["blog", "article", "post", "write", "publish"] },
  { id: "content-news", label: "Auto News", category: "Content", icon: FileText, keywords: ["news", "automotive", "latest", "updates"] },
  { id: "content-launches", label: "Launches & Upcoming", category: "Content", icon: Car, keywords: ["launch", "upcoming", "new", "release", "debut"] },
  { id: "content-ai", label: "AI Content Hub", category: "Content", icon: Brain, keywords: ["ai", "generate", "content", "write", "create"] },
  { id: "content-intelligence", label: "Auto Intelligence", category: "Content", icon: Sparkles, keywords: ["intelligence", "insights", "data", "ai"] },
  
  // Marketing
  { id: "marketing-templates", label: "WhatsApp Templates", category: "Marketing", icon: MessageSquare, keywords: ["whatsapp", "templates", "message", "broadcast"] },
  { id: "marketing-automation", label: "Email Automation", category: "Marketing", icon: Settings, keywords: ["email", "automation", "drip", "sequence", "campaign"] },
  { id: "marketing-email", label: "Email Campaigns", category: "Marketing", icon: MessageSquare, keywords: ["email", "campaign", "newsletter", "blast"] },
  { id: "marketing-bulk", label: "Bulk Data Manager", category: "Marketing", icon: Settings, keywords: ["bulk", "data", "export", "import", "csv"] },
  
  // Integrations
  { id: "integrations-api", label: "API Portal", category: "Integrations", icon: Settings, keywords: ["api", "endpoint", "webhook", "key", "token"] },
  { id: "integrations-whatsapp", label: "WhatsApp API", category: "Integrations", icon: MessageSquare, keywords: ["whatsapp", "api", "finbite", "config"] },
  { id: "integrations-chatbot", label: "AI Chatbot", category: "Integrations", icon: Brain, keywords: ["chatbot", "ai", "assistant", "conversation"] },
  
  // Settings
  { id: "profile-business", label: "Business Profile", category: "Settings", icon: Settings, keywords: ["business", "profile", "company", "name", "address"] },
  { id: "profile-logo", label: "Logo & Branding", category: "Settings", icon: Palette, keywords: ["logo", "brand", "identity", "favicon"] },
  { id: "profile-users", label: "User Management", category: "Settings", icon: Users, keywords: ["users", "team", "roles", "permissions", "access"] },
  { id: "roles", label: "User Roles", category: "Settings", icon: Shield, keywords: ["roles", "admin", "super admin", "sales", "dealer", "finance"] },
  { id: "settings", label: "Settings", category: "Settings", icon: Settings, keywords: ["settings", "configuration", "preferences", "general"] },
];

interface AdminGlobalSearchProps {
  onNavigate: (tabId: string) => void;
  activeVerticalSlug?: string | null;
}

// Map search items to their vertical
const itemVerticalMap: Record<string, string[]> = {
  "cars-list": ["car-database"], "cars-brands": ["car-database"], "cars-ai-entry": ["car-database"],
  "cars-bulk-import": ["car-database"], "cars-quick-import": ["car-database"], "cars-city-pricing": ["car-database"],
  "cars-attributes": ["car-database"], "cars-colors": ["car-database"], "cars-image-sync": ["car-database"],
  "cars-images": ["car-database"], "cars-variants": ["car-database"], "cars-pricing": ["car-database"],
  "cars-migration": ["car-database"], "cars-ai": ["car-database"],
};

export const AdminGlobalSearch = ({ onNavigate, activeVerticalSlug }: AdminGlobalSearchProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Filter items by active vertical
  const verticalFilteredItems = useMemo(() => {
    return allSearchItems.filter(item => {
      const verticals = itemVerticalMap[item.id];
      if (!verticals) return true; // universal items
      if (!activeVerticalSlug) return false; // no vertical active, hide vertical-specific
      return verticals.includes(activeVerticalSlug);
    });
  }, [activeVerticalSlug]);

  const results = useMemo(() => {
    if (!query.trim()) return verticalFilteredItems.slice(0, 10);
    const q = query.toLowerCase();
    return verticalFilteredItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    );
  }, [query, verticalFilteredItems]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (id: string) => {
    onNavigate(id);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Group results by category
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    results.forEach(r => {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    });
    return map;
  }, [results]);

  let flatIndex = 0;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-lg border hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search anything...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search cars, images, pages, settings..."
              className="border-0 focus-visible:ring-0 shadow-none h-12"
            />
            {query && (
              <button onClick={() => setQuery("")} className="shrink-0">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No results for "{query}"
              </div>
            ) : (
              Array.from(grouped.entries()).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                    {category}
                  </div>
                  {items.map(item => {
                    const currentIndex = flatIndex++;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                          currentIndex === selectedIndex
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
