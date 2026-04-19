import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Download, Send, FileText } from "lucide-react";
import { toast } from "sonner";

type Item = { description: string; quantity: number; rate: number };

type DocType = "invoice" | "receipt" | "salary_slip" | "offer_letter";

const today = () => new Date().toISOString().slice(0, 10);

export const HRLiveDocumentEditor = () => {
  const [docType, setDocType] = useState<DocType>("invoice");
  const [doc, setDoc] = useState({
    number: `GYC-${docType.toUpperCase()}-${Date.now().toString().slice(-6)}`,
    date: today(),
    party_name: "",
    party_phone: "",
    party_email: "",
    party_address: "",
    items: [{ description: "", quantity: 1, rate: 0 } as Item],
    notes: "",
    // Salary fields
    employee_id: "",
    designation: "",
    month: today().slice(0, 7),
    basic: 0,
    hra: 0,
    allowances: 0,
    deductions: 0,
    // Offer letter
    role: "",
    ctc: 0,
    joining_date: today(),
  });

  const subtotal = useMemo(() => doc.items.reduce((s, i) => s + i.quantity * i.rate, 0), [doc.items]);
  const tax = useMemo(() => Math.round(subtotal * 0.18), [subtotal]);
  const total = subtotal + tax;
  const netSalary = doc.basic + doc.hra + doc.allowances - doc.deductions;

  const updateItem = (idx: number, patch: Partial<Item>) => {
    const items = [...doc.items];
    items[idx] = { ...items[idx], ...patch };
    setDoc({ ...doc, items });
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text(`GrabYourCar — ${docType.replace("_", " ").toUpperCase()}`, 14, 20);
    pdf.setFontSize(10);
    pdf.text(`#${doc.number}`, 14, 28);
    pdf.text(`Date: ${doc.date}`, 14, 34);
    pdf.text(`To: ${doc.party_name}`, 14, 44);
    if (doc.party_phone) pdf.text(`Phone: ${doc.party_phone}`, 14, 50);
    if (doc.party_email) pdf.text(`Email: ${doc.party_email}`, 14, 56);

    let y = 70;
    if (docType === "invoice" || docType === "receipt") {
      pdf.text("Item", 14, y);
      pdf.text("Qty", 100, y);
      pdf.text("Rate", 130, y);
      pdf.text("Amount", 165, y);
      y += 6;
      doc.items.forEach((it) => {
        pdf.text(it.description.slice(0, 50), 14, y);
        pdf.text(String(it.quantity), 100, y);
        pdf.text(String(it.rate), 130, y);
        pdf.text(String(it.quantity * it.rate), 165, y);
        y += 6;
      });
      y += 4;
      pdf.text(`Subtotal: ₹${subtotal}`, 130, y); y += 6;
      pdf.text(`GST 18%: ₹${tax}`, 130, y); y += 6;
      pdf.setFontSize(12);
      pdf.text(`Total: ₹${total}`, 130, y);
    } else if (docType === "salary_slip") {
      pdf.text(`Employee: ${doc.party_name} (${doc.employee_id})`, 14, y); y += 6;
      pdf.text(`Designation: ${doc.designation}`, 14, y); y += 6;
      pdf.text(`Month: ${doc.month}`, 14, y); y += 10;
      pdf.text(`Basic: ₹${doc.basic}`, 14, y); y += 6;
      pdf.text(`HRA: ₹${doc.hra}`, 14, y); y += 6;
      pdf.text(`Allowances: ₹${doc.allowances}`, 14, y); y += 6;
      pdf.text(`Deductions: ₹${doc.deductions}`, 14, y); y += 8;
      pdf.setFontSize(12);
      pdf.text(`Net Salary: ₹${netSalary}`, 14, y);
    } else if (docType === "offer_letter") {
      pdf.text(`Dear ${doc.party_name},`, 14, y); y += 8;
      const body = `We are pleased to offer you the role of ${doc.role} at GrabYourCar with an annual CTC of ₹${doc.ctc}. Your tentative joining date is ${doc.joining_date}.`;
      pdf.text(pdf.splitTextToSize(body, 180), 14, y); y += 30;
      pdf.text("Welcome aboard!", 14, y);
    }

    if (doc.notes) {
      y += 14;
      pdf.setFontSize(9);
      pdf.text(`Notes: ${doc.notes}`, 14, y);
    }

    pdf.save(`${docType}-${doc.number}.pdf`);
    toast.success("PDF downloaded");
  };

  const sendWhatsApp = async () => {
    if (!doc.party_phone) return toast.error("Phone number required");
    toast.success(`Document queued for WhatsApp to ${doc.party_phone}`);
    // Real send hooks into existing wa-pdf-dispatcher in production; UI placeholder
  };

  return (
    <div className="space-y-4 p-4">
      <Tabs value={docType} onValueChange={(v) => setDocType(v as DocType)}>
        <TabsList>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="salary_slip">Salary Slip</TabsTrigger>
          <TabsTrigger value="offer_letter">Offer Letter</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT: form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" /> Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Document #</Label>
                <Input value={doc.number} onChange={(e) => setDoc({ ...doc, number: e.target.value })} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={doc.date} onChange={(e) => setDoc({ ...doc, date: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>{docType === "salary_slip" || docType === "offer_letter" ? "Employee Name" : "Client / Party Name"}</Label>
              <Input value={doc.party_name} onChange={(e) => setDoc({ ...doc, party_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Phone</Label>
                <Input value={doc.party_phone} onChange={(e) => setDoc({ ...doc, party_phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={doc.party_email} onChange={(e) => setDoc({ ...doc, party_email: e.target.value })} />
              </div>
            </div>

            {(docType === "invoice" || docType === "receipt") && (
              <div className="space-y-2">
                <Label>Line Items</Label>
                {doc.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-6" placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                    <Input className="col-span-2" type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                    <Input className="col-span-3" type="number" placeholder="Rate" value={it.rate} onChange={(e) => updateItem(idx, { rate: Number(e.target.value) })} />
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => setDoc({ ...doc, items: doc.items.filter((_, i) => i !== idx) })}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDoc({ ...doc, items: [...doc.items, { description: "", quantity: 1, rate: 0 }] })}>
                  <Plus className="mr-1 size-4" /> Add line
                </Button>
              </div>
            )}

            {docType === "salary_slip" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Employee ID</Label><Input value={doc.employee_id} onChange={(e) => setDoc({ ...doc, employee_id: e.target.value })} /></div>
                <div><Label>Designation</Label><Input value={doc.designation} onChange={(e) => setDoc({ ...doc, designation: e.target.value })} /></div>
                <div><Label>Month</Label><Input type="month" value={doc.month} onChange={(e) => setDoc({ ...doc, month: e.target.value })} /></div>
                <div><Label>Basic</Label><Input type="number" value={doc.basic} onChange={(e) => setDoc({ ...doc, basic: Number(e.target.value) })} /></div>
                <div><Label>HRA</Label><Input type="number" value={doc.hra} onChange={(e) => setDoc({ ...doc, hra: Number(e.target.value) })} /></div>
                <div><Label>Allowances</Label><Input type="number" value={doc.allowances} onChange={(e) => setDoc({ ...doc, allowances: Number(e.target.value) })} /></div>
                <div><Label>Deductions</Label><Input type="number" value={doc.deductions} onChange={(e) => setDoc({ ...doc, deductions: Number(e.target.value) })} /></div>
              </div>
            )}

            {docType === "offer_letter" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Role</Label><Input value={doc.role} onChange={(e) => setDoc({ ...doc, role: e.target.value })} /></div>
                <div><Label>CTC (₹/year)</Label><Input type="number" value={doc.ctc} onChange={(e) => setDoc({ ...doc, ctc: Number(e.target.value) })} /></div>
                <div className="col-span-2"><Label>Joining date</Label><Input type="date" value={doc.joining_date} onChange={(e) => setDoc({ ...doc, joining_date: e.target.value })} /></div>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={doc.notes} onChange={(e) => setDoc({ ...doc, notes: e.target.value })} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={downloadPDF}>
                <Download className="mr-1 size-4" /> Download PDF
              </Button>
              <Button variant="secondary" onClick={sendWhatsApp}>
                <Send className="mr-1 size-4" /> Send via WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: live preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between border-b pb-3">
                <div>
                  <div className="text-xl font-bold tracking-tight">GrabYourCar</div>
                  <div className="text-xs text-muted-foreground">grabyourcar.com</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold uppercase">{docType.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">#{doc.number}</div>
                  <div className="text-xs text-muted-foreground">{doc.date}</div>
                </div>
              </div>

              <div className="mb-4 text-sm">
                <div className="font-semibold">{doc.party_name || "—"}</div>
                {doc.party_phone && <div className="text-muted-foreground">{doc.party_phone}</div>}
                {doc.party_email && <div className="text-muted-foreground">{doc.party_email}</div>}
              </div>

              {(docType === "invoice" || docType === "receipt") && (
                <>
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-1">Item</th>
                        <th className="py-1 text-right">Qty</th>
                        <th className="py-1 text-right">Rate</th>
                        <th className="py-1 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.items.map((it, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-1">{it.description || "—"}</td>
                          <td className="py-1 text-right">{it.quantity}</td>
                          <td className="py-1 text-right">₹{it.rate}</td>
                          <td className="py-1 text-right">₹{it.quantity * it.rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 ml-auto w-48 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>
                    <div className="flex justify-between"><span>GST (18%)</span><span>₹{tax}</span></div>
                    <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>₹{total}</span></div>
                  </div>
                </>
              )}

              {docType === "salary_slip" && (
                <div className="space-y-1 text-sm">
                  <div>Employee ID: <b>{doc.employee_id || "—"}</b></div>
                  <div>Designation: <b>{doc.designation || "—"}</b></div>
                  <div>Month: <b>{doc.month}</b></div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>Basic: ₹{doc.basic}</div>
                    <div>HRA: ₹{doc.hra}</div>
                    <div>Allowances: ₹{doc.allowances}</div>
                    <div>Deductions: ₹{doc.deductions}</div>
                  </div>
                  <div className="mt-3 border-t pt-2 text-base font-semibold">Net Salary: ₹{netSalary}</div>
                </div>
              )}

              {docType === "offer_letter" && (
                <div className="space-y-2 text-sm">
                  <p>Dear <b>{doc.party_name || "Candidate"}</b>,</p>
                  <p>We are pleased to offer you the role of <b>{doc.role || "—"}</b> at GrabYourCar with an annual CTC of <b>₹{doc.ctc}</b>.</p>
                  <p>Your tentative joining date is <b>{doc.joining_date}</b>.</p>
                  <p className="pt-3">Welcome aboard!</p>
                </div>
              )}

              {doc.notes && <div className="mt-4 border-t pt-2 text-xs text-muted-foreground">{doc.notes}</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HRLiveDocumentEditor;
