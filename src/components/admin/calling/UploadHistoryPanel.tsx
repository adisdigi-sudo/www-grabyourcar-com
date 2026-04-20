import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UploadHistoryPanelProps {
  verticalSlug: string;
}

/**
 * Permanent Upload History (Point 5)
 * Shows every Excel/CSV/paste import ever performed in this vertical's
 * calling queue. Backed by `auto_dialer_uploads` so records persist
 * forever even after campaigns/contacts are deleted.
 */
export function UploadHistoryPanel({ verticalSlug }: UploadHistoryPanelProps) {
  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ["calling-upload-history", verticalSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_dialer_uploads")
        .select("*, auto_dialer_campaigns(name)")
        .eq("vertical_slug", verticalSlug)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // gentle auto-refresh
  });

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> Permanent Upload History
          </p>
          <Badge variant="outline" className="text-[10px]">
            {uploads.length} import{uploads.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading history…</p>
        ) : uploads.length === 0 ? (
          <div className="text-center py-4">
            <FileSpreadsheet className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
            <p className="text-xs text-muted-foreground">
              No imports yet. Every Excel/CSV upload will appear here permanently.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-56">
            <div className="space-y-1.5">
              {uploads.map((u: any) => {
                const campaignName = u.auto_dialer_campaigns?.name || "—";
                const hasErrors = (u.invalid_rows || 0) > 0 || (u.duplicate_rows || 0) > 0;
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-2 p-2 rounded-md border bg-card/60 hover:bg-muted/40 transition-colors"
                  >
                    <div className="p-1.5 rounded bg-emerald-500/10 shrink-0">
                      {hasErrors ? (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium truncate">{u.filename}</span>
                        <Badge variant="outline" className="text-[9px]">{campaignName}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{u.imported_rows || 0}/{u.total_rows || 0} imported</span>
                        {(u.duplicate_rows || 0) > 0 && (
                          <span className="text-amber-700">• {u.duplicate_rows} dupes</span>
                        )}
                        {(u.invalid_rows || 0) > 0 && (
                          <span className="text-rose-600">• {u.invalid_rows} invalid</span>
                        )}
                        <span>•</span>
                        <span>{u.uploaded_by_email || "system"}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
