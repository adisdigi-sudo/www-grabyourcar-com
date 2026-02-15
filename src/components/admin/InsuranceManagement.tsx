import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, HelpCircle, Package, Globe, Users, BarChart3 } from "lucide-react";
import { InsurancePlansAdmin } from "./insurance/InsurancePlansAdmin";
import { InsuranceContentAdmin } from "./insurance/InsuranceContentAdmin";
import { InsuranceFAQsAdmin } from "./insurance/InsuranceFAQsAdmin";
import { InsuranceAddonsAdmin } from "./insurance/InsuranceAddonsAdmin";
import { InsuranceScraperAdmin } from "./insurance/InsuranceScraperAdmin";
import { InsuranceLeadsAdmin } from "./insurance/InsuranceLeadsAdmin";

export function InsuranceManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Insurance Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage all insurance page content, plans, FAQs, add-ons, scraper, and leads
        </p>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="plans" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" />
            Content
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-1.5 text-xs">
            <HelpCircle className="h-3.5 w-3.5" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="addons" className="gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" />
            Add-ons
          </TabsTrigger>
          <TabsTrigger value="scraper" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Scraper
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans"><InsurancePlansAdmin /></TabsContent>
        <TabsContent value="content"><InsuranceContentAdmin /></TabsContent>
        <TabsContent value="faqs"><InsuranceFAQsAdmin /></TabsContent>
        <TabsContent value="addons"><InsuranceAddonsAdmin /></TabsContent>
        <TabsContent value="scraper"><InsuranceScraperAdmin /></TabsContent>
        <TabsContent value="leads"><InsuranceLeadsAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}
