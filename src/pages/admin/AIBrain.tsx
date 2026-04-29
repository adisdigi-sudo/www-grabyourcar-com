import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Upload, Pencil, RefreshCw } from "lucide-react";

const RIYA_PROMPT_KEY = "system_prompt";
const PROMPT_PLACEHOLDER =
  "Tum Riya ho — GrabYourCar.com ki AI sales assistant. Friendly Hinglish me baat karo...";

export default function AIBrain() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🤖 AI Brain</h1>
          <p className="text-sm text-muted-foreground">
            Manage Riya, WhatsApp rules, live sessions and documents in one place.
          </p>
        </div>
      </div>

      <Tabs defaultValue="riya" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="riya">🤖 Riya (Website Bot)</TabsTrigger>
          <TabsTrigger value="rules">📱 WhatsApp Rules</TabsTrigger>
          <TabsTrigger value="sessions">👥 Live Sessions</TabsTrigger>
          <TabsTrigger value="documents">📁 Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="riya" className="mt-4">
          <RiyaPromptTab />
        </TabsContent>
        <TabsContent value="rules" className="mt-4">
          <WhatsAppRulesTab />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <LiveSessionsTab />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────────────────────── Tab 1: Riya prompt ───────────────────────── */
function RiyaPromptTab() {
  const [prompt, setPrompt] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("riya_settings" as any)
        .select("value, updated_at")
        .eq("key", RIYA_PROMPT_KEY)
        .maybeSingle();
      if (!error && data) {
        setPrompt((data as any).value || "");
        setSavedAt((data as any).updated_at || null);
      }
      setLoading(false);
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("riya_settings" as any)
      .upsert({ key: RIYA_PROMPT_KEY, value: prompt, updated_at: new Date().toISOString() } as any, {
        onConflict: "key",
      });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setSavedAt(new Date().toISOString());
    toast({ title: "System prompt saved" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riya — System Prompt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={20}
          value={prompt}
          placeholder={PROMPT_PLACEHOLDER}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          className="font-mono text-xs"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Last saved: {savedAt ? new Date(savedAt).toLocaleString() : "never"}
          </p>
          <Button onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Tab 2: WhatsApp rules ───────────────────────── */
type WaRule = {
  id: string;
  name: string;
  intent_keywords: string[] | null;
  response_content: string | null;
  priority: number | null;
  is_active: boolean | null;
};

function WhatsAppRulesTab() {
  const [rules, setRules] = useState<WaRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WaRule | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wa_chatbot_rules")
      .select("id,name,intent_keywords,response_content,priority,is_active")
      .order("priority", { ascending: false });
    setRules((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (r: WaRule, val: boolean) => {
    setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: val } : x)));
    const { error } = await supabase.from("wa_chatbot_rules").update({ is_active: val }).eq("id", r.id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("wa_chatbot_rules").delete().eq("id", confirmDelete.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setConfirmDelete(null);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>WhatsApp Rules</CardTitle>
        <Button size="sm" onClick={() => setOpenAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead>Response</TableHead>
                <TableHead className="w-20">Priority</TableHead>
                <TableHead className="w-24">Active</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs">{(r.intent_keywords || []).join(", ")}</TableCell>
                  <TableCell className="text-xs max-w-[300px] truncate">
                    {(r.response_content || "").slice(0, 60)}
                    {(r.response_content || "").length > 60 ? "..." : ""}
                  </TableCell>
                  <TableCell>{r.priority ?? 0}</TableCell>
                  <TableCell>
                    <Switch checked={!!r.is_active} onCheckedChange={(v) => toggleActive(r, v)} />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(r)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No rules yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <AddRuleDialog open={openAdd} onClose={() => setOpenAdd(false)} onCreated={load} />

        <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete rule?</DialogTitle></DialogHeader>
            <p className="text-sm">Delete "{confirmDelete?.name}"? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={onDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AddRuleDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [response, setResponse] = useState("");
  const [priority, setPriority] = useState(10);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("wa_chatbot_rules").insert({
      name: name.trim(),
      intent_keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
      response_content: response,
      response_type: "text",
      priority,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    setName(""); setKeywords(""); setResponse(""); setPriority(10);
    onCreated(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add WhatsApp Rule</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Keywords (comma separated)</Label><Input value={keywords} onChange={(e) => setKeywords(e.target.value)} /></div>
          <div><Label>Response</Label><Textarea rows={5} value={response} onChange={(e) => setResponse(e.target.value)} /></div>
          <div><Label>Priority</Label><Input type="number" value={priority} onChange={(e) => setPriority(parseInt(e.target.value || "0", 10))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Tab 3: Live sessions ───────────────────────── */
function LiveSessionsTab() {
  return (
    <Tabs defaultValue="website" className="w-full">
      <TabsList>
        <TabsTrigger value="website">Website (Riya)</TabsTrigger>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
      </TabsList>
      <TabsContent value="website" className="mt-4"><RiyaSessionsList /></TabsContent>
      <TabsContent value="whatsapp" className="mt-4"><WaConversationsList /></TabsContent>
    </Tabs>
  );
}

function RiyaSessionsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    const { data } = await supabase
      .from("riya_chat_sessions")
      .select("id,visitor_phone,vertical_interest,last_message_preview,message_count,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Riya Sessions <Badge variant="secondary" className="ml-2">{rows.length}</Badge></CardTitle>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Last message</TableHead>
              <TableHead className="w-16">Msgs</TableHead>
              <TableHead className="w-40">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.visitor_phone || "—"}</TableCell>
                <TableCell>{r.vertical_interest || "—"}</TableCell>
                <TableCell className="text-xs max-w-[300px] truncate">{r.last_message_preview || "—"}</TableCell>
                <TableCell>{r.message_count ?? 0}</TableCell>
                <TableCell className="text-xs">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No sessions</TableCell></TableRow>}
          </TableBody>
        </Table>)}
      </CardContent>
    </Card>
  );
}

function WaConversationsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    const { data } = await supabase
      .from("wa_conversations")
      .select("id,phone,customer_name,last_message,status,unread_count,last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(200);
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>WhatsApp Conversations <Badge variant="secondary" className="ml-2">{rows.length}</Badge></CardTitle>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Last message</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-20">Unread</TableHead>
              <TableHead className="w-40">Last at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.phone}</TableCell>
                <TableCell>{r.customer_name || "—"}</TableCell>
                <TableCell className="text-xs max-w-[300px] truncate">{r.last_message || "—"}</TableCell>
                <TableCell>{r.status || "—"}</TableCell>
                <TableCell>{r.unread_count ?? 0}</TableCell>
                <TableCell className="text-xs">{r.last_message_at ? new Date(r.last_message_at).toLocaleString() : "—"}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No conversations</TableCell></TableRow>}
          </TableBody>
        </Table>)}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Tab 4: Documents ───────────────────────── */
function DocumentsTab() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <CarBrochuresSection />
      <InsurancePoliciesSection />
    </div>
  );
}

function CarBrochuresSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadFor, setUploadFor] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cars")
      .select("id,name,brand,brochure_url")
      .order("brand", { ascending: true })
      .limit(1000);
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => (r.brand || "").toLowerCase().includes(q) || (r.name || "").toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle>Car Brochures</CardTitle>
        <Input placeholder="Search brand or name" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Brochure</TableHead>
              <TableHead className="w-32">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 200).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.brand}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  {r.brochure_url ? (
                    <a href={r.brochure_url} target="_blank" rel="noreferrer" className="text-primary underline">✅ View</a>
                  ) : "❌"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setUploadFor(r)}>
                    <Upload className="w-4 h-4 mr-1" />Upload PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No cars</TableCell></TableRow>}
          </TableBody>
        </Table>)}

        <UploadDialog
          open={!!uploadFor}
          title={uploadFor ? `Upload brochure: ${uploadFor.brand} ${uploadFor.name}` : ""}
          onClose={() => setUploadFor(null)}
          onUpload={async (file) => {
            if (!uploadFor) return;
            const path = `${uploadFor.id}.pdf`;
            const { error: upErr } = await supabase.storage.from("brochures").upload(path, file, { upsert: true, contentType: "application/pdf" });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from("brochures").getPublicUrl(path);
            const url = data.publicUrl;
            const { error: dbErr } = await supabase.from("cars").update({ brochure_url: url }).eq("id", uploadFor.id);
            if (dbErr) throw dbErr;
            setUploadFor(null);
            load();
          }}
        />
      </CardContent>
    </Card>
  );
}

function InsurancePoliciesSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFor, setUploadFor] = useState<any | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("insurance_policies")
      .select("id,policy_number,expiry_date,insurer,policy_document_url,client_id, insurance_clients!insurance_policies_client_id_fkey(customer_name,vehicle_number)")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Insurance Policies</CardTitle>
        <Button size="sm" onClick={() => setOpenAdd(true)}><Plus className="w-4 h-4 mr-1" />Add Policy</Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Insurer</TableHead>
              <TableHead className="w-20">Doc</TableHead>
              <TableHead className="w-32">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const client = (r as any).insurance_clients || {};
              return (
                <TableRow key={r.id}>
                  <TableCell>{r.policy_number || "—"}</TableCell>
                  <TableCell>{client.customer_name || "—"}</TableCell>
                  <TableCell>{client.vehicle_number || "—"}</TableCell>
                  <TableCell>{r.expiry_date || "—"}</TableCell>
                  <TableCell>{r.insurer || "—"}</TableCell>
                  <TableCell>
                    {r.policy_document_url ? (
                      <a href={r.policy_document_url} target="_blank" rel="noreferrer" className="text-primary underline">✅</a>
                    ) : "❌"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setUploadFor(r)}>
                      <Upload className="w-4 h-4 mr-1" />Upload
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No policies</TableCell></TableRow>}
          </TableBody>
        </Table>)}

        <UploadDialog
          open={!!uploadFor}
          title={uploadFor ? `Upload PDF for ${uploadFor.policy_number || "policy"}` : ""}
          onClose={() => setUploadFor(null)}
          onUpload={async (file) => {
            if (!uploadFor) return;
            const safeNum = (uploadFor.policy_number || uploadFor.id).toString().replace(/[^a-zA-Z0-9_-]/g, "_");
            const path = `${safeNum}.pdf`;
            const { error: upErr } = await supabase.storage.from("policy-docs").upload(path, file, { upsert: true, contentType: "application/pdf" });
            if (upErr) throw upErr;
            const { data: signed } = await supabase.storage.from("policy-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
            const url = signed?.signedUrl || path;
            const { error: dbErr } = await supabase.from("insurance_policies").update({ policy_document_url: url }).eq("id", uploadFor.id);
            if (dbErr) throw dbErr;
            setUploadFor(null);
            load();
          }}
        />

        <AddPolicyDialog open={openAdd} onClose={() => setOpenAdd(false)} onCreated={load} />
      </CardContent>
    </Card>
  );
}

function AddPolicyDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [policyNumber, setPolicyNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [insurer, setInsurer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!policyNumber.trim() || !customerName.trim()) {
      toast({ title: "Policy # and customer name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Find or create insurance_clients row by vehicle_number / phone is unknown; create minimal
      let clientId: string | null = null;
      if (vehicleNumber.trim()) {
        const { data: existing } = await supabase
          .from("insurance_clients")
          .select("id")
          .eq("vehicle_number", vehicleNumber.trim())
          .limit(1)
          .maybeSingle();
        clientId = (existing as any)?.id || null;
      }
      if (!clientId) {
        const { data: newClient, error: cErr } = await supabase
          .from("insurance_clients")
          .insert({ customer_name: customerName.trim(), vehicle_number: vehicleNumber.trim() || null, phone: "0000000000", lead_status: "won", pipeline_stage: "policy_issued" })
          .select("id")
          .single();
        if (cErr) throw cErr;
        clientId = (newClient as any).id;
      }

      let docUrl: string | null = null;
      if (file) {
        const safeNum = policyNumber.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
        const path = `${safeNum}.pdf`;
        const { error: upErr } = await supabase.storage.from("policy-docs").upload(path, file, { upsert: true, contentType: "application/pdf" });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("policy-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
        docUrl = signed?.signedUrl || null;
      }

      const { error: insErr } = await supabase.from("insurance_policies").insert({
        client_id: clientId!,
        policy_number: policyNumber.trim(),
        insurer: insurer.trim() || "Unknown",
        policy_type: "comprehensive",
        expiry_date: expiry || null,
        start_date: new Date().toISOString().slice(0, 10),
        issued_date: new Date().toISOString().slice(0, 10),
        status: "active",
        policy_document_url: docUrl,
      });
      if (insErr) throw insErr;

      toast({ title: "Policy added" });
      setPolicyNumber(""); setCustomerName(""); setVehicleNumber(""); setExpiry(""); setInsurer(""); setFile(null);
      onCreated(); onClose();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Insurance Policy</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Policy Number</Label><Input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} /></div>
          <div><Label>Customer Name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div><Label>Car Registration</Label><Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} /></div>
          <div><Label>Expiry Date</Label><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
          <div><Label>Insurer</Label><Input value={insurer} onChange={(e) => setInsurer(e.target.value)} /></div>
          <div><Label>PDF (optional)</Label><Input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({
  open, title, onClose, onUpload,
}: { open: boolean; title: string; onClose: () => void; onUpload: (file: File) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) setFile(null); }, [open]);

  const submit = async () => {
    if (!file) { toast({ title: "Select a PDF", variant: "destructive" }); return; }
    setBusy(true);
    try { await onUpload(file); toast({ title: "Uploaded" }); }
    catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Uploading..." : "Upload"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
