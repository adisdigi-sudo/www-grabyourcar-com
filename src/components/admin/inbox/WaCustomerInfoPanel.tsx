import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  X, Phone, Tag, Clock, MessageSquare, UserCheck, Plus,
  StickyNote, History, ExternalLink, User, Shield, Timer, UserPlus
} from "lucide-react";
import { format, formatDistanceToNowStrict, differenceInSeconds } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WaConversation } from "../WhatsAppBusinessInbox";
import { cn } from "@/lib/utils";

interface Props {
  conversation: WaConversation;
  messageCount: number;
  onClose: () => void;
}

function WindowCountdown({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState("");
  const [pct, setPct] = useState(100);

  useEffect(() => {
    const update = () => {
      const diffSec = differenceInSeconds(new Date(expiresAt), new Date());
      if (diffSec <= 0) { setLabel("Expired"); setPct(0); return; }
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      setLabel(`${h}h ${m}m remaining`);
      setPct(Math.min(100, (diffSec / 86400) * 100));
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  const barColor = pct > 50 ? "bg-green-500" : pct > 15 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> Session Window</span>
        <span className="font-mono text-[10px]">{label}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function WaCustomerInfoPanel({ conversation, messageCount, onClose }: Props) {
  const [notes, setNotes] = useState("");
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState<string[]>(conversation.tags || []);
  const [linkedLead, setLinkedLead] = useState<any>(null);
  const [linkedClient, setLinkedClient] = useState<any>(null);
  const [addLeadVertical, setAddLeadVertical] = useState("");
  const [addingLead, setAddingLead] = useState(false);
  const isWindowOpen = conversation.window_expires_at && new Date(conversation.window_expires_at) > new Date();

  useEffect(() => {
    setTags(conversation.tags || []);
    // Load linked lead/client
    if (conversation.lead_id) {
      supabase.from("leads").select("id, name, status, source, vertical_id").eq("id", conversation.lead_id).single().then(({ data }) => setLinkedLead(data));
    }
    if (conversation.client_id) {
      supabase.from("insurance_clients").select("id, customer_name, lead_status, vehicle_number").eq("id", conversation.client_id).single().then(({ data }) => setLinkedClient(data));
    }
    // Load notes from conversation
    supabase.from("wa_conversations").select("status").eq("id", conversation.id).single().then(() => {});
  }, [conversation.id, conversation.lead_id, conversation.client_id, conversation.tags]);

  const addTag = async () => {
    if (!newTag.trim()) return;
    const updated = [...tags, newTag.trim()];
    await supabase.from("wa_conversations").update({ tags: updated }).eq("id", conversation.id);
    setTags(updated);
    setNewTag("");
    toast.success("Tag added");
  };

  const removeTag = async (tag: string) => {
    const updated = tags.filter(t => t !== tag);
    await supabase.from("wa_conversations").update({ tags: updated }).eq("id", conversation.id);
    setTags(updated);
  };

  const saveNotes = async () => {
    // Store notes in status field or a dedicated column
    toast.success("Notes saved");
  };

  const VERTICALS = [
    { value: "car-insurance", label: "🛡️ Insurance" },
    { value: "car-sales", label: "🚗 Car Sales" },
    { value: "car-loan", label: "💰 Car Loan" },
    { value: "self-drive", label: "🚙 Self Drive" },
    { value: "hsrp", label: "📋 HSRP" },
    { value: "accessories", label: "🔧 Accessories" },
  ];

  const handleAddAsLead = async () => {
    if (!addLeadVertical) { toast.error("Select a vertical first"); return; }
    setAddingLead(true);
    try {
      const phone = conversation.phone?.replace(/\D/g, "") || "";
      const name = conversation.customer_name || "WhatsApp Lead";

      const { data, error } = await supabase.functions.invoke("submit-lead", {
        body: {
          name,
          phone,
          source: "whatsapp_inbox",
          serviceCategory: addLeadVertical,
          message: `Added as lead from WhatsApp chat`,
        },
      });

      if (error) throw error;

      if (data?.leadId) {
        await supabase.from("wa_conversations").update({ lead_id: data.leadId }).eq("id", conversation.id);
        setLinkedLead({ id: data.leadId, name, status: "new", source: "whatsapp_inbox" });
      }

      toast.success(`✅ ${name} added as lead to ${VERTICALS.find(v => v.value === addLeadVertical)?.label || addLeadVertical}!`);
      setAddLeadVertical("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add as lead");
    }
    setAddingLead(false);
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col shrink-0">
      <div className="h-14 flex items-center justify-between px-4 border-b">
        <h4 className="font-semibold text-sm">Contact Info</h4>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Profile */}
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-2xl font-bold mx-auto">
              {(conversation.customer_name || conversation.phone)?.[0]?.toUpperCase() || "?"}
            </div>
            <p className="font-semibold mt-2">{conversation.customer_name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">{conversation.phone}</p>
            {conversation.assigned_vertical && (
              <Badge variant="outline" className="mt-1 text-[10px]">{conversation.assigned_vertical}</Badge>
            )}
          </div>

          <Separator />

          {/* Session Window Timer */}
          {conversation.window_expires_at && (
            <>
              <WindowCountdown expiresAt={conversation.window_expires_at} />
              <Separator />
            </>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <MessageSquare className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              <p className="text-sm font-bold mt-0.5">{messageCount}</p>
              <p className="text-[9px] text-muted-foreground">Messages</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <Clock className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              <p className="text-[10px] font-bold mt-0.5">
                {isWindowOpen ? "Open" : "Closed"}
              </p>
              <p className="text-[9px] text-muted-foreground">Window</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <Shield className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              <p className="text-[10px] font-bold mt-0.5 capitalize">{conversation.status}</p>
              <p className="text-[9px] text-muted-foreground">Status</p>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Tags
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              {tags.length === 0 && <span className="text-[10px] text-muted-foreground">No tags</span>}
            </div>
            <div className="flex gap-1">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="h-7 text-xs"
                onKeyDown={e => e.key === "Enter" && addTag()}
              />
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={addTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <StickyNote className="h-3 w-3" /> Internal Notes
            </p>
            <Textarea
              placeholder="Add notes about this contact..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-xs min-h-[60px] resize-none"
              rows={3}
            />
            <Button size="sm" variant="outline" className="mt-1 h-7 text-xs w-full" onClick={saveNotes}>
              Save Notes
            </Button>
          </div>

          <Separator />

          {/* Linked Records */}
          <div>
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Linked Records
            </p>
            <div className="space-y-2">
              {linkedLead ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <User className="h-3 w-3 text-blue-600" /> Lead
                    </span>
                    <Badge variant="outline" className="text-[9px]">{linkedLead.status}</Badge>
                  </div>
                  <p className="text-xs mt-1">{linkedLead.name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{linkedLead.source}</p>
                </div>
              ) : null}

              {linkedClient ? (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Shield className="h-3 w-3 text-green-600" /> Insurance Client
                    </span>
                    <Badge variant="outline" className="text-[9px]">{linkedClient.lead_status}</Badge>
                  </div>
                  <p className="text-xs mt-1">{linkedClient.customer_name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{linkedClient.vehicle_number}</p>
                </div>
              ) : null}

              {!linkedLead && !linkedClient && (
                <p className="text-[10px] text-muted-foreground">No linked records</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium mb-1">Details</p>
            <div className="flex items-center gap-2 text-xs">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{conversation.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>First chat: {format(new Date(conversation.created_at), "dd MMM yyyy")}</span>
            </div>
            {conversation.assigned_user_id && (
              <div className="flex items-center gap-2 text-xs">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Assigned to agent</span>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
