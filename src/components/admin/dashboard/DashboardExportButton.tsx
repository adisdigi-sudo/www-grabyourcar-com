import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Sheet } from "lucide-react";
import { downloadCSV } from "@/lib/dashboardExport";
import { downloadPDF } from "@/lib/dashboardExportPDF";

interface DashboardExportButtonProps {
  data: {
    dateRange: { from: Date; to: Date };
    stats?: any;
    leadsTrend?: any[];
    leadSources?: any[];
    funnelData?: any[];
    revenueData?: any[];
    performanceData?: any;
  };
}

export const DashboardExportButton = ({ data }: DashboardExportButtonProps) => {
  const handleExportCSV = () => {
    downloadCSV(data);
  };

  const handleExportPDF = () => {
    downloadPDF(data);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
          <Sheet className="mr-2 h-4 w-4" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
