import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  PhoneCall, User, Car, IndianRupee, CheckCircle2, XCircle,
  Upload, FileText, AlertTriangle, Calendar, Download, MessageCircle,
  ArrowRight, Clock, CreditCard, Building2
} from "lucide-react";
import { format } from "date-fns";
import { STAGE_LABELS, STAGE_COLORS, ALLOWED_TRANSITIONS, LOST_REASONS, REQUIRED_DOCUMENTS, type LoanStage } from "./LoanStageConfig";
import { generateEMIPdf, generateEMIWhatsAppMessage, type EMIData } from "@/lib/generateEMIPdf";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";

type Step = 'call_status' | 'stage_update' | 'emi_share' | 'follow_up';
type Disposition = 'connected' | 'not_connected' | 'busy' | 'no_answer' | 'callback_requested' | 'wrong_number';

const DISPOSITIONS: { value: Disposition; label: string; icon: string }[] = [
  { value: 'connected', label: 'Connected', icon: '✅' },
  { value: 'not_connected', label: 'Not Connected', icon: '📵' },
  { value: 'busy', label: 'Busy', icon: '🔴' },
  { value: 'no_answer', label: 'No Answer', icon: '📞' },
  { value: 'callback_requested', label: 'Callback', icon: '🔄' },
  { value: 'wrong_number', label: 'Wrong Number', icon: '❌' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: any;
}

export const LoanCallDispositionModal = ({ open, onOpenChange, application }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // Step state
  const [step, setStep] = useState<Step>('call_status');
  const [disposition, setDisposition] = useState<Disposition | ''>('');

  // Stage update
  const [targetStage, setTargetStage] = useState<LoanStage | ''>('');
  const [remarks, setRemarks] = useState('');

  // Lost
  const [lostReason, setLostReason] = useState('');
  const [lostRemarks, setLostRemarks] = useState('');

  // Approval
  const [approvalResult, setApprovalResult] = useState<'approved' | 'rejected' | ''>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [sanctionAmount, setSanctionAmount] = useState('');

  // Disbursement
  const [disbursementAmount, setDisbursementAmount] = useState('');
  const [disbursementRef, setDisbursementRef] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bankName, setBankName] = useState('');

  // Documents
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{ type: string; name: string; url: string }[]>([]);
  const [selectedDocType, setSelectedDocType] = useState('');

  // Follow-up
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const currentStage = (application?.stage || 'new_lead') as LoanStage;
  const allowedNext = ALLOWED_TRANSITIONS[currentStage] || [];
  const isLost = targetStage === 'lost';
  const isDocStage = ['documents_requested', 'documents_received'].includes(targetStage as string);
  const isApproval = (targetStage as string) === 'approval';
  const isDisbursement = ['disbursement', 'converted'].includes(targetStage as string);

  // File upload handler
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
      await supabase.from('loan_documents').insert({
        application_id: application.id,
        document_type: selectedDocType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_by: user?.id,
      });
      toast.success(`${file.name} uploaded`);
      setSelectedDocType('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // EMI data builder
  const getEMIData = (): EMIData => ({
    loanAmount: Number(application.loan_amount) || Number(disbursementAmount) || 0,
    downPayment: Number(application.down_payment) || 0,
    loanPrincipal: Number(disbursementAmount) || Number(application.loan_amount) || 0,
    interestRate: Number(application.interest_rate) || 8.5,
    tenure: Number(application.tenure_months) || 60,
    emi: Number(application.emi_amount) || 0,
    totalPayment: (Number(application.emi_amount) || 0) * (Number(application.tenure_months) || 60),
    totalInterest: ((Number(application.emi_amount) || 0) * (Number(application.tenure_months) || 60)) - (Number(disbursementAmount) || Number(application.loan_amount) || 0),
    carName: application.car_model || 'Car Loan',
    variantName: application.car_variant || undefined,
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      // 1. Log the call
      await supabase.from('call_logs').insert({
        agent_id: user?.id || '',
        lead_phone: application.phone,
        lead_name: application.customer_name,
        lead_id: application.id,
        lead_type: 'loan',
        call_type: 'outbound',
        call_method: 'manual',
        disposition: disposition || null,
        notes: remarks || followUpNotes || null,
        follow_up_at: followUpDate ? `${followUpDate}T${followUpTime}:00` : null,
        follow_up_priority: followUpDate ? 'medium' : null,
        lead_stage_before: currentStage,
        lead_stage_after: targetStage || currentStage,
      });

      // 2. Update loan application if stage changed
      if (targetStage && disposition === 'connected') {
        const updates: any = {
          stage: targetStage,
          stage_updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          remarks: remarks || null,
        };

        if (followUpDate) {
          updates.follow_up_at = `${followUpDate}T${followUpTime}:00`;
          updates.follow_up_notes = followUpNotes || null;
        }

        if (isLost) {
          updates.lost_reason = lostReason;
          updates.lost_remarks = lostRemarks;
        }

        if (isApproval) {
          if (approvalResult === 'rejected') {
            updates.rejection_reason = rejectionReason;
            updates.stage = 'lost';
          } else {
            updates.sanction_amount = Number(sanctionAmount) || null;
            updates.sanction_date = new Date().toISOString();
          }
        }

        if (isDisbursement) {
          updates.disbursement_amount = Number(disbursementAmount) || null;
          updates.disbursement_reference = disbursementRef || null;
          updates.disbursement_date = disbursementDate || null;
          updates.lender_name = bankName || null;
          if ((targetStage as string) === 'converted') {
            updates.converted_at = new Date().toISOString();
            updates.documents_uploaded = uploadedDocs.map(d => d.type);

            // Auto-create client profile
            const { data: existing } = await supabase
              .from('client_profiles')
              .select('id')
              .eq('phone', application.phone)
              .maybeSingle();

            if (!existing) {
              const { data: newClient } = await supabase.from('client_profiles').insert({
                customer_name: application.customer_name,
                phone: application.phone,
                email: application.email || null,
                car_model: application.car_model || null,
                lifecycle_stage: 'active_customer',
                source: 'car_loan_conversion',
                notes: `Loan disbursed: ₹${disbursementAmount}`,
              }).select('id').single();
              if (newClient) updates.client_profile_id = newClient.id;
            } else {
              updates.client_profile_id = existing.id;
            }
          }
        }

        const { error } = await supabase
          .from('loan_applications')
          .update(updates)
          .eq('id', application.id);
        if (error) throw error;

        // 3. Log stage history
        const finalStage = (isApproval && approvalResult === 'rejected') ? 'lost' : targetStage;
        await supabase.from('loan_stage_history').insert({
          application_id: application.id,
          from_stage: currentStage,
          to_stage: finalStage,
          changed_by: user?.id,
          remarks: isLost ? `${lostReason}: ${lostRemarks}` : remarks || null,
        });

        // 4. WhatsApp triggers
        const eventMap: Record<string, string> = {
          contacted: 'loan_contacted',
          qualified: 'loan_qualified',
          eligibility_check: 'loan_eligibility_started',
          offer_shared: 'loan_offer_shared',
          documents_requested: 'loan_docs_reminder',
          approval: 'loan_approved',
          disbursement: 'loan_disbursed',
          converted: 'loan_converted',
          lost: 'loan_lost',
        };
        const eventName = eventMap[finalStage];
        if (eventName) {
          triggerWhatsApp({
            event: eventName,
            phone: application.phone,
            name: application.customer_name,
            leadId: application.id,
            data: {
              stage: finalStage,
              loan_amount: String(application.loan_amount || ''),
              car_model: application.car_model || '',
              bank: bankName || application.lender_name || '',
            },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      queryClient.invalidateQueries({ queryKey: ['loan-calls-today'] });
      toast.success(targetStage
        ? `Call logged & stage updated to ${STAGE_LABELS[targetStage as LoanStage] || targetStage}`
        : `Call logged — ${disposition}`
      );
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setStep('call_status');
    setDisposition('');
    setTargetStage('');
    setRemarks('');
    setLostReason('');
    setLostRemarks('');
    setApprovalResult('');
    setRejectionReason('');
    setSanctionAmount('');
    setDisbursementAmount('');
    setDisbursementRef('');
    setDisbursementDate(format(new Date(), 'yyyy-MM-dd'));
    setBankName('');
    setUploadedDocs([]);
    setSelectedDocType('');
    setFollowUpDate('');
    setFollowUpTime('10:00');
    setFollowUpNotes('');
  };

  const handleDispositionSelect = (d: Disposition) => {
    setDisposition(d);
    if (d === 'connected') {
      setStep('stage_update');
    } else {
      setStep('follow_up');
    }
  };

  const handleStageNext = () => {
    if (isDisbursement && disbursementAmount) {
      setStep('emi_share');
    } else {
      setStep('follow_up');
    }
  };

  const canSubmitStage = (() => {
    if (!targetStage) return false;
    if (isLost && (!lostReason || !lostRemarks.trim())) return false;
    if (isApproval && !approvalResult) return false;
    if (isApproval && approvalResult === 'rejected' && !rejectionReason.trim()) return false;
    if (isDisbursement && !disbursementAmount) return false;
    return true;
  })();

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            Loan Call — {application.customer_name}
          </DialogTitle>
        </DialogHeader>

        {/* Client Info Header */}
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{application.customer_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{application.phone}</span>
                  {application.car_model && <span>• <Car className="h-3 w-3 inline" /> {application.car_model}</span>}
                  {application.loan_amount && <span>• ₹{(application.loan_amount / 100000).toFixed(1)}L</span>}
                </div>
              </div>
              <Badge className={STAGE_COLORS[currentStage]}>{STAGE_LABELS[currentStage]}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {['call_status', 'stage_update', 'emi_share', 'follow_up'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-3 w-3" />}
              <span className={`px-2 py-0.5 rounded-full ${step === s ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {s === 'call_status' ? 'Call' : s === 'stage_update' ? 'Stage' : s === 'emi_share' ? 'EMI' : 'Follow-up'}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* STEP 1: Call Status */}
          {step === 'call_status' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Call Outcome</Label>
              <div className="grid grid-cols-2 gap-2">
                {DISPOSITIONS.map(d => (
                  <Button
                    key={d.value}
                    variant={disposition === d.value ? 'default' : 'outline'}
                    className="justify-start gap-2 h-auto py-3"
                    onClick={() => handleDispositionSelect(d.value)}
                  >
                    <span className="text-lg">{d.icon}</span>
                    <span className="text-sm">{d.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Stage Update (if connected) */}
          {step === 'stage_update' && (
            <div className="space-y-4">
              <div>
                <Label>Move to Stage</Label>
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

              {/* Document Upload Section */}
              {isDocStage && (
                <div className="space-y-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                    <Upload className="h-4 w-4" /> Upload Documents
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Doc type" /></SelectTrigger>
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
                  {uploadedDocs.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-background rounded px-3 py-1.5 border">
                      <FileText className="h-3.5 w-3.5 text-green-600" />
                      <span className="font-medium text-xs">{REQUIRED_DOCUMENTS.find(d => d.key === doc.type)?.label}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />
                    </div>
                  ))}
                </div>
              )}

              {/* Lost Section */}
              {isLost && (
                <div className="space-y-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" /> Mark as Lost
                  </div>
                  <Select value={lostReason} onValueChange={setLostReason}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      {LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} placeholder="Detailed remarks..." rows={2} />
                </div>
              )}

              {/* Approval Section */}
              {isApproval && (
                <div className="space-y-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Approval Decision
                  </div>
                  <RadioGroup value={approvalResult} onValueChange={v => setApprovalResult(v as 'approved' | 'rejected')}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="approved" id="approved" />
                        <Label htmlFor="approved" className="text-green-600 font-medium">✅ Approved</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="rejected" id="rejected" />
                        <Label htmlFor="rejected" className="text-red-600 font-medium">❌ Rejected</Label>
                      </div>
                    </div>
                  </RadioGroup>
                  {approvalResult === 'approved' && (
                    <div>
                      <Label className="text-xs">Sanction Amount</Label>
                      <Input type="number" value={sanctionAmount} onChange={e => setSanctionAmount(e.target.value)} placeholder="₹ Sanction amount" />
                    </div>
                  )}
                  {approvalResult === 'rejected' && (
                    <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Rejection reason..." rows={2} />
                  )}
                </div>
              )}

              {/* Disbursement Section */}
              {isDisbursement && (
                <div className="space-y-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                    <CreditCard className="h-4 w-4" /> Disbursement Details
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Amount *</Label>
                      <Input type="number" value={disbursementAmount} onChange={e => setDisbursementAmount(e.target.value)} placeholder="₹ Amount" />
                    </div>
                    <div>
                      <Label className="text-xs">Bank Name</Label>
                      <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name" />
                    </div>
                    <div>
                      <Label className="text-xs">Reference No.</Label>
                      <Input value={disbursementRef} onChange={e => setDisbursementRef(e.target.value)} placeholder="Ref number" />
                    </div>
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={disbursementDate} onChange={e => setDisbursementDate(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* General remarks */}
              {!isLost && !isDisbursement && !isApproval && targetStage && (
                <div>
                  <Label className="text-xs">Remarks</Label>
                  <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Notes..." rows={2} />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('call_status')}>
                  ← Back
                </Button>
                <Button className="flex-1" disabled={!canSubmitStage} onClick={handleStageNext}>
                  {isDisbursement && disbursementAmount ? 'Next: EMI Share →' : 'Next: Follow-up →'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: EMI Share */}
          {step === 'emi_share' && (
            <div className="space-y-4">
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <IndianRupee className="h-4 w-4" /> EMI Summary
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loan Amount</span>
                      <span className="font-semibold">₹{Number(disbursementAmount || application.loan_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interest Rate</span>
                      <span className="font-semibold">{application.interest_rate || 8.5}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tenure</span>
                      <span className="font-semibold">{application.tenure_months || 60} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">EMI</span>
                      <span className="font-semibold text-emerald-600">₹{Number(application.emi_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                      onClick={() => {
                        generateEMIPdf(getEMIData());
                        toast.success("EMI PDF downloaded!");
                      }}
                    >
                      <Download className="h-4 w-4" /> Download PDF
                    </Button>
                    <Button
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const msg = generateEMIWhatsAppMessage(getEMIData());
                        const phone = application.phone.replace(/\D/g, '').slice(-10);
                        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                    >
                      <MessageCircle className="h-4 w-4" /> Share on WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('stage_update')}>← Back</Button>
                <Button className="flex-1" onClick={() => setStep('follow_up')}>Next: Follow-up →</Button>
              </div>
            </div>
          )}

          {/* STEP 4: Follow-up & Submit */}
          {step === 'follow_up' && (
            <div className="space-y-4">
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-primary" /> Schedule Follow-up (Optional)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Time</Label>
                    <Input type="time" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)} placeholder="Follow-up notes..." rows={2} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  if (disposition === 'connected') {
                    setStep(isDisbursement && disbursementAmount ? 'emi_share' : 'stage_update');
                  } else {
                    setStep('call_status');
                  }
                }}>
                  ← Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={submitMutation.isPending}
                  variant={isLost ? 'destructive' : 'default'}
                  onClick={() => submitMutation.mutate()}
                >
                  {submitMutation.isPending ? "Saving..." : "Submit Call Log"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
