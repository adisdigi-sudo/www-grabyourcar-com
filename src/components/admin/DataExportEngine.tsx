import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Download, FileText, Table2, BarChart3, Loader2, RefreshCw,
  Calendar, Filter, CheckCircle2,
} from "lucide-react";
import { format, subDays } from "date-fns";

interface DataExportEngineProps {
  verticalSlug?: string;
}

// Map vertical slugs to allowed export types
const verticalExportMap: Record<string, string[]> = {
  sales: ["leads", "clients", "activity"],
  insurance: ["insurance", "activity"],
  loans: ["leads", "clients", "activity"],
  hsrp: ["hsrp", "activity"],
  rental: ["rentals", "activity"],
  accessories: ["accessories", "activity"],
  corporate: ["clients", "activity"],
  marketing: ["leads", "clients", "activity"],
};

export const DataExportEngine = ({ verticalSlug }: DataExportEngineProps = {}) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportData = async (type: string) => {
    setExporting(type);
    try {
      let data: any[] = [];
      let filename = "";

      switch (type) {
        case "leads": {
          const { data: leads, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
          if (error) throw error;
          data = leads || [];
          filename = `leads_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;
        }
        case "clients": {
          const { data: clients, error } = await (supabase as any).from("client_profiles").select("*").order("created_at", { ascending: false });
          if (error) throw error;
          data = clients || [];
          filename = `clients_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;
        }
        case "hsrp": {
          const { data: hsrp, error } = await supabase.from("hsrp_bookings").select("*").order("created_at", { ascending: false });
          if (error) throw error;
          data = hsrp || [];
          filename = `hsrp_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;
        }
        case "rentals": {
          const { data: rentals, error } = await supabase.from("rental_bookings").select("*").order("created_at", { ascending: false });
          if (error) throw error;
          data = rentals || [];
          filename = `rentals_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;
        }
        case "accessories": {
          const { data: acc, error } = await supabase.from("accessory_orders").select("*").order("created_at", { ascending: false });
          if (error) throw error;
          data = acc || [];
          filename = `accessories_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;
        }
        case "insurance": {
          const { data: ins, error } = await (supabase as any).from("insurance_leads").select("*").order("created_at", { ascending: false });
          if (error) throw error;
          data = ins || [];
          filename = `insurance_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;
        }
        case "activity": {
          const { data: logs, error } = await supabase.from("admin_activity_logs").select("*").order("created_at", { ascending: false }).limit(500);
          if (error) throw error;
          data = logs || [];
          filename = `activity_log_${format(new Date(), "yyyy-MM-dd")}.csv`;
          break;
        }
        default:
          throw new Error("Unknown export type");
      }

      if (!data.length) {
        toast.error("No data to export");
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(","),
        ...data.map(row =>
          headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            const str = typeof val === "object" ? JSON.stringify(val) : String(val);
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(",")
        ),
      ].join("\n");

      // Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} rows to ${filename}`);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const EXPORT_OPTIONS = [
    { type: "leads", label: "All Leads", icon: "👥", desc: "Customer inquiries, hot/warm/cold leads" },
    { type: "clients", label: "Client Profiles", icon: "🧑‍💼", desc: "Full client lifecycle data" },
    { type: "hsrp", label: "HSRP Bookings", icon: "🏷️", desc: "Number plate registrations" },
    { type: "rentals", label: "Rental Bookings", icon: "🚗", desc: "Self-drive rental orders" },
    { type: "accessories", label: "Accessory Orders", icon: "🛒", desc: "E-commerce orders" },
    { type: "insurance", label: "Insurance Leads", icon: "🛡️", desc: "Insurance inquiries & policies" },
    { type: "activity", label: "Activity Logs", icon: "📋", desc: "Admin actions audit trail" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="h-6 w-6 text-primary" />
          Data Export & Reporting
        </h1>
        <p className="text-muted-foreground text-sm">
          Export any data as CSV for external analysis or backup
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORT_OPTIONS.filter(opt => {
          if (!verticalSlug) return true;
          const allowed = verticalExportMap[verticalSlug];
          return allowed ? allowed.includes(opt.type) : true;
        }).map(opt => (
          <Card key={opt.type} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl mb-1">{opt.icon}</p>
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportData(opt.type)}
                  disabled={exporting === opt.type}
                  className="shrink-0"
                >
                  {exporting === opt.type ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">📊 Open in Excel</p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV files open directly in Excel, Google Sheets, or any spreadsheet tool
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">🔄 Regular Backups</p>
              <p className="text-xs text-muted-foreground mt-1">
                Export leads weekly for backup and offline analysis
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">📧 Share with Team</p>
              <p className="text-xs text-muted-foreground mt-1">
                Export and share reports with your sales team or management
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
