import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, Copy, Variable, Zap, LayoutTemplate, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  display_name: string | null;
  category: string;
  language: string;
  body: string;
  header_type: string | null;
  header_content: string | null;
  footer: string | null;
  variables: any;
  buttons: any;
  status: string;
  vertical: string | null;
  created_at: string;
}

interface QuickReply {
  id: string;
  title: string;
  shortcut: string | null;
  message: string;
  variables: string[] | null;
  category: string;
  vertical: string | null;
  is_active: boolean;
}

export function WaTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [tab, setTab] = useState<"templates" | "quick_replies">("templates");
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Template & QuickReply> | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [tRes, qRes] = await Promise.all([
      supabase.from("wa_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("wa_quick_replies").select("*").order("sort_order"),
    ]);
    setTemplates((tRes.data || []) as unknown as Template[]);
    setQuickReplies((qRes.data || []) as unknown as QuickReply[]);
  };

  const saveTemplate = async () => {
    if (!editItem?.name || !editItem?.body) {
      toast.error("Name and body are required");
      return;
    }

    const payload = {
      name: editItem.name,
      display_name: editItem.display_name || editItem.name,
      category: editItem.category || "utility",
      language: editItem.language || "en",
      body: editItem.body,
      header_type: editItem.header_type || null,
      header_content: editItem.header_content || null,
      footer: editItem.footer || null,
      variables: editItem.variables || [],
      buttons: editItem.buttons || [],
      status: editItem.status || "draft",
      vertical: editItem.vertical || null,
    };

    if (editItem.id) {
      await supabase.from("wa_templates").update(payload).eq("id", editItem.id);
      toast.success("Template updated");
    } else {
      await supabase.from("wa_templates").insert(payload);
      toast.success("Template created");
    }
    setIsEditing(false);
    setEditItem(null);
    fetchAll();
  };

  const saveQuickReply = async () => {
    if (!editItem?.title || !editItem?.message) {
      toast.error("Title and message are required");
      return;
    }

    const payload = {
      title: editItem.title,
      shortcut: (editItem as any).shortcut || null,
      message: (editItem as any).message,
      variables: (editItem as any).variables || null,
      category: (editItem as any).category || "general",
      vertical: editItem.vertical || null,
      is_active: (editItem as any).is_active !== false,
    };

    if (editItem.id) {
      await supabase.from("wa_quick_replies").update(payload).eq("id", editItem.id);
      toast.success("Quick reply updated");
    } else {
      await supabase.from("wa_quick_replies").insert(payload);
      toast.success("Quick reply created");
    }
    setIsEditing(false);
    setEditItem(null);
    fetchAll();
  };

  const deleteItem = async (id: string, type: "template" | "quick_reply") => {
    if (type === "template") {
      await supabase.from("wa_templates").delete().eq("id", id);
    } else {
      await supabase.from("wa_quick_replies").delete().eq("id", id);
    }
    toast.success("Deleted");
    fetchAll();
  };

  const insertVariable = (varName: string) => {
    if (!editItem) return;
    const currentBody = editItem.body || editItem.message || "";
    const key = tab === "templates" ? "body" : "message";
    setEditItem({ ...editItem, [key]: currentBody + `{{${varName}}}` });
  };

  const commonVars = ["customer_name", "phone", "vehicle_number", "insurer", "premium", "expiry_date", "policy_number"];

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={tab === "templates" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("templates")}
            className="gap-1.5"
          >
            <LayoutTemplate className="h-4 w-4" /> Templates ({templates.length})
          </Button>
          <Button
            variant={tab === "quick_replies" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("quick_replies")}
            className="gap-1.5"
          >
            <Zap className="h-4 w-4" /> Quick Replies ({quickReplies.length})
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditItem({}); setIsEditing(true); }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> {tab === "templates" ? "New Template" : "New Quick Reply"}
        </Button>
      </div>

      {/* Templates List */}
      {tab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(tpl => (
            <Card key={tpl.id} className="relative group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">{tpl.display_name || tpl.name}</CardTitle>
                  <Badge className="text-[10px]" variant={tpl.status === "approved" ? "default" : "secondary"}>
                    {tpl.status}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[9px]">{tpl.category}</Badge>
                  {tpl.vertical && <Badge variant="outline" className="text-[9px]">{tpl.vertical}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{tpl.body}</p>
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditItem(tpl); setIsEditing(true); }}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => deleteItem(tpl.id, "template")}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-8">No templates yet. Create one!</p>
          )}
        </div>
      )}

      {/* Quick Replies List */}
      {tab === "quick_replies" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickReplies.map(qr => (
            <Card key={qr.id} className="relative group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">{qr.title}</CardTitle>
                  <Badge variant={qr.is_active ? "default" : "secondary"} className="text-[10px]">
                    {qr.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {qr.shortcut && <Badge variant="outline" className="text-[9px] w-fit">/{qr.shortcut}</Badge>}
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{qr.message}</p>
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setTab("quick_replies"); setEditItem(qr as any); setIsEditing(true); }}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => deleteItem(qr.id, "quick_reply")}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {quickReplies.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-8">No quick replies yet. Create one!</p>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={(v) => { if (!v) { setIsEditing(false); setEditItem(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem?.id ? "Edit" : "Create"} {tab === "templates" ? "Template" : "Quick Reply"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {tab === "templates" ? (
              <>
                <div>
                  <Label className="text-xs">Template Name (Meta ID)</Label>
                  <Input
                    value={editItem?.name || ""}
                    onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                    placeholder="e.g. insurance_followup"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Display Name</Label>
                  <Input
                    value={editItem?.display_name || ""}
                    onChange={e => setEditItem({ ...editItem, display_name: e.target.value })}
                    placeholder="Insurance Follow-up"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={editItem?.category || "utility"} onValueChange={v => setEditItem({ ...editItem, category: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="authentication">Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Vertical</Label>
                    <Input
                      value={editItem?.vertical || ""}
                      onChange={e => setEditItem({ ...editItem, vertical: e.target.value })}
                      placeholder="Insurance"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Body</Label>
                    <div className="flex gap-1 flex-wrap">
                      {commonVars.map(v => (
                        <button
                          key={v}
                          onClick={() => insertVariable(v)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    value={editItem?.body || ""}
                    onChange={e => setEditItem({ ...editItem, body: e.target.value })}
                    placeholder="Hello {{customer_name}}, your insurance..."
                    rows={5}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Footer (optional)</Label>
                  <Input
                    value={editItem?.footer || ""}
                    onChange={e => setEditItem({ ...editItem, footer: e.target.value })}
                    placeholder="Team Grabyourcar"
                    className="h-8 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={editItem?.title || ""}
                    onChange={e => setEditItem({ ...editItem, title: e.target.value })}
                    placeholder="Greeting"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Shortcut (type /{"{shortcut}"} to use)</Label>
                  <Input
                    value={(editItem as any)?.shortcut || ""}
                    onChange={e => setEditItem({ ...editItem, shortcut: e.target.value } as any)}
                    placeholder="greet"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Message</Label>
                    <div className="flex gap-1 flex-wrap">
                      {commonVars.slice(0, 4).map(v => (
                        <button
                          key={v}
                          onClick={() => insertVariable(v)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    value={(editItem as any)?.message || ""}
                    onChange={e => setEditItem({ ...editItem, message: e.target.value } as any)}
                    placeholder="Hello! How can I help you?"
                    rows={4}
                    className="text-sm"
                  />
                </div>
              </>
            )}

            <Button onClick={tab === "templates" ? saveTemplate : saveQuickReply} className="w-full gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
