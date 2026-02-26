import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Users, Target, Zap, BarChart3, Phone, FileText, CheckCircle2, Search, Database, Tags } from "lucide-react";
import { LeadManagement } from "../LeadManagement";
import { UnifiedCarManagement } from "../UnifiedCarManagement";
import { ManualQuoteGenerator } from "../ManualQuoteGenerator";
import { DiscountManagement } from "../DiscountManagement";
import { CarColorManagement } from "../CarColorManagement";
import { BrandsManagement } from "../BrandsManagement";

export function SalesVerticalWorkspace() {
  const [activeTab, setActiveTab] = useState("leads");

  const tabs = [
    { id: "leads", label: "Lead Management", icon: Users },
    { id: "cars", label: "Car Catalog", icon: Car },
    { id: "brands", label: "Brands", icon: Database },
    { id: "colors", label: "Colors & Media", icon: Tags },
    { id: "quotes", label: "Quote Generator", icon: FileText },
    { id: "discounts", label: "Discount Presets", icon: Tags },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "leads": return <LeadManagement verticalCategory="car_inquiry" />;
      case "cars": return <UnifiedCarManagement />;
      case "brands": return <BrandsManagement />;
      case "colors": return <CarColorManagement />;
      case "quotes": return <ManualQuoteGenerator />;
      case "discounts": return <DiscountManagement />;
      default: return <LeadManagement verticalCategory="car_inquiry" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 dark:border-blue-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Car Sales Vertical</h2>
                <p className="text-xs text-muted-foreground">Lead Pipeline, Car Catalog, Quotes, Discounts & Sales CRM</p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={`gap-1.5 text-xs h-8 shrink-0 ${activeTab === tab.id ? "" : ""}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div>{renderContent()}</div>
    </div>
  );
}
