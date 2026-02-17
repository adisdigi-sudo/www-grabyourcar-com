import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const CSV_TEMPLATE = `customer_name,phone,loan_amount,car_model,source,priority,city,remarks
John Doe,9876543210,800000,Maruti Swift,Website,medium,Delhi,Interested in quick processing
Jane Smith,9876543211,1200000,Hyundai Creta,Referral,hot,Mumbai,Pre-approved customer`;

export const LoanBulkImport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loan_leads_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { rows: [], errors: ['File must have header + at least 1 data row'] };
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredFields = ['customer_name', 'phone'];
    const missing = requiredFields.filter(f => !headers.includes(f));
    if (missing.length > 0) return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}`] };

    const rows: any[] = [];
    const errs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      if (!row.customer_name) { errs.push(`Row ${i}: Missing customer_name`); continue; }
      if (!row.phone || row.phone.replace(/\D/g, '').length < 10) { errs.push(`Row ${i}: Invalid phone`); continue; }
      rows.push(row);
    }
    return { rows, errors: errs };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors: parseErrors } = parseCSV(text);
      setParsedRows(rows);
      setErrors(parseErrors);
      setParsing(false);
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const BATCH_SIZE = 50;
      let successCount = 0;
      const importErrors: string[] = [];

      // Log the import
      const { data: importLog } = await supabase.from('loan_bulk_imports').insert({
        file_name: 'bulk_import.csv',
        total_rows: parsedRows.length,
        status: 'processing',
        imported_by: user?.id,
      }).select('id').single();

      for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
        const batch = parsedRows.slice(i, i + BATCH_SIZE).map(row => ({
          customer_name: row.customer_name,
          phone: row.phone.replace(/\D/g, ''),
          loan_amount: row.loan_amount ? Number(row.loan_amount) : null,
          car_model: row.car_model || null,
          source: row.source || 'Bulk Import',
          priority: row.priority || 'medium',
          remarks: row.remarks || null,
          stage: 'new_lead',
          lead_source_tag: 'bulk_import',
        }));

        const { error } = await supabase.from('loan_applications').insert(batch);
        if (error) {
          importErrors.push(`Batch ${i / BATCH_SIZE + 1}: ${error.message}`);
        } else {
          successCount += batch.length;
        }
        setImportProgress(Math.round(((i + BATCH_SIZE) / parsedRows.length) * 100));
      }

      // Update import log
      if (importLog?.id) {
        await supabase.from('loan_bulk_imports').update({
          processed_rows: parsedRows.length,
          success_rows: successCount,
          error_rows: parsedRows.length - successCount,
          errors: importErrors,
          status: importErrors.length > 0 ? 'completed_with_errors' : 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', importLog.id);
      }

      return { successCount, errorCount: parsedRows.length - successCount };
    },
    onSuccess: ({ successCount, errorCount }) => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success(`Imported ${successCount} leads${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setOpen(false);
      setParsedRows([]);
      setErrors([]);
      setImportProgress(0);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setParsedRows([]); setErrors([]); setImportProgress(0); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" /> Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Bulk Import Loan Leads
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Download template */}
          <Button variant="outline" onClick={downloadTemplate} className="w-full">
            <Download className="h-4 w-4 mr-2" /> Download CSV Template
          </Button>

          {/* Upload area */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload CSV file</p>
            <p className="text-xs text-muted-foreground mt-1">Required: customer_name, phone</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          </div>

          {/* Parse results */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{parsedRows.length} valid rows</span>
                </div>
                {errors.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{errors.length} errors</Badge>
                )}
              </div>

              {errors.length > 0 && (
                <div className="max-h-24 overflow-y-auto space-y-1 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs">
                  {errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-1 text-red-600">
                      <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      {e}
                    </div>
                  ))}
                </div>
              )}

              {/* Preview first 3 rows */}
              <div className="text-xs space-y-1">
                <p className="font-medium text-muted-foreground">Preview (first 3):</p>
                {parsedRows.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex gap-3 bg-muted/30 rounded px-2 py-1">
                    <span className="font-medium">{r.customer_name}</span>
                    <span className="text-muted-foreground">{r.phone}</span>
                    {r.loan_amount && <span>₹{Number(r.loan_amount).toLocaleString()}</span>}
                    {r.car_model && <span className="text-muted-foreground">{r.car_model}</span>}
                  </div>
                ))}
              </div>

              {/* Import progress */}
              {importMutation.isPending && (
                <div className="space-y-2">
                  <Progress value={importProgress} />
                  <p className="text-xs text-muted-foreground text-center">Importing... {importProgress}%</p>
                </div>
              )}

              {/* Import button */}
              <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending} className="w-full">
                {importMutation.isPending ? "Importing..." : `Import ${parsedRows.length} Leads`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
