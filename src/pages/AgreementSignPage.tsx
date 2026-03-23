import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAgreementByToken, useAddAgreementHistory, RentalAgreement } from "@/hooks/useRentalAgreements";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle2, FileText, Pen, Type, Upload, ShieldCheck, Car, Phone, Calendar, MapPin, CreditCard } from "lucide-react";

export default function AgreementSignPage() {
  const { token } = useParams<{ token: string }>();
  const { data: agreement, isLoading, error, refetch } = useAgreementByToken(token || null);
  const addHistory = useAddAgreementHistory();

  const [signMode, setSignMode] = useState<"type" | "draw" | null>(null);
  const [typedName, setTypedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // KYC upload state
  const [kycStep, setKycStep] = useState(false);
  const [kycUploads, setKycUploads] = useState<Record<string, { front?: File; back?: File; number: string }>>({
    aadhaar: { number: "" },
    driving_license: { number: "" },
    pan_card: { number: "" },
    address_proof: { number: "" },
  });
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [kycDone, setKycDone] = useState(false);

  // Mark as viewed
  useEffect(() => {
    if (agreement && !agreement.client_viewed_at && agreement.status === "sent") {
      supabase.from("rental_agreements").update({ client_viewed_at: new Date().toISOString(), status: "viewed" } as any).eq("id", agreement.id).then(() => {
        addHistory.mutate({ agreement_id: agreement.id, action: "viewed_by_client", action_by: agreement.customer_name });
      });
    }
  }, [agreement]);

  // Canvas drawing
  useEffect(() => {
    if (signMode === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.lineWidth = 2; ctx.strokeStyle = "#1a1a2e"; ctx.lineCap = "round"; }
    }
  }, [signMode]);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx?.lineTo(x, y);
    ctx?.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!agreement || !agreed) return;
    let sigData = "";
    if (signMode === "type") {
      if (!typedName.trim()) { toast.error("Please type your full name"); return; }
      sigData = typedName;
    } else if (signMode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      sigData = canvas.toDataURL("image/png");
    }

    setSigning(true);
    try {
      await supabase.from("rental_agreements").update({
        client_signed_at: new Date().toISOString(),
        client_signature_type: signMode,
        client_signature_data: sigData,
        client_signed_name: signMode === "type" ? typedName : agreement.customer_name,
        status: "signed",
      } as any).eq("id", agreement.id);

      await addHistory.mutateAsync({
        agreement_id: agreement.id,
        action: "signed_by_client",
        action_by: agreement.customer_name,
        details: { signature_type: signMode },
      });

      setSigned(true);
      toast.success("Agreement signed successfully!");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSigning(false);
    }
  };

  const handleKYCUpload = async () => {
    if (!agreement) return;
    setUploadingKyc(true);
    try {
      for (const [docType, docData] of Object.entries(kycUploads)) {
        if (!docData.front && !docData.number) continue;

        let frontUrl = null;
        let backUrl = null;

        if (docData.front) {
          const path = `${agreement.customer_phone}/${docType}_front_${Date.now()}`;
          const { error: upErr } = await supabase.storage.from("kyc-documents").upload(path, docData.front);
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("kyc-documents").getPublicUrl(path);
            frontUrl = urlData.publicUrl;
          }
        }
        if (docData.back) {
          const path = `${agreement.customer_phone}/${docType}_back_${Date.now()}`;
          const { error: upErr } = await supabase.storage.from("kyc-documents").upload(path, docData.back);
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("kyc-documents").getPublicUrl(path);
            backUrl = urlData.publicUrl;
          }
        }

        if (frontUrl || docData.number) {
          await supabase.from("rental_kyc_documents").insert([{
            agreement_id: agreement.id,
            customer_phone: agreement.customer_phone,
            customer_name: agreement.customer_name,
            document_type: docType,
            document_number: docData.number || null,
            document_front_url: frontUrl,
            document_back_url: backUrl,
            verification_status: "pending",
          }] as any);
        }
      }

      await addHistory.mutateAsync({
        agreement_id: agreement.id,
        action: "kyc_uploaded",
        action_by: agreement.customer_name,
      });

      setKycDone(true);
      toast.success("KYC documents uploaded! Verification in progress.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingKyc(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-gray-950 dark:to-gray-900">
      <div className="animate-pulse text-lg">Loading agreement...</div>
    </div>
  );

  if (error || !agreement) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-950 dark:to-gray-900">
      <Card className="max-w-md"><CardContent className="py-8 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-lg font-bold">Agreement Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1">This link may be expired or invalid.</p>
      </CardContent></Card>
    </div>
  );

  const alreadySigned = !!agreement.client_signed_at || signed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-gray-950 dark:to-gray-900 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
            <Car className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary text-lg" style={{ fontFamily: "'Outfit', sans-serif" }}>GrabYourCar</span>
          </div>
          <h1 className="text-xl font-bold mt-3" style={{ fontFamily: "'Outfit', sans-serif" }}>Self-Drive Rental Agreement</h1>
          <p className="text-sm text-muted-foreground">{agreement.agreement_number}</p>
        </div>

        {/* Agreement Details */}
        <Card className="border-primary/20">
          <CardContent className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Customer</div><div className="font-medium">{agreement.customer_name}</div></div></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Phone</div><div className="font-medium">{agreement.customer_phone}</div></div></div>
              {agreement.vehicle_name && <div className="flex items-center gap-2"><Car className="h-4 w-4 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Vehicle</div><div className="font-medium">{agreement.vehicle_name} {agreement.vehicle_number && `(${agreement.vehicle_number})`}</div></div></div>}
              {agreement.pickup_date && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Pickup</div><div className="font-medium">{agreement.pickup_date}</div></div></div>}
              {agreement.dropoff_date && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Dropoff</div><div className="font-medium">{agreement.dropoff_date}</div></div></div>}
              {agreement.pickup_location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Pickup Location</div><div className="font-medium">{agreement.pickup_location}</div></div></div>}
              <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Rental Amount</div><div className="font-bold text-primary">₹{agreement.rental_amount.toLocaleString()}</div></div></div>
              <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">Security Deposit</div><div className="font-medium">₹{agreement.security_deposit.toLocaleString()}</div></div></div>
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <Card>
          <CardContent className="py-4">
            <h3 className="font-bold text-sm mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>Terms & Conditions</h3>
            <div className="prose prose-sm max-w-none text-xs" style={{ fontFamily: "'Inter', sans-serif" }}
              dangerouslySetInnerHTML={{ __html: agreement.terms_html }} />
          </CardContent>
        </Card>

        {/* Signing Section */}
        {alreadySigned ? (
          <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="py-6 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
              <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-300">Agreement Signed!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Signed by {agreement.client_signed_name || typedName} on {agreement.client_signed_at ? new Date(agreement.client_signed_at).toLocaleString() : "just now"}
              </p>
              {!kycStep && !kycDone && (
                <Button className="mt-4 gap-2" onClick={() => setKycStep(true)}>
                  <Upload className="h-4 w-4" /> Upload KYC Documents
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-4 space-y-4">
              <h3 className="font-bold text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>Sign This Agreement</h3>

              {/* Agree checkbox */}
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-emerald-600" />
                <span>I have read, understood, and agree to all the terms and conditions of this rental agreement.</span>
              </label>

              {agreed && (
                <>
                  <div className="flex gap-2">
                    <Button variant={signMode === "type" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setSignMode("type")}>
                      <Type className="h-3.5 w-3.5" /> Type Name
                    </Button>
                    <Button variant={signMode === "draw" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setSignMode("draw")}>
                      <Pen className="h-3.5 w-3.5" /> Draw Signature
                    </Button>
                  </div>

                  {signMode === "type" && (
                    <div>
                      <Label className="text-xs">Type your full name as signature</Label>
                      <Input value={typedName} onChange={e => setTypedName(e.target.value)} placeholder="Your full legal name" className="mt-1" />
                      {typedName && (
                        <div className="mt-2 p-3 border rounded text-center">
                          <span className="text-2xl italic font-serif">{typedName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {signMode === "draw" && (
                    <div>
                      <Label className="text-xs">Draw your signature below</Label>
                      <canvas ref={canvasRef} width={500} height={150}
                        className="border rounded w-full bg-white cursor-crosshair mt-1 touch-none"
                        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                      />
                      <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-xs mt-1">Clear</Button>
                    </div>
                  )}

                  {signMode && (
                    <Button className="w-full gap-2" size="lg" onClick={handleSign} disabled={signing}>
                      <CheckCircle2 className="h-4 w-4" /> {signing ? "Signing..." : "Sign Agreement"}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* KYC Upload Section */}
        {(kycStep && !kycDone) && (
          <Card>
            <CardContent className="py-4 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>KYC Verification</h3>
              </div>
              <p className="text-xs text-muted-foreground">Please upload the following documents for identity verification.</p>

              {["aadhaar", "driving_license", "pan_card", "address_proof"].map(docType => (
                <div key={docType} className="border rounded p-3 space-y-2">
                  <Label className="text-sm font-medium capitalize">{docType.replace(/_/g, " ")}</Label>
                  <Input placeholder={`${docType.replace(/_/g, " ")} number`}
                    value={kycUploads[docType]?.number || ""}
                    onChange={e => setKycUploads(prev => ({ ...prev, [docType]: { ...prev[docType], number: e.target.value } }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Front</Label>
                      <Input type="file" accept="image/*,.pdf" className="text-xs"
                        onChange={e => setKycUploads(prev => ({ ...prev, [docType]: { ...prev[docType], front: e.target.files?.[0] } }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Back</Label>
                      <Input type="file" accept="image/*,.pdf" className="text-xs"
                        onChange={e => setKycUploads(prev => ({ ...prev, [docType]: { ...prev[docType], back: e.target.files?.[0] } }))}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button className="w-full gap-2" onClick={handleKYCUpload} disabled={uploadingKyc}>
                <Upload className="h-4 w-4" /> {uploadingKyc ? "Uploading..." : "Submit KYC Documents"}
              </Button>
            </CardContent>
          </Card>
        )}

        {kycDone && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="py-6 text-center">
              <ShieldCheck className="h-12 w-12 mx-auto text-blue-500 mb-3" />
              <h3 className="font-bold text-lg text-blue-700 dark:text-blue-300">KYC Submitted!</h3>
              <p className="text-sm text-muted-foreground mt-1">Your documents are under verification. We'll confirm once approved.</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>© {new Date().getFullYear()} GrabYourCar • Self-Drive Rentals</p>
          <p className="mt-1">This is a legally binding digital agreement</p>
        </div>
      </div>
    </div>
  );
}
