import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle, Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { STAGE_LABELS, STAGE_COLORS, ALLOWED_TRANSITIONS, LOST_REASONS, REQUIRED_DOCUMENTS, type LoanStage } from "./LoanStageConfig";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: any;
}

export const LoanStageChangeModal = ({ open, onOpenChange, application }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [targetStage, setTargetStage] = useState<LoanStage | "">("");
  const [remarks, setRemarks] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [lostRemarks, setLostRemarks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{ type: string; name: string; url: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState("");

  const currentStage = (application?.stage || 'new_lead') as LoanStage;
  const allowedNext = ALLOWED_TRANSITIONS[currentStage] || [];

  const isLost = targetStage === 'lost';
  const isConverted = (targetStage as string) === 'converted';

  // Validation
  const canSubmit = (() => {
    if (!targetStage) return false;
    if (isLost && (!lostReason || !lostRemarks.trim())) return false;
    if (isConverted && uploadedDocs.length < 3) return false; // Min 3 documents for conversion
    return true;
  })();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocType) {
      toast.error("Select a document type first");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${application.id}/${selectedDocType}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('loan-documents').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(path);
      
      setUploadedDocs(prev => [...prev, { type: selectedDocType, name: file.name, url: publicUrl }]);

      // Save to loan_documents table
      await supabase.from('loan_documents').insert({
        application_id: application.id,
        document_type: selectedDocType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_by: user?.id,
      });

      toast.success(`${file.name} uploaded`);
      setSelectedDocType("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const stageChangeMutation = useMutation({
    mutationFn: async () => {
      if (!targetStage) return;
      
      const updates: any = {
        stage: targetStage,
        stage_updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      };

      if (isLost) {
        updates.lost_reason = lostReason;
        updates.lost_remarks = lostRemarks;
      }

      if (isConverted) {
        updates.converted_at = new Date().toISOString();
        updates.documents_uploaded = uploadedDocs.map(d => d.type);

        // Auto-create Client Profile
        const { data: existingClient } = await supabase
          .from('client_profiles')
          .select('id')
          .eq('phone', application.phone)
          .maybeSingle();

        if (!existingClient) {
          const { data: newClient } = await supabase.from('client_profiles').insert({
            customer_name: application.customer_name,
            phone: application.phone,
            email: application.email || null,
            car_model: application.car_model || null,
            lifecycle_stage: 'active_customer',
            source: 'car_loan_conversion',
            notes: `Auto-created from loan conversion. Loan: ₹${application.loan_amount || 0}`,
          }).select('id').single();
          if (newClient) updates.client_profile_id = newClient.id;
        } else {
          updates.client_profile_id = existingClient.id;
        }
      }

      const { error } = await supabase
        .from('loan_applications')
        .update(updates)
        .eq('id', application.id);
      if (error) throw error;

      // Log stage history
      await supabase.from('loan_stage_history').insert({
        application_id: application.id,
        from_stage: currentStage,
        to_stage: targetStage,
        changed_by: user?.id,
        remarks: isLost ? `${lostReason}: ${lostRemarks}` : remarks || null,
        metadata: isConverted ? { documents: uploadedDocs.map(d => d.type) } : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success(`Stage updated to ${STAGE_LABELS[targetStage as LoanStage]}`);
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setTargetStage("");
    setRemarks("");
    setLostReason("");
    setLostRemarks("");
    setUploadedDocs([]);
    setSelectedDocType("");
  };

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move Application — {application.customer_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Current Stage */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Current:</span>
            <Badge className={STAGE_COLORS[currentStage]}>{STAGE_LABELS[currentStage]}</Badge>
          </div>

          {/* Target Stage */}
          <div>
            <Label>Move to Stage *</Label>
            <Select value={targetStage} onValueChange={v => setTargetStage(v as LoanStage)}>
              <SelectTrigger><SelectValue placeholder="Select next stage" /></SelectTrigger>
              <SelectContent>
                {allowedNext.map(s => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      {s === 'lost' ? <XCircle className="h-3.5 w-3.5 text-red-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                      {STAGE_LABELS[s]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* LOST: Mandatory reason + remarks */}
          {isLost && (
            <div className="space-y-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Mandatory: Provide reason for marking as Lost
              </div>
              <div>
                <Label>Lost Reason *</Label>
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {LOST_REASONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Detailed Remarks *</Label>
                <Textarea value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} placeholder="Explain why this lead was lost..." rows={3} />
              </div>
            </div>
          )}

          {/* CONVERTED: Mandatory document upload */}
          {isConverted && (
            <div className="space-y-3 p-4 rounded-lg border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                <Upload className="h-4 w-4" />
                Mandatory: Upload at least 3 documents to convert
              </div>

              {/* Document type selector + upload */}
              <div className="flex gap-2">
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select doc type" /></SelectTrigger>
                  <SelectContent>
                    {REQUIRED_DOCUMENTS.filter(d => !uploadedDocs.some(u => u.type === d.key)).map(d => (
                      <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" disabled={!selectedDocType || uploading} onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                </Button>
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileUpload} />
              </div>

              {/* Uploaded docs list */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-1">
                  {uploadedDocs.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-background rounded px-3 py-1.5 border">
                      <FileText className="h-3.5 w-3.5 text-green-600" />
                      <span className="font-medium">{REQUIRED_DOCUMENTS.find(d => d.key === doc.type)?.label}</span>
                      <span className="text-muted-foreground truncate max-w-[120px]">— {doc.name}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />
                    </div>
                  ))}
                </div>
              )}

              {uploadedDocs.length < 3 && (
                <p className="text-xs text-amber-600">
                  {3 - uploadedDocs.length} more document(s) required
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                ✓ A Client Profile will be auto-created on conversion
              </p>
            </div>
          )}

          {/* General remarks (non-lost, non-converted) */}
          {!isLost && !isConverted && targetStage && (
            <div>
              <Label>Remarks (optional)</Label>
              <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add notes about this stage change..." rows={2} />
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={() => stageChangeMutation.mutate()}
            disabled={!canSubmit || stageChangeMutation.isPending}
            className="w-full"
            variant={isLost ? "destructive" : "default"}
          >
            {stageChangeMutation.isPending ? "Updating..." : isLost ? "Mark as Lost" : isConverted ? "Convert & Create Client" : `Move to ${targetStage ? STAGE_LABELS[targetStage as LoanStage] : '...'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
