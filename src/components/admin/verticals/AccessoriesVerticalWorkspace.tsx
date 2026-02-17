import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, CheckCircle2, ShoppingCart, FileText, Tags } from "lucide-react";
import { AccessoriesManagement } from "../AccessoriesManagement";
import CrossSellManagement from "../CrossSellManagement";

export function AccessoriesVerticalWorkspace() {
  const [activeTab, setActiveTab] = useState("products");

  const tabs = [
    { id: "products", label: "Products & Orders", icon: ShoppingCart },
    { id: "crosssell", label: "Cross-Sell Rules", icon: Tags },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 dark:border-orange-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Accessories & E-Commerce</h2>
                <p className="text-xs text-muted-foreground">Products, Orders, Cross-Sell & Shipping</p>
              </div>
            </div>
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Button key={tab.id} variant={activeTab === tab.id ? "default" : "ghost"} size="sm"
              onClick={() => setActiveTab(tab.id)} className="gap-1.5 text-xs h-8">
              <Icon className="h-3.5 w-3.5" /> {tab.label}
            </Button>
          );
        })}
      </div>

      <div>
        {activeTab === "products" ? <AccessoriesManagement /> : <CrossSellManagement />}
      </div>
    </div>
  );
}
