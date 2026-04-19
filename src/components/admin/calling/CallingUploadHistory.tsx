import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  verticalSlug: string;
  campaignId?: string | null;
}

export function CallingUploadHistory({ verticalSlug, campaignId }: Props) {
  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ["calling-uploads", verticalSlug, campaignId || "all"],
    queryFn: async () => {
      let q = supabase
        .from("auto_dialer_uploads")
        .select("*")
        .eq("vertical_slug", verticalSlug)
        .order("created_at", { ascending: false })
        .limit(50);
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">Loading upload history…</CardContent>
      </Card>
    );
  }

  if (!uploads.length) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <History className="h-8 w-8 mx-auto text-muted-foreground mb-1.5" />
          <p className="text-sm font-medium">No uploads yet</p>
          <p className="text-xs text-muted-foreground">Every CSV/Excel you import will appear here permanently.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Upload History</span>
          <Badge variant="outline" className="ml-auto text-[10px]">{uploads.length} files</Badge>
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {uploads.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{u.filename}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</span>
                  <span>•</span>
                  <span>{u.uploaded_by_email || "system"}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  <Badge variant="outline" className="text-[10px]">{u.imported_rows}/{u.total_rows} imported</Badge>
                  {u.duplicate_rows > 0 && <Badge variant="outline" className="text-[10px]">{u.duplicate_rows} dupes</Badge>}
                  {u.converted_leads > 0 && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{u.converted_leads} → leads</Badge>}
                </div>
              </div>
              {u.storage_url && (
                <Button asChild size="sm" variant="outline" className="gap-1 shrink-0">
                  <a href={u.storage_url} target="_blank" rel="noopener noreferrer" download={u.filename}>
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
