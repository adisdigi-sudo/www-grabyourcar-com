import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MousePointer, ListOrdered, Plus, Trash2, Eye, Send,
  LayoutList, MessageSquare, Zap, Copy, MoreVertical
} from "lucide-react";

type InteractiveType = "reply_buttons" | "list_message" | "cta_url";

interface ReplyButton {
  id: string;
  title: string;
}

interface ListSection {
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

interface InteractiveMsg {
  id?: string;
  name: string;
  type: InteractiveType;
  body_text: string;
  header_text?: string;
  footer_text?: string;
  buttons?: ReplyButton[];
  sections?: ListSection[];
  button_text?: string; // for list messages
  cta_url?: string;
  cta_label?: string;
}

// ─── Phone Preview ───
function InteractivePreview({ msg }: { msg: InteractiveMsg }) {
  return (
    <div className="mx-auto w-[260px] bg-gray-900 rounded-[2rem] p-2.5 shadow-xl">
      <div className="bg-white dark:bg-gray-800 rounded-[1.5rem] overflow-hidden">
        <div className="bg-green-600 text-white px-3 py-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-bold">G</div>
          <div>
            <p className="text-xs font-semibold">GrabYourCar</p>
            <p className="text-[9px] opacity-75">online</p>
          </div>
        </div>
        <div className="p-2.5 bg-[#e5ddd5] dark:bg-gray-700 min-h-[300px] flex flex-col justify-end">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden max-w-[230px]">
            {msg.header_text && (
              <div className="px-3 pt-2">
                <p className="text-[11px] font-bold">{msg.header_text}</p>
              </div>
            )}
            <div className="px-3 py-2">
              <p className="text-[11px] whitespace-pre-wrap">{msg.body_text || "Your message here..."}</p>
            </div>
            {msg.footer_text && (
              <div className="px-3 pb-1">
                <p className="text-[9px] text-gray-400">{msg.footer_text}</p>
              </div>
            )}

            {msg.type === "reply_buttons" && msg.buttons && (
              <div className="border-t divide-y">
                {msg.buttons.map((btn, i) => (
                  <button key={i} className="w-full px-3 py-2 text-center text-[11px] font-medium text-blue-500 hover:bg-blue-50">
                    {btn.title || `Button ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            {msg.type === "list_message" && (
              <div className="border-t">
                <button className="w-full px-3 py-2 text-center text-[11px] font-medium text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-1">
                  <LayoutList className="h-3 w-3" /> {msg.button_text || "View Options"}
                </button>
              </div>
            )}

            {msg.type === "cta_url" && (
              <div className="border-t">
                <button className="w-full px-3 py-2 text-center text-[11px] font-medium text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-1">
                  🔗 {msg.cta_label || "Visit Link"}
                </button>
              </div>
            )}

            <div className="px-3 pb-1 flex justify-end">
              <span className="text-[9px] text-gray-400">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Builder ───
function InteractiveBuilder({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (msg: InteractiveMsg) => void }) {
  const [msg, setMsg] = useState<InteractiveMsg>({
    name: "",
    type: "reply_buttons",
    body_text: "",
    header_text: "",
    footer_text: "",
    buttons: [{ id: "btn1", title: "" }, { id: "btn2", title: "" }],
    sections: [{ title: "Options", rows: [{ id: "r1", title: "", description: "" }] }],
    button_text: "View Options",
    cta_url: "",
    cta_label: "Visit",
  });

  const handleSave = () => {
    if (!msg.name || !msg.body_text) { toast.error("Name and body required"); return; }
    if (msg.type === "reply_buttons" && msg.buttons?.some(b => !b.title.trim())) { toast.error("All buttons need text"); return; }
    onSave(msg);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5 text-primary" /> Interactive Message Builder
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-4">
          {/* Form */}
          <div className="col-span-3 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={msg.name} onChange={(e) => setMsg({ ...msg, name: e.target.value })} placeholder="e.g. Car Inquiry Reply" className="mt-1" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={msg.type} onValueChange={(v) => setMsg({ ...msg, type: v as InteractiveType })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reply_buttons">Reply Buttons (max 3)</SelectItem>
                    <SelectItem value="list_message">List Message (max 10)</SelectItem>
                    <SelectItem value="cta_url">CTA URL Button</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Header (optional)</Label>
              <Input value={msg.header_text} onChange={(e) => setMsg({ ...msg, header_text: e.target.value })} placeholder="Bold header text" className="mt-1" />
            </div>

            <div>
              <Label>Body Text *</Label>
              <Textarea value={msg.body_text} onChange={(e) => setMsg({ ...msg, body_text: e.target.value })} placeholder="Main message content..." rows={4} className="mt-1" />
            </div>

            <div>
              <Label>Footer (optional)</Label>
              <Input value={msg.footer_text} onChange={(e) => setMsg({ ...msg, footer_text: e.target.value })} placeholder="Small footer text" className="mt-1" />
            </div>

            {/* Reply Buttons */}
            {msg.type === "reply_buttons" && (
              <div className="space-y-2">
                <Label>Buttons (max 3)</Label>
                {msg.buttons?.map((btn, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">{i + 1}</Badge>
                    <Input
                      value={btn.title}
                      onChange={(e) => {
                        const btns = [...(msg.buttons || [])];
                        btns[i] = { ...btns[i], title: e.target.value };
                        setMsg({ ...msg, buttons: btns });
                      }}
                      placeholder={`Button ${i + 1} text (max 20 chars)`}
                      maxLength={20}
                      className="h-8 text-sm"
                    />
                    {(msg.buttons?.length || 0) > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMsg({ ...msg, buttons: msg.buttons?.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {(msg.buttons?.length || 0) < 3 && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setMsg({ ...msg, buttons: [...(msg.buttons || []), { id: `btn${Date.now()}`, title: "" }] })}>
                    <Plus className="h-3 w-3 mr-1" /> Add Button
                  </Button>
                )}
              </div>
            )}

            {/* List Message */}
            {msg.type === "list_message" && (
              <div className="space-y-3">
                <div>
                  <Label>Menu Button Text</Label>
                  <Input value={msg.button_text} onChange={(e) => setMsg({ ...msg, button_text: e.target.value })} placeholder="View Options" className="mt-1 h-8 text-sm" maxLength={20} />
                </div>
                {msg.sections?.map((sec, sIdx) => (
                  <Card key={sIdx} className="p-3">
                    <Input
                      value={sec.title}
                      onChange={(e) => {
                        const secs = [...(msg.sections || [])];
                        secs[sIdx] = { ...secs[sIdx], title: e.target.value };
                        setMsg({ ...msg, sections: secs });
                      }}
                      placeholder="Section title"
                      className="h-7 text-xs font-semibold mb-2"
                    />
                    {sec.rows.map((row, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-2 mb-1">
                        <Input
                          value={row.title}
                          onChange={(e) => {
                            const secs = [...(msg.sections || [])];
                            secs[sIdx].rows[rIdx] = { ...row, title: e.target.value };
                            setMsg({ ...msg, sections: secs });
                          }}
                          placeholder="Row title"
                          className="h-7 text-xs flex-1"
                          maxLength={24}
                        />
                        <Input
                          value={row.description || ""}
                          onChange={(e) => {
                            const secs = [...(msg.sections || [])];
                            secs[sIdx].rows[rIdx] = { ...row, description: e.target.value };
                            setMsg({ ...msg, sections: secs });
                          }}
                          placeholder="Description"
                          className="h-7 text-xs flex-1"
                          maxLength={72}
                        />
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                      const secs = [...(msg.sections || [])];
                      secs[sIdx].rows.push({ id: `r${Date.now()}`, title: "", description: "" });
                      setMsg({ ...msg, sections: secs });
                    }}>
                      <Plus className="h-3 w-3 mr-1" /> Add Row
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {/* CTA URL */}
            {msg.type === "cta_url" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Button Label</Label>
                  <Input value={msg.cta_label} onChange={(e) => setMsg({ ...msg, cta_label: e.target.value })} className="mt-1 h-8 text-sm" maxLength={20} />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input value={msg.cta_url} onChange={(e) => setMsg({ ...msg, cta_url: e.target.value })} placeholder="https://..." className="mt-1 h-8 text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="col-span-2">
            <InteractivePreview msg={msg} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="gap-1"><Send className="h-4 w-4" /> Save Message</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Module ───
export function WAHubInteractive() {
  const qc = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);

  const { data: messages } = useQuery({
    queryKey: ["wa-interactive-msgs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_quick_replies")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (msg: InteractiveMsg) => {
      const { error } = await supabase.from("wa_quick_replies").insert({
        title: msg.name,
        message: msg.body_text,
        shortcut: msg.type,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Interactive message saved!");
      qc.invalidateQueries({ queryKey: ["wa-interactive-msgs"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const typeIcons: Record<string, React.ElementType> = {
    reply_buttons: MousePointer,
    list_message: ListOrdered,
    cta_url: Zap,
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MousePointer className="h-4 w-4 text-primary" /> Interactive Messages
          </h3>
          <p className="text-xs text-muted-foreground">Reply buttons, list menus, and CTA URLs for WhatsApp</p>
        </div>
        <Button size="sm" onClick={() => setShowBuilder(true)}><Plus className="h-4 w-4 mr-1" /> Create Message</Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <MousePointer className="h-4 w-4 text-blue-500" />
            <h4 className="text-xs font-semibold">Reply Buttons</h4>
          </div>
          <p className="text-[11px] text-muted-foreground">Up to 3 quick-reply buttons. Best for simple choices like "Yes/No/Maybe" or "Price/Offers/Test Drive".</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 mb-2">
            <ListOrdered className="h-4 w-4 text-purple-500" />
            <h4 className="text-xs font-semibold">List Messages</h4>
          </div>
          <p className="text-[11px] text-muted-foreground">Up to 10 items in sections. Best for catalogs, service menus, or multi-option selections.</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-green-500" />
            <h4 className="text-xs font-semibold">CTA URL Buttons</h4>
          </div>
          <p className="text-[11px] text-muted-foreground">Direct link buttons to your website, booking pages, or payment links.</p>
        </Card>
      </div>

      {/* Saved Messages */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {(messages || []).map((m: any) => {
          const Icon = typeIcons[m.shortcut] || MessageSquare;
          return (
            <Card key={m.id} className="hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">{m.title}</h4>
                  </div>
                  <Badge variant={m.is_active ? "default" : "secondary"} className="text-[10px]">
                    {m.is_active ? "Active" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.message}</p>
                <div className="flex items-center gap-1 mt-3">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1">
                    <Copy className="h-3 w-3" /> Use in Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(messages || []).length === 0 && (
          <Card className="col-span-3 p-12 text-center">
            <MousePointer className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No interactive messages yet. Create reply buttons, lists, and CTAs!</p>
          </Card>
        )}
      </div>

      <InteractiveBuilder open={showBuilder} onClose={() => setShowBuilder(false)} onSave={(m) => saveMutation.mutate(m)} />
    </div>
  );
}
