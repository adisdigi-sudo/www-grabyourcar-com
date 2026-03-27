import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, Search, Send, FileText, Download, RefreshCw, CheckCircle,
  XCircle, Car, Shield, Phone, Mail, Zap, Users, AlertTriangle, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseCSV, toCSV, downloadCSVFile } from "@/lib/spreadsheetUtils";
import { useBulkRenewalQuotes, useUpdateBulkQuote } from "@/hooks/useBulkRenewalQuotes";

interface Prospect {
  name: string;
  phone: string;
  vehicle_number: string;
  email?: string;
  city?: string;
}

type Step = "upload" | "processing" | "review" | "campaign";

export function InsuranceRenewalCampaign() {
  const [step, setStep] = useState<Step>("upload");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [batchLabel, setBatchLabel] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enrichmentResult, setEnrichmentResult] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [pasteText, setPasteText] = useState("Anshdeep Singh\t9855924442\thr26ey7114\tAnshduggal997@gmail.com\tGurgram\nparag\t9818284935\tdl3cab2377\thrgyb1@gmail.com\tGurugram\nNitin\t7042050522\thr26et4528\tAdisdigi@gmail.com\tDelhi\nisha\t7206607985\thr26eu1117\tMakethemoney11@gmail.com\tferozepur\nkaran\t9855645947\thr26ey7115\tInsurancegyc@gmail.com\tnoida");
  const fileRef = useRef<HTMLInputElement>(null);

  const currentBatch = enrichmentResult?.batch_label || batchLabel;
  const { data: quotes = [], isLoading: quotesLoading, refetch } = useBulkRenewalQuotes();
  const updateQuote = useUpdateBulkQuote();

  const batchQuotes = quotes.filter(q => q.batch_label === currentBatch);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast.error("CSV must have at least a header row and one data row");
        return;
      }

      const headers = rows[0].map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes("name"));
      const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
      const vehicleIdx = headers.findIndex(h => h.includes("vehicle") || h.includes("registration") || h.includes("reg"));
      const emailIdx = headers.findIndex(h => h.includes("email"));
      const cityIdx = headers.findIndex(h => h.includes("city"));

      if (vehicleIdx === -1) {
        toast.error("CSV must have a 'vehicle_number' or 'registration' column");
        return;
      }

      const parsed: Prospect[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[vehicleIdx]?.trim()) continue;
        parsed.push({
          name: nameIdx >= 0 ? row[nameIdx]?.trim() || "" : "",
          phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() || "" : "",
          vehicle_number: row[vehicleIdx]?.trim() || "",
          email: emailIdx >= 0 ? row[emailIdx]?.trim() || "" : undefined,
          city: cityIdx >= 0 ? row[cityIdx]?.trim() || "" : undefined,
        });
      }

      if (parsed.length === 0) {
        toast.error("No valid records found in CSV");
        return;
      }

      setProspects(parsed);
      setBatchLabel(`Renewal-${new Date().toISOString().split("T")[0]}-${parsed.length}`);
      toast.success(`${parsed.length} prospects loaded from CSV`);
    } catch (err) {
      toast.error("Failed to parse CSV file");
    }
  }, []);

  const handlePasteData = useCallback(() => {
    if (!pasteText.trim()) {
      toast.error("Paste some data first");
      return;
    }
    const lines = pasteText.trim().split("\n").filter(l => l.trim());
    const parsed: Prospect[] = [];
    for (const line of lines) {
      const cols = line.split(/\t|,/).map(c => c.trim());
      if (cols.length < 3) continue;
      // Try to detect: name, phone, vehicle_number, email?, city?
      parsed.push({
        name: cols[0] || "",
        phone: cols[1] || "",
        vehicle_number: cols[2] || "",
        email: cols[3] || undefined,
        city: cols[4] || undefined,
      });
    }
    if (parsed.length === 0) {
      toast.error("No valid rows found. Format: Name, Phone, Vehicle Number (tab or comma separated)");
      return;
    }
    setProspects(parsed);
    setBatchLabel(`Renewal-${new Date().toISOString().split("T")[0]}-${parsed.length}`);
    toast.success(`${parsed.length} prospects loaded`);
  }, [pasteText]);

  const handleEnrich = useCallback(async () => {
    if (prospects.length === 0) return;
    if (prospects.length > 500) {
      toast.error("Max 500 prospects per batch. Please split your CSV.");
      return;
    }

    setProcessing(true);
    setStep("processing");
    setProgress(10);

    try {
      // Simulate progress
      const progressTimer = setInterval(() => {
        setProgress(p => Math.min(p + 2, 90));
      }, 1000);

      const { data, error } = await supabase.functions.invoke("bulk-rc-enrichment", {
        body: { prospects, batch_label: batchLabel },
      });

      clearInterval(progressTimer);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setProgress(100);
      setEnrichmentResult(data);
      await refetch();
      setStep("review");
      toast.success(`${data.inserted} quotes generated! (${data.enriched_via_api} enriched via RC database)`);
    } catch (err: any) {
      toast.error(err.message || "Enrichment failed");
      setStep("upload");
    } finally {
      setProcessing(false);
    }
  }, [prospects, batchLabel, refetch]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === batchQuotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(batchQuotes.map(q => q.id)));
    }
  };

  const handleSendWhatsApp = useCallback(async () => {
    const selected = batchQuotes.filter(q => selectedIds.has(q.id));
    if (selected.length === 0) {
      toast.error("Select at least one quote to send");
      return;
    }

    setSendingCampaign(true);
    let sent = 0;
    let failed = 0;

    for (const quote of selected) {
      if (!quote.phone) { failed++; continue; }

      try {
        const cleanPhone = quote.phone.replace(/\D/g, "").replace(/^91/, "");
        const message = `🚗 *Insurance Renewal Quote*\n\nDear ${quote.customer_name},\n\nYour vehicle *${quote.vehicle_make} ${quote.vehicle_model}* (${quote.vehicle_number}) insurance renewal is due!\n\n📋 *Quote Details:*\n• IDV: ₹${quote.idv?.toLocaleString("en-IN")}\n• OD Premium: ₹${quote.basic_od?.toLocaleString("en-IN")}\n• Third Party: ₹${quote.third_party?.toLocaleString("en-IN")}\n• NCB Discount: ₹${quote.ncb_discount?.toLocaleString("en-IN")}\n💰 *Total Premium: ₹${quote.secure_premium?.toLocaleString("en-IN")}*\n\n_Insurer: ${quote.insurance_company}_\n\nReply YES to proceed or call us for a better deal! 📞\n\n— GrabYourCar Insurance`;

        const { error } = await supabase.functions.invoke("whatsapp-send", {
          body: {
            to: `91${cleanPhone}`,
            message,
            messageType: "text",
          },
        });

        if (error) throw error;

        await updateQuote.mutateAsync({
          id: quote.id,
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString(),
          status: "sent",
        });
        sent++;
      } catch {
        failed++;
      }

      // Small delay between messages
      if (sent + failed < selected.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setSendingCampaign(false);
    await refetch();
    toast.success(`Campaign complete: ${sent} sent, ${failed} failed`);
  }, [batchQuotes, selectedIds, updateQuote, refetch]);

  const downloadTemplate = () => {
    downloadCSVFile(
      [["name", "phone", "vehicle_number", "email", "city"],
       ["Rahul Sharma", "9876543210", "DL01AB1234", "rahul@email.com", "Delhi"],
       ["Priya Gupta", "8765432109", "MH02CD5678", "", "Mumbai"]],
      "renewal_prospects_template.csv"
    );
  };

  const downloadQuotes = () => {
    const data = [
      ["Name", "Phone", "Vehicle", "Make", "Model", "IDV", "OD", "TP", "NCB Discount", "Premium", "Insurer", "Status"],
      ...batchQuotes.map(q => [
        q.customer_name, q.phone, q.vehicle_number, q.vehicle_make, q.vehicle_model,
        String(q.idv), String(q.basic_od), String(q.third_party), String(q.ncb_discount),
        String(q.secure_premium), q.insurance_company, q.status,
      ]),
    ];
    downloadCSVFile(data, `renewal_quotes_${currentBatch}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Prospects Loaded</p>
              <p className="text-xl font-bold">{prospects.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg"><Shield className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Quotes Generated</p>
              <p className="text-xl font-bold">{batchQuotes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Send className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">WhatsApp Sent</p>
              <p className="text-xl font-bold">{batchQuotes.filter(q => q.whatsapp_sent).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg"><Car className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">RC Enriched</p>
              <p className="text-xl font-bold">{enrichmentResult?.enriched_via_api || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Step 1: Upload Prospects CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV or paste data directly. Columns: <strong>Name, Phone, Vehicle Number</strong> (required). 
              Optional: Email, City. Max 500 per batch.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" /> Download Template
              </Button>
              <div>
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="max-w-xs"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Paste Data Section */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
              <Label className="text-sm font-medium">Or Paste Data (Tab / Comma separated)</Label>
              <Textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={"Anshdeep Singh\t9855924442\thr26ey7114\tanshdeep@email.com\tGurugram\nParag\t9818284935\tdl3cab2377\tparag@email.com\tDelhi"}
                rows={5}
                className="font-mono text-xs"
              />
              <Button variant="secondary" size="sm" onClick={handlePasteData} disabled={!pasteText.trim()}>
                <Users className="h-4 w-4 mr-2" /> Load Pasted Data
              </Button>
            </div>

            {prospects.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{prospects.length} prospects loaded</Badge>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Batch Label:</Label>
                    <Input
                      value={batchLabel}
                      onChange={e => setBatchLabel(e.target.value)}
                      className="w-64"
                      placeholder="e.g. March-Delhi-Renewal"
                    />
                  </div>
                </div>

                <ScrollArea className="h-48 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Vehicle No.</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>City</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prospects.slice(0, 20).map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{p.name || "—"}</TableCell>
                          <TableCell>{p.phone || "—"}</TableCell>
                          <TableCell className="font-mono">{p.vehicle_number}</TableCell>
                          <TableCell>{p.email || "—"}</TableCell>
                          <TableCell>{p.city || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {prospects.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ...and {prospects.length - 20} more
                    </p>
                  )}
                </ScrollArea>

                <Button onClick={handleEnrich} size="lg" className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Enrich & Generate {prospects.length} Quotes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Processing */}
      {step === "processing" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing RC Enrichment...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground text-center">
              Looking up vehicle details via RC database & generating renewal quotes...
              <br />This may take {Math.ceil(prospects.length * 1.5 / 60)} minutes for {prospects.length} vehicles.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step: Review & Campaign */}
      {(step === "review" || step === "campaign") && (
        <>
          {enrichmentResult && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Enrichment Complete!</span>
                  <Badge variant="secondary">{enrichmentResult.inserted} quotes</Badge>
                  <Badge variant="outline">{enrichmentResult.enriched_via_api} via RC API</Badge>
                  <Badge variant="outline">{enrichmentResult.mock_fallback} estimated</Badge>
                  {enrichmentResult.errors?.length > 0 && (
                    <Badge variant="destructive">{enrichmentResult.errors.length} errors</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Quotes — {currentBatch}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadQuotes}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setStep("upload"); setProspects([]); setEnrichmentResult(null); }}>
                    <Upload className="h-4 w-4 mr-1" /> New Batch
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {quotesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : batchQuotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No quotes found for this batch</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.size === batchQuotes.length && batchQuotes.length > 0}
                        onCheckedChange={toggleAll}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedIds.size} selected
                      </span>
                    </div>
                    <Button
                      onClick={handleSendWhatsApp}
                      disabled={selectedIds.size === 0 || sendingCampaign}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {sendingCampaign ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send {selectedIds.size} via WhatsApp
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Make/Model</TableHead>
                          <TableHead className="text-right">IDV</TableHead>
                          <TableHead className="text-right">Premium</TableHead>
                          <TableHead>Insurer</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchQuotes.map(q => (
                          <TableRow key={q.id} className={selectedIds.has(q.id) ? "bg-primary/5" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(q.id)}
                                onCheckedChange={() => toggleSelect(q.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{q.customer_name}</TableCell>
                            <TableCell className="font-mono text-sm">{q.phone || "—"}</TableCell>
                            <TableCell className="font-mono text-sm">{q.vehicle_number}</TableCell>
                            <TableCell>{q.vehicle_make} {q.vehicle_model}</TableCell>
                            <TableCell className="text-right">₹{q.idv?.toLocaleString("en-IN")}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              ₹{q.secure_premium?.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell>{q.insurance_company}</TableCell>
                            <TableCell>
                              <Badge variant={
                                q.whatsapp_sent ? "default" :
                                q.status === "draft" ? "secondary" : "outline"
                              }>
                                {q.whatsapp_sent ? "Sent ✓" : q.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
