import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, FileText, Loader2, Upload, X } from "lucide-react";

type PolicyOption = {
  id: string;
  client_id: string;
  policy_number: string | null;
  insurer: string | null;
  policy_document_url: string | null;
  created_at: string;
};

interface InsurancePolicyDocumentUploaderProps {
  defaultPolicyId?: string;
  defaultClientId?: string;
  onDone?: () => void;
}

const normalizePolicyNumber = (value: string) => value.trim().replace(/\s+/g, "-").toUpperCase();

export function InsurancePolicyDocumentUploader({
  defaultPolicyId,
  defaultClientId,
  onDone,
}: InsurancePolicyDocumentUploaderProps) {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(defaultPolicyId || "");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [typedPolicyNumber, setTypedPolicyNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["insurance-policy-doc-uploader", defaultClientId || "all", defaultPolicyId || "none"],
    queryFn: async () => {
      let query = supabase
        .from("insurance_policies")
        .select("id, client_id, policy_number, insurer, policy_document_url, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (defaultPolicyId) {
        query = query.eq("id", defaultPolicyId);
      } else if (defaultClientId) {
        query = query.eq("client_id", defaultClientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PolicyOption[];
    },
  });

  useEffect(() => {
    if (defaultPolicyId) {
      setSelectedPolicyId(defaultPolicyId);
      return;
    }

    if (!selectedPolicyId && policies.length === 1) {
      setSelectedPolicyId(policies[0].id);
    }
  }, [defaultPolicyId, selectedPolicyId, policies]);

  const selectedPolicy = useMemo(
    () => policies.find((p) => p.id === selectedPolicyId) || null,
    [policies, selectedPolicyId]
  );

  const resolvedPolicyNumber = useMemo(() => {
    const manual = normalizePolicyNumber(typedPolicyNumber || "");
    if (manual) return manual;
    return normalizePolicyNumber(selectedPolicy?.policy_number || "");
  }, [selectedPolicy?.policy_number, typedPolicyNumber]);

  const uploadDocument = async () => {
    if (!selectedPolicyId) {
      toast.error("Please select a policy");
      return;
    }
    if (!docFile) {
      toast.error("Please choose a policy document");
      return;
    }

    const finalPolicyNumber = resolvedPolicyNumber;
    if (!finalPolicyNumber) {
      toast.error("Policy number is required. Enter it manually.");
      return;
    }

    setSaving(true);
    try {
      const ext = docFile.name.split(".").pop() || "pdf";
      const safeFileName = `${finalPolicyNumber}.${ext.toLowerCase()}`;
      const filePath = `${selectedPolicyId}/${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("policy-documents")
        .upload(filePath, docFile, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("policy-documents").getPublicUrl(filePath);

      const updatePayload: Record<string, any> = {
        policy_document_url: urlData.publicUrl,
        policy_number: finalPolicyNumber,
        document_file_name: safeFileName,
      };

      const { data: updatedPolicy, error: updateError } = await supabase
        .from("insurance_policies")
        .update(updatePayload as any)
        .eq("id", selectedPolicyId)
        .select("id, client_id, policy_number")
        .single();
      if (updateError) throw updateError;

      await supabase.from("insurance_activity_log").insert({
        client_id: updatedPolicy.client_id,
        policy_id: updatedPolicy.id,
        activity_type: "policy_document_uploaded",
        title: "Policy document uploaded",
        description: `Document uploaded for policy ${updatedPolicy.policy_number || updatedPolicy.id}`,
        metadata: { file_name: safeFileName, upload_source: "manual_upload" },
      });

      toast.success("Policy document uploaded successfully");
      setDocFile(null);
      setTypedPolicyNumber("");
      onDone?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload policy document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading policies...
        </div>
      ) : policies.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          No policy records found for upload.
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Select Policy</Label>
            <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose policy" />
              </SelectTrigger>
              <SelectContent>
                {policies.map((policy) => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {(policy.policy_number || "No Policy No") + " • " + (policy.insurer || "Unknown Insurer")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPolicy?.policy_document_url && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-8 text-xs gap-1"
              onClick={() => window.open(selectedPolicy.policy_document_url!, "_blank")}
            >
              <Eye className="h-3.5 w-3.5" /> View current uploaded document
            </Button>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Policy Document (PDF/Image)</Label>
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-3 bg-primary/5 text-center">
              {docFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium truncate max-w-[190px]">{docFile.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setDocFile(null); setTypedPolicyNumber(""); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Upload policy document only</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 20 * 1024 * 1024) {
                    toast.error("File too large. Max 20MB.");
                    return;
                  }
                  setDocFile(file);
                  setTypedPolicyNumber(extractPolicyNumberFromFileName(file.name));
                }}
              />
              {!docFile && (
                <Button type="button" variant="outline" size="sm" className="mt-2 gap-1 text-xs h-7" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3 w-3" /> Choose File
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Policy Number *</Label>
            <Input
              value={typedPolicyNumber}
              onChange={(e) => setTypedPolicyNumber(e.target.value.toUpperCase())}
              placeholder="Auto-detected from PDF name or enter manually"
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Save the PDF using the policy number as the file name. If the PDF name does not contain it, enter it here.
            </p>
          </div>
        </>
      )}

      <Button onClick={uploadDocument} disabled={saving || !selectedPolicyId || !docFile || policies.length === 0} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload Document"}
      </Button>
    </div>
  );
}