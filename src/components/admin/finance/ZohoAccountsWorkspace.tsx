import { useState, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Home, Package, Warehouse, ShoppingCart, Receipt,
  Clock, Landmark, Calculator, BarChart3, FolderOpen,
  ChevronDown, ChevronRight, BookOpen, RefreshCw,
  Globe, Lock, FileText, CreditCard, ArrowLeftRight,
  PiggyBank, Search, Plus, Settings
} from "lucide-react";

// Lazy load sub-modules
const AccountsDashboard = lazy(() => import("./AccountsDashboard").then(m => ({ default: m.AccountsDashboard })));
const AccountsInvoicesModule = lazy(() => import("./AccountsInvoicesModule").then(m => ({ default: m.AccountsInvoicesModule })));
const AccountsExpensesModule = lazy(() => import("./AccountsExpensesModule").then(m => ({ default: m.AccountsExpensesModule })));
const AccountsBillsModule = lazy(() => import("./AccountsBillsModule").then(m => ({ default: m.AccountsBillsModule })));
const AccountsBankingModule = lazy(() => import("./AccountsBankingModule").then(m => ({ default: m.AccountsBankingModule })));
const AccountsChartOfAccounts = lazy(() => import("./AccountsChartOfAccounts").then(m => ({ default: m.AccountsChartOfAccounts })));
const AccountsDeepWorkspace = lazy(() => import("./AccountsDeepWorkspace").then(m => ({ default: m.AccountsDeepWorkspace })));
const FinancialIntelligenceDashboard = lazy(() => import("./FinancialIntelligenceDashboard").then(m => ({ default: m.FinancialIntelligenceDashboard })));
const AccountsPaymentsReceived = lazy(() => import("./AccountsPaymentsReceived"));
const AccountsCreditNotes = lazy(() => import("./AccountsCreditNotes"));
const AccountsEstimates = lazy(() => import("./AccountsEstimates"));
const AccountsPaymentsMade = lazy(() => import("./AccountsPaymentsMade"));
const AccountsVendorCredits = lazy(() => import("./AccountsVendorCredits"));
const AccountsPurchaseOrders = lazy(() => import("./AccountsPurchaseOrders"));
const AccountsItemsModule = lazy(() => import("./AccountsItemsModule"));
const AccountsBudgets = lazy(() => import("./AccountsBudgets"));

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: { id: string; label: string }[];
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "items", label: "Items", icon: Package },
  {
    id: "sales", label: "Sales", icon: ShoppingCart,
    children: [
      { id: "invoices", label: "Invoices" },
      { id: "payments-received", label: "Payments Received" },
      { id: "credit-notes", label: "Credit Notes" },
      { id: "estimates", label: "Estimates" },
    ],
  },
  {
    id: "purchases", label: "Purchases", icon: Receipt,
    children: [
      { id: "bills", label: "Bills" },
      { id: "payments-made", label: "Payments Made" },
      { id: "vendor-credits", label: "Vendor Credits" },
      { id: "purchase-orders", label: "Purchase Orders" },
    ],
  },
  { id: "banking", label: "Banking", icon: Landmark },
  {
    id: "accountant", label: "Accountant", icon: Calculator,
    children: [
      { id: "manual-journals", label: "Manual Journals" },
      { id: "chart-of-accounts", label: "Chart of Accounts" },
      { id: "budgets", label: "Budgets" },
    ],
  },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "documents", label: "Documents", icon: FolderOpen },
];

interface ZohoAccountsWorkspaceProps {
  initialView?: string;
}

export const ZohoAccountsWorkspace = ({ initialView = "home" }: ZohoAccountsWorkspaceProps) => {
  const [activeView, setActiveView] = useState(initialView);
  const [expandedSections, setExpandedSections] = useState<string[]>(["sales", "purchases", "accountant"]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getActiveLabel = () => {
    for (const item of SIDEBAR_ITEMS) {
      if (item.id === activeView) return item.label;
      if (item.children) {
        const child = item.children.find(c => c.id === activeView);
        if (child) return child.label;
      }
    }
    return "Home";
  };

  const renderContent = () => {
    switch (activeView) {
      case "home": return <AccountsDashboard />;
      case "items": return <AccountsItemsModule />;
      case "invoices": return <AccountsInvoicesModule />;
      case "payments-received": return <AccountsPaymentsReceived />;
      case "credit-notes": return <AccountsCreditNotes />;
      case "estimates": return <AccountsEstimates />;
      case "bills": return <AccountsBillsModule />;
      case "payments-made": return <AccountsPaymentsMade />;
      case "vendor-credits": return <AccountsVendorCredits />;
      case "purchase-orders": return <AccountsPurchaseOrders />;
      case "banking": return <AccountsBankingModule />;
      case "manual-journals": return <AccountsDeepWorkspace initialTab="journal" />;
      case "chart-of-accounts": return <AccountsChartOfAccounts />;
      case "budgets": return <AccountsBudgets />;
      case "reports": return <FinancialIntelligenceDashboard />;
      case "documents": return <AccountsDocuments />;
      default: return <AccountsDashboard />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-6">
      {/* Sidebar */}
      <div className="w-[220px] border-r bg-card flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Books</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md border bg-muted/50 outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search in Books (⌘ /)"
            />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {SIDEBAR_ITEMS.map(item => (
              <div key={item.id}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {expandedSections.includes(item.id) ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                    {expandedSections.includes(item.id) && (
                      <div className="ml-5 pl-3 border-l border-muted space-y-0.5">
                        {item.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => setActiveView(child.id)}
                            className={cn(
                              "w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors",
                              activeView === child.id
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            )}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setActiveView(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                      activeView === item.id
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <div className="w-3.5" /> {/* spacer for alignment */}
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            }>
              {renderContent()}
            </Suspense>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Simple documents placeholder
const AccountsDocuments = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold">Documents</h2>
      <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Upload Document</Button>
    </div>
    <div className="border-2 border-dashed rounded-xl p-16 text-center text-muted-foreground">
      <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
      <p className="font-medium">No documents uploaded yet</p>
      <p className="text-sm mt-1">Upload invoices, receipts, and other financial documents</p>
    </div>
  </div>
);

export default ZohoAccountsWorkspace;
