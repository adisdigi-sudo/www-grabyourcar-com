import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Grid3X3,
  ShoppingCart,
  Users,
  Tags,
  Repeat,
  Settings,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AccessoriesEcomDashboard } from "./AccessoriesEcomDashboard";
import { AccessoriesProductsPanel } from "./AccessoriesProductsPanel";
import { AccessoriesCategoriesPanel } from "./AccessoriesCategoriesPanel";
import { AccessoriesOrdersPanel } from "./AccessoriesOrdersPanel";
import { AccessoriesCustomersPanel } from "./AccessoriesCustomersPanel";
import { AccessoriesDiscountCodesPanel } from "./AccessoriesDiscountCodesPanel";
import { AccessoriesCrossSellPanel } from "./AccessoriesCrossSellPanel";
import { AccessoriesSettingsPanel } from "./AccessoriesSettingsPanel";
import { AccessoriesTrackingPanel } from "./AccessoriesTrackingPanel";
import { AdminLivePreview, PreviewToggleButton } from "../shared/AdminLivePreview";

const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Grid3X3 },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "tracking", label: "Tracking", icon: Truck },
  { id: "customers", label: "Customers", icon: Users },
  { id: "discounts", label: "Discount Codes", icon: Tags },
  { id: "crosssell", label: "Cross-Sell", icon: Repeat },
  { id: "settings", label: "Site Settings", icon: Settings },
] as const;

type PanelId = (typeof SIDEBAR_ITEMS)[number]["id"];

export function AccessoriesEcommerceWorkspace() {
  const [activePanel, setActivePanel] = useState<PanelId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const renderPanel = () => {
    switch (activePanel) {
      case "dashboard":
        return <AccessoriesEcomDashboard onNavigate={setActivePanel as any} />;
      case "products":
        return <AccessoriesProductsPanel />;
      case "categories":
        return <AccessoriesCategoriesPanel />;
      case "orders":
        return <AccessoriesOrdersPanel />;
      case "tracking":
        return <AccessoriesTrackingPanel />;
      case "customers":
        return <AccessoriesCustomersPanel />;
      case "discounts":
        return <AccessoriesDiscountCodesPanel />;
      case "crosssell":
        return <AccessoriesCrossSellPanel />;
      case "settings":
        return <AccessoriesSettingsPanel />;
      default:
        return <AccessoriesEcomDashboard onNavigate={setActivePanel as any} />;
    }
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "border-r border-border bg-card flex flex-col transition-all duration-200 shrink-0",
          collapsed ? "w-14" : "w-52"
        )}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="font-bold text-sm text-primary">ACCESSORIES</h2>
              <p className="text-[10px] text-muted-foreground">E-Commerce Panel</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-accent text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div />
          <PreviewToggleButton isOpen={previewOpen} onToggle={() => setPreviewOpen(!previewOpen)} />
        </div>
        {renderPanel()}
      </main>

      {/* Live Preview Panel */}
      <AdminLivePreview
        previewPath="/accessories"
        label="Accessories Store Preview"
        isOpen={previewOpen}
        onToggle={() => setPreviewOpen(false)}
      />
    </div>
  );
}
