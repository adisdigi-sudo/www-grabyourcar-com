import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Search, Upload, Download, Trash2, Edit, Users, Tag, Phone,
  Mail, MapPin, MessageSquare, CheckCircle, Filter, MoreHorizontal,
  UserPlus, Send, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  city: string | null;
  tags: string[];
  segment: string;
  notes: string | null;
  opted_in: boolean;
  opted_in_at: string | null;
  last_message_at: string | null;
  total_messages: number;
  is_active: boolean;
  created_at: string;
}

const SEGMENTS = ["general", "hot_lead", "customer", "vip", "cold", "churned", "new"];

export function WaContactManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<Partial<Contact> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("wa_contacts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    else setContacts((data || []) as unknown as Contact[]);
    setIsLoading(false);
  };

  const saveContact = async () => {
    if (!editContact?.phone) { toast.error("Phone is required"); return; }
    const phone = editContact.phone.replace(/\D/g, "");
    if (phone.length < 10) { toast.error("Invalid phone number"); return; }

    const payload = {
      phone,
      name: editContact.name || null,
      email: editContact.email || null,
      city: editContact.city || null,
      tags: editContact.tags || [],
      segment: editContact.segment || "general",
      notes: editContact.notes || null,
      opted_in: editContact.opted_in || false,
      opted_in_at: editContact.opted_in ? new Date().toISOString() : null,
    };

    if (editContact.id) {
      const { error } = await supabase.from("wa_contacts").update(payload).eq("id", editContact.id);
      if (error) toast.error(error.message);
      else toast.success("Contact updated");
    } else {
      const { error } = await supabase.from("wa_contacts").upsert(payload, { onConflict: "phone" });
      if (error) toast.error(error.message);
      else toast.success("Contact added");
    }
    setEditOpen(false);
    setEditContact(null);
    fetchContacts();
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} contacts?`)) return;
    const { error } = await supabase.from("wa_contacts").delete().in("id", Array.from(selectedIds));
    if (error) toast.error(error.message);
    else { toast.success(`${selectedIds.size} contacts deleted`); setSelectedIds(new Set()); }
    fetchContacts();
  };

  const importContacts = async () => {
    const lines = importText.trim().split("\n").filter(l => l.trim());
    if (lines.length === 0) { toast.error("No data to import"); return; }

    const parsed = lines.map(line => {
      const parts = line.split(",").map(p => p.trim());
      return {
        phone: parts[0]?.replace(/\D/g, "") || "",
        name: parts[1] || null,
        email: parts[2] || null,
        city: parts[3] || null,
        segment: "general" as const,
        tags: [] as string[],
        opted_in: false,
      };
    }).filter(c => c.phone.length >= 10);

    if (parsed.length === 0) { toast.error("No valid contacts found"); return; }

    const { error } = await supabase.from("wa_contacts").upsert(parsed, { onConflict: "phone", ignoreDuplicates: true });
    if (error) toast.error(error.message);
    else { toast.success(`${parsed.length} contacts imported`); setImportOpen(false); setImportText(""); }
    fetchContacts();
  };

  const exportContacts = () => {
    const csv = ["Phone,Name,Email,City,Segment,Tags,Opted In"]
      .concat(contacts.map(c => `${c.phone},${c.name || ""},${c.email || ""},${c.city || ""},${c.segment},${(c.tags || []).join(";")},${c.opted_in}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "wa_contacts.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Contacts exported");
  };

  const addTag = () => {
    if (!tagInput.trim() || !editContact) return;
    const tags = [...(editContact.tags || []), tagInput.trim()];
    setEditContact({ ...editContact, tags: [...new Set(tags)] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    if (!editContact) return;
    setEditContact({ ...editContact, tags: (editContact.tags || []).filter(t => t !== tag) });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };

  const filtered = contacts.filter(c => {
    if (segmentFilter !== "all" && c.segment !== segmentFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.phone.includes(q) || (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    }
    return true;
  });

  const segmentCounts = SEGMENTS.reduce((acc, s) => {
    acc[s] = contacts.filter(c => c.segment === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-5 w-5 mx-auto text-primary" />
            <p className="text-2xl font-bold mt-1">{contacts.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-600" />
            <p className="text-2xl font-bold mt-1">{contacts.filter(c => c.opted_in).length}</p>
            <p className="text-[10px] text-muted-foreground">Opted In</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <MessageSquare className="h-5 w-5 mx-auto text-blue-600" />
            <p className="text-2xl font-bold mt-1">{contacts.filter(c => c.total_messages > 0).length}</p>
            <p className="text-[10px] text-muted-foreground">Active Chatters</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Tag className="h-5 w-5 mx-auto text-orange-600" />
            <p className="text-2xl font-bold mt-1">{new Set(contacts.flatMap(c => c.tags || [])).size}</p>
            <p className="text-[10px] text-muted-foreground">Unique Tags</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email..." className="pl-8 h-8 text-xs" />
        </div>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")} ({segmentCounts[s] || 0})</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setEditContact({}); setEditOpen(true); }}>
          <UserPlus className="h-3.5 w-3.5" /> Add Contact
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setImportOpen(true)}>
          <Upload className="h-3.5 w-3.5" /> Import
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={exportContacts}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        {selectedIds.size > 0 && (
          <Button size="sm" variant="destructive" className="h-8 gap-1.5 text-xs" onClick={deleteSelected}>
            <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Opt-in</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No contacts found. Add your first contact or import from CSV.</TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id} className="group text-xs">
                    <TableCell>
                      <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {(c.name || c.phone)?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium">{c.name || "Unknown"}</p>
                          {c.email && <p className="text-[10px] text-muted-foreground">{c.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{c.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{c.segment.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5 flex-wrap max-w-[120px]">
                        {(c.tags || []).slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-[9px] px-1">{t}</Badge>)}
                        {(c.tags || []).length > 3 && <Badge variant="secondary" className="text-[9px] px-1">+{(c.tags || []).length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{c.total_messages}</TableCell>
                    <TableCell>
                      {c.opted_in ? <CheckCircle className="h-4 w-4 text-green-600" /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditContact(c); setEditOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setSelectedIds(new Set([c.id])); deleteSelected(); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { if (!v) { setEditOpen(false); setEditContact(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editContact?.id ? "Edit" : "Add"} Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input value={editContact?.phone || ""} onChange={e => setEditContact({ ...editContact, phone: e.target.value })} placeholder="919876543210" className="h-8 text-sm font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Name</Label><Input value={editContact?.name || ""} onChange={e => setEditContact({ ...editContact, name: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Email</Label><Input value={editContact?.email || ""} onChange={e => setEditContact({ ...editContact, email: e.target.value })} className="h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">City</Label><Input value={editContact?.city || ""} onChange={e => setEditContact({ ...editContact, city: e.target.value })} className="h-8 text-sm" /></div>
              <div>
                <Label className="text-xs">Segment</Label>
                <Select value={editContact?.segment || "general"} onValueChange={v => setEditContact({ ...editContact, segment: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEGMENTS.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Tags</Label>
              <div className="flex gap-1 flex-wrap mb-1">
                {(editContact?.tags || []).map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px] gap-1">
                    {t} <button onClick={() => removeTag(t)} className="text-destructive hover:text-destructive/80">×</button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Add tag..." className="h-7 text-xs flex-1" />
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addTag}>Add</Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={editContact?.notes || ""} onChange={e => setEditContact({ ...editContact, notes: e.target.value })} rows={2} className="text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editContact?.opted_in || false} onCheckedChange={v => setEditContact({ ...editContact, opted_in: v })} />
              <Label className="text-xs">WhatsApp Opt-in (Meta compliance)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditContact(null); }}>Cancel</Button>
            <Button onClick={saveContact}>Save Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Import Contacts</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Paste contacts in CSV format: <code className="bg-muted px-1 rounded">phone,name,email,city</code> (one per line)</p>
            <Textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder={"919876543210,John Doe,john@email.com,Delhi\n919876543211,Jane Smith,,Mumbai"} rows={8} className="text-sm font-mono" />
            <p className="text-xs text-muted-foreground">{importText.trim().split("\n").filter(l => l.trim()).length} contacts detected</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={importContacts} className="gap-1.5"><Upload className="h-4 w-4" /> Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
