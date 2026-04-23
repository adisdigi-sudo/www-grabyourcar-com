/**
 * PromoBannerManager — admin CRUD for promotional_banners.
 * Founder can add/edit/expire banners from Marketing Hub → Banners tab.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Megaphone, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  slug: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  offer_type: string;
  color_theme: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  display_order: number;
  page_scope: string[] | null;
}

const COLORS = ["red", "green", "blue", "amber", "purple", "primary"];
const SCOPES = ["all", "home", "cars", "car-insurance", "hsrp", "loans", "self-drive", "accessories"];

const empty: Partial<Banner> = {
  slug: "",
  title: "",
  message: "",
  cta_label: "",
  cta_url: "",
  offer_type: "general",
  color_theme: "primary",
  ends_at: null,
  is_active: true,
  display_order: 0,
  page_scope: ["all"],
};

export function PromoBannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Banner>>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promotional_banners")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast.error("Failed to load banners");
    else setBanners((data || []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setDraft(empty);
    setEditingId(null);
    setOpen(true);
  };

  const startEdit = (b: Banner) => {
    setDraft({ ...b, ends_at: b.ends_at ? b.ends_at.slice(0, 16) : null });
    setEditingId(b.id);
    setOpen(true);
  };

  const save = async () => {
    if (!draft.slug || !draft.title || !draft.message) {
      toast.error("Slug, title and message are required");
      return;
    }
    const payload = {
      slug: draft.slug!,
      title: draft.title!,
      message: draft.message!,
      cta_label: draft.cta_label || null,
      cta_url: draft.cta_url || null,
      offer_type: draft.offer_type || "general",
      color_theme: draft.color_theme || "primary",
      ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      is_active: draft.is_active ?? true,
      display_order: draft.display_order ?? 0,
      page_scope: draft.page_scope?.length ? draft.page_scope : ["all"],
    };
    if (editingId) {
      const { error } = await supabase.from("promotional_banners").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Banner updated");
    } else {
      const { error } = await supabase.from("promotional_banners").insert([payload]);
      if (error) return toast.error(error.message);
      toast.success("Banner created");
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("promotional_banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Banner deleted");
    load();
  };

  const toggleActive = async (b: Banner) => {
    const { error } = await supabase
      .from("promotional_banners")
      .update({ is_active: !b.is_active })
      .eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggleScope = (scope: string) => {
    const current = new Set(draft.page_scope || []);
    if (current.has(scope)) current.delete(scope);
    else current.add(scope);
    setDraft({ ...draft, page_scope: [...current] });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Promotional Banners</CardTitle>
            <p className="text-xs text-muted-foreground">
              Manage homepage / vertical banners with auto-countdown.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New Banner
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {banners.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground py-6 text-center">No banners yet. Click "New Banner".</p>
        )}
        {banners.map((b) => (
          <div key={b.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{b.title}</span>
                <Badge variant="outline" className="text-[10px]">{b.color_theme}</Badge>
                <Badge variant="secondary" className="text-[10px]">{b.offer_type}</Badge>
                {!b.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                {b.ends_at && new Date(b.ends_at) < new Date() && (
                  <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{b.message}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Scope: {(b.page_scope || ["all"]).join(", ")}
                {b.ends_at && ` • Ends ${new Date(b.ends_at).toLocaleString()}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} />
              <Button size="icon" variant="ghost" onClick={() => startEdit(b)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(b.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Banner" : "New Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Slug *</Label>
              <Input
                value={draft.slug || ""}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                placeholder="homepage-mega-deal"
              />
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={draft.title || ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="🔥 Mega Car Deal"
              />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea
                value={draft.message || ""}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                placeholder="Get up to ₹1.5L off + Zero waiting period"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CTA Label</Label>
                <Input
                  value={draft.cta_label || ""}
                  onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })}
                  placeholder="Get Best Price"
                />
              </div>
              <div>
                <Label>CTA URL</Label>
                <Input
                  value={draft.cta_url || ""}
                  onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })}
                  placeholder="https://wa.me/919855924442"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Offer Type</Label>
                <Input
                  value={draft.offer_type || ""}
                  onChange={(e) => setDraft({ ...draft, offer_type: e.target.value })}
                  placeholder="mega_deal / insurance / hsrp"
                />
              </div>
              <div>
                <Label>Color Theme</Label>
                <Select
                  value={draft.color_theme || "primary"}
                  onValueChange={(v) => setDraft({ ...draft, color_theme: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ends At</Label>
                <Input
                  type="datetime-local"
                  value={(draft.ends_at as string) || ""}
                  onChange={(e) => setDraft({ ...draft, ends_at: e.target.value || null })}
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={draft.display_order ?? 0}
                  onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Page Scope</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SCOPES.map((s) => {
                  const active = (draft.page_scope || []).includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleScope(s)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs border transition",
                        active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.is_active ?? true}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editingId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default PromoBannerManager;
