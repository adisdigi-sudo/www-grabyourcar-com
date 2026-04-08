import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Filter, Tags, Building2, Search, Plus, Trash2,
  Upload, Download, Loader2, CheckCircle, XCircle, Tag
} from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  tags: string[] | null;
  subscribed: boolean | null;
  source: string | null;
  created_at: string;
}

type QuickSegment = "all" | "corporate" | "new_30d" | "active" | "unsubscribed";

const QUICK_SEGMENTS: { key: QuickSegment; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All Contacts", icon: <Users className="h-3 w-3" /> },
  { key: "corporate", label: "Corporate", icon: <Building2 className="h-3 w-3" /> },
  { key: "new_30d", label: "New (30 days)", icon: <Plus className="h-3 w-3" /> },
  { key: "active", label: "Active", icon: <CheckCircle className="h-3 w-3" /> },
  { key: "unsubscribed", label: "Unsubscribed", icon: <XCircle className="h-3 w-3" /> },
];

export function SubscriberSegmentation() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickSegment, setQuickSegment] = useState<QuickSegment>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState("");
  const [contactForm, setContactForm] = useState({ email: "", name: "", company: "", phone: "", tags: "" });
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  useEffect(() => { fetchSubscribers(); }, []);

  const fetchSubscribers = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("email_subscribers").select("*").order("created_at", { ascending: false });
    if (data) setSubscribers(data as Subscriber[]);
    setIsLoading(false);
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    subscribers.forEach(s => (s.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [subscribers]);

  const allSources = useMemo(() => {
    const sources = new Set<string>();
    subscribers.forEach(s => { if (s.source) sources.add(s.source); });
    return Array.from(sources).sort();
  }, [subscribers]);

  const filtered = useMemo(() => {
    let list = [...subscribers];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (quickSegment) {
      case "corporate": list = list.filter(s => s.company); break;
      case "new_30d": list = list.filter(s => new Date(s.created_at) >= thirtyDaysAgo); break;
      case "active": list = list.filter(s => s.subscribed !== false); break;
      case "unsubscribed": list = list.filter(s => s.subscribed === false); break;
    }

    if (tagFilter) list = list.filter(s => (s.tags || []).some(t => t.toLowerCase().includes(tagFilter.toLowerCase())));
    if (sourceFilter && sourceFilter !== "all") list = list.filter(s => s.source === sourceFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.email.toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q) || (s.company || "").toLowerCase().includes(q));
    }

    return list;
  }, [subscribers, quickSegment, tagFilter, sourceFilter, searchQuery]);

  const handleAddContact = async () => {
    if (!contactForm.email) { toast.error("Email required"); return; }
    const { error } = await supabase.from("email_subscribers").insert({
      email: contactForm.email, name: contactForm.name || null,
      company: contactForm.company || null, phone: contactForm.phone || null,
      tags: contactForm.tags ? contactForm.tags.split(",").map(t => t.trim()) : [],
      subscribed: true, source: "manual",
    });
    if (error) { toast.error(error.code === "23505" ? "Email already exists" : error.message); return; }
    toast.success("Contact added");
    setIsAddContactOpen(false);
    setContactForm({ email: "", name: "", company: "", phone: "", tags: "" });
    fetchSubscribers();
  };

  const handleDeleteContact = async (id: string) => {
    await supabase.from("email_subscribers").delete().eq("id", id);
    toast.success("Contact removed");
    fetchSubscribers();
  };

  const handleBulkAddTag = async () => {
    if (!newTag || selectedIds.size === 0) { toast.error("Select contacts and enter a tag"); return; }
    for (const id of selectedIds) {
      const sub = subscribers.find(s => s.id === id);
      if (!sub) continue;
      const updatedTags = [...new Set([...(sub.tags || []), newTag])];
      await supabase.from("email_subscribers").update({ tags: updatedTags }).eq("id", id);
    }
    toast.success(`Tag "${newTag}" added to ${selectedIds.size} contacts`);
    setIsTagModalOpen(false);
    setNewTag("");
    setSelectedIds(new Set());
    fetchSubscribers();
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const contacts = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = values[i] || ""; });
        return { email: obj.email || "", name: obj.name || "Unknown", company: obj.company || null, phone: obj.phone || null, tags: obj.tags ? obj.tags.split(";") : ["imported"], subscribed: true, source: "csv_import" };
      }).filter(c => c.email);
      if (contacts.length === 0) { toast.error("No valid contacts"); return; }
      const { error } = await supabase.from("email_subscribers").upsert(contacts, { onConflict: "email", ignoreDuplicates: true });
      if (error) throw error;
      toast.success(`Imported ${contacts.length} contacts`);
      setIsBulkUploadOpen(false);
      fetchSubscribers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(s => s.id)));
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Quick Segments */}
      <div className="flex flex-wrap gap-2">
        {QUICK_SEGMENTS.map(seg => (
          <Button key={seg.key} variant={quickSegment === seg.key ? "default" : "outline"} size="sm" className="gap-1" onClick={() => setQuickSegment(seg.key)}>
            {seg.icon}{seg.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, company..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="min-w-[160px]">
              <Label className="text-xs">Tag Filter</Label>
              <Input placeholder="Filter by tag..." value={tagFilter} onChange={e => setTagFilter(e.target.value)} />
            </div>
            <div className="min-w-[160px]">
              <Label className="text-xs">Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger><SelectValue placeholder="All sources" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {allSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}><Upload className="h-4 w-4 mr-1" />Import</Button>
              <Button size="sm" onClick={() => setIsAddContactOpen(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{filtered.length} contacts</Badge>
          {selectedIds.size > 0 && (
            <>
              <Badge>{selectedIds.size} selected</Badge>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsTagModalOpen(true)}>
                <Tag className="h-3 w-3" />Add Tag
              </Button>
            </>
          )}
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          {allTags.slice(0, 5).map(t => <Badge key={t} variant="outline" className="text-xs cursor-pointer" onClick={() => setTagFilter(t)}>{t}</Badge>)}
          {allTags.length > 5 && <Badge variant="outline" className="text-xs">+{allTags.length - 5}</Badge>}
        </div>
      </div>

      {/* Contact Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No contacts match filters</TableCell></TableRow>
              ) : filtered.slice(0, 100).map(s => (
                <TableRow key={s.id}>
                  <TableCell><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} /></TableCell>
                  <TableCell className="font-medium">{s.name || "—"}</TableCell>
                  <TableCell className="text-sm">{s.email}</TableCell>
                  <TableCell className="text-sm">{s.company || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(s.tags || []).slice(0, 2).map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
                      {(s.tags || []).length > 2 && <Badge variant="outline" className="text-xs">+{(s.tags || []).length - 2}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{s.source || "—"}</Badge></TableCell>
                  <TableCell>
                    <Badge className={s.subscribed !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {s.subscribed !== false ? "Active" : "Unsub"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteContact(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Contact */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Company</Label><Input value={contactForm.company} onChange={e => setContactForm(p => ({ ...p, company: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Tags (comma-separated)</Label><Input value={contactForm.tags} onChange={e => setContactForm(p => ({ ...p, tags: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddContactOpen(false)}>Cancel</Button>
            <Button onClick={handleAddContact}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Tag */}
      <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Tag to {selectedIds.size} Contacts</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tag Name</Label>
              <Input placeholder="e.g., corporate, vip, delhi" value={newTag} onChange={e => setNewTag(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1">
              {allTags.map(t => <Badge key={t} variant="outline" className="cursor-pointer text-xs" onClick={() => setNewTag(t)}>{t}</Badge>)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTagModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAddTag}>Add Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import Contacts from CSV</DialogTitle></DialogHeader>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">CSV columns: name, email, company, phone, tags</p>
            <Input type="file" accept=".csv" onChange={handleBulkUpload} className="max-w-[200px] mx-auto" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
