import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, CheckCircle2, Users, Globe, FileText, ShieldCheck } from "lucide-react";
import { SelfDriveWorkspace } from "../rentals/SelfDriveWorkspace";
import DriverBookingsManagement from "../DriverBookingsManagement";
import APIPartnersManagement from "../APIPartnersManagement";
import { AgreementManagement } from "../rentals/AgreementManagement";
import { KYCVerificationPanel } from "../rentals/KYCVerificationPanel";


export function RentalVerticalWorkspace() {
  const [activeTab, setActiveTab] = useState("rentals");

  const tabs = [
    { id: "rentals", label: "Self-Drive Rentals", icon: Car },
    { id: "drivers", label: "Driver Bookings", icon: Users },
    { id: "agreements", label: "Agreements", icon: FileText },
    { id: "kyc", label: "KYC Verification", icon: ShieldCheck },
    { id: "partners", label: "API Partners", icon: Globe },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "rentals": return <SelfDriveWorkspace />;
      case "drivers": return <DriverBookingsManagement />;
      case "agreements": return <AgreementManagement />;
      case "kyc": return <KYCVerificationPanel />;
      case "partners": return <APIPartnersManagement />;
      case "messaging": return <OmniMessagingWorkspace context="Self-Drive Rentals" showSettings />;
      default: return <SelfDriveWorkspace />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-cyan-200 dark:border-cyan-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950">
                <Car className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Self-Drive Rental & Fleet</h2>
                <p className="text-xs text-muted-foreground">Pipeline, bookings, agreements, KYC, and partner integrations</p>
              </div>
            </div>
            <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Button key={tab.id} variant={activeTab === tab.id ? "default" : "ghost"} size="sm"
              onClick={() => setActiveTab(tab.id)} className="gap-1.5 text-xs h-8 whitespace-nowrap">
              <Icon className="h-3.5 w-3.5" /> {tab.label}
            </Button>
          );
        })}
      </div>

      <div>{renderContent()}</div>
    </div>
  );
}
