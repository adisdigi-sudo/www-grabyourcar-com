import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Globe, Database } from "lucide-react";
import { ExcelCarEntry } from "./ExcelCarEntry";
import { CarDatabaseScraper } from "./CarDatabaseScraper";
import { ExistingCarsManager } from "./ExistingCarsManager";

export const CarDatabaseWorkspace = () => {
  const [activeTab, setActiveTab] = useState("entry");

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b bg-muted/30 px-4 pt-3">
          <TabsList className="h-9">
            <TabsTrigger value="entry" className="gap-1.5 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Add Cars (Excel Style)
            </TabsTrigger>
            <TabsTrigger value="existing" className="gap-1.5 text-xs">
              <Database className="h-3.5 w-3.5" />
              Manage Existing Cars
            </TabsTrigger>
            <TabsTrigger value="scraper" className="gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" />
              URL Scraper
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="entry" className="flex-1 m-0 overflow-hidden">
          <ExcelCarEntry />
        </TabsContent>
        <TabsContent value="existing" className="flex-1 m-0 overflow-auto p-4">
          <ExistingCarsManager />
        </TabsContent>
        <TabsContent value="scraper" className="flex-1 m-0 overflow-auto p-4">
          <CarDatabaseScraper />
        </TabsContent>
      </Tabs>
    </div>
  );
};
