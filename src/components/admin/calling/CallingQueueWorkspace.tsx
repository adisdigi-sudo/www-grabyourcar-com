import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Phone, PhoneCall, PhoneOff, Upload, FileSpreadsheet,
  CheckCircle2, XCircle, SkipForward, Clock, Trash2, UserPlus, ListChecks,
  Filter, MessageCircle, Send, Pause, Play,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExcelJS from "exceljs";

/* ─────────────────────────────────────────────────────────────
   Unified Calling Queue Workspace

   - One component, embedded inside every vertical workspace.
   - Scoped by `verticalSlug`: the queue only shows campaigns for
     that vertical, and uploaded numbers convert into leads of
     that vertical when "Create Leads" is pressed.
   - Dialer pad: shows ONE number at a time, caller dials manually
     via tel: link (works on mobile + softphones), then marks a
     disposition. Saving disposition auto-loads the next number.
   - All call attempts are tracked: dial_attempts, last_dialed_at,
     disposition, notes, follow-up date.

   Designed to be reusable in: Insurance, Loans, Sales,
   HSRP, Rentals, Dealer Network, etc.
   ───────────────────────────────────────────────────────────── */

export interface CallingQueueWorkspaceProps {
  /** Vertical slug for filtering + lead-creation routing
   *  (e.g. "insurance", "loans", "sales", "hsrp", "rentals", "dealer"). */
  verticalSlug: string;
  /** Friendly label shown in the heading. */
  verticalLabel: string;
  /** Optional accent color class for the header tile. */
  accentClass?: string;
}

const DISPOSITIONS: { value: string; label: string; tone: string }[] = [
  { value: "hot",            label: "🔥 Hot",             tone: "bg-orange-600 text-white hover:bg-orange-700" },
  { value: "interested",     label: "✅ Interested",      tone: "bg-emerald-500 text-white hover:bg-emerald-600" },
  { value: "callback",       label: "📅 Callback",         tone: "bg-blue-500 text-white hover:bg-blue-600" },
  { value: "not_interested", label: "❌ Not Interested",   tone: "bg-rose-500 text-white hover:bg-rose-600" },
  { value: "no_answer",      label: "📵 No Answer",        tone: "bg-slate-500 text-white hover:bg-slate-600" },
  { value: "busy",           label: "⏳ Busy",             tone: "bg-amber-500 text-white hover:bg-amber-600" },
  { value: "wrong_number",   label: "🚫 Wrong Number",     tone: "bg-zinc-500 text-white hover:bg-zinc-600" },
  { value: "dnd",            label: "🔇 DND",              tone: "bg-purple-600 text-white hover:bg-purple-700" },
  { value: "switched_off",   label: "💬 Switched Off",     tone: "bg-gray-600 text-white hover:bg-gray-700" },
];

/** Dispositions where free-text remarks are MANDATORY before saving. */
const REMARKS_REQUIRED = new Set(["hot", "interested", "callback"]);

function normalizePhone(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

async function parseSpreadsheet(file: File): Promise<{ phone: string; name?: string; email?: string; city?: string }[]> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();

  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = new TextDecoder().decode(buf);
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));
    return mapRows(headers, rows);
  }

  await wb.xlsx.load(buf);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, col) => {
    headers[col - 1] = String(cell.value ?? "").trim().toLowerCase();
  });

  const rows: string[][] = [];
  sheet.eachRow((row, rowIdx) => {
    if (rowIdx === 1) return;
    const r: string[] = [];
    row.eachCell((cell, col) => {
      r[col - 1] = String(cell.value ?? "").trim();
    });
    if (r.some(Boolean)) rows.push(r);
  });

  return mapRows(headers, rows);
}

function mapRows(headers: string[], rows: string[][]) {
  const findIdx = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h?.includes(c)));

  const idxPhone = findIdx("phone", "mobile", "contact", "number");
  const idxName  = findIdx("name", "customer");
  const idxEmail = findIdx("email", "mail");
  const idxCity  = findIdx("city", "location", "town");

  const out: { phone: string; name?: string; email?: string; city?: string }[] = [];
  for (const r of rows) {
    const phone = normalizePhone(r[idxPhone] || r[0]);
    if (phone.length < 10) continue;
    out.push({
      phone,
      name:  idxName  >= 0 ? r[idxName]  : undefined,
      email: idxEmail >= 0 ? r[idxEmail] : undefined,
      city:  idxCity  >= 0 ? r[idxCity]  : undefined,
    });
  }
  return out;
}

export function CallingQueueWorkspace({ verticalSlug, verticalLabel, accentClass }: CallingQueueWorkspaceProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showImportFor, setShowImportFor] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [disposition, setDisposition] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  /* Filter / Bulk-move sidebar */
  const [filterCampaignId, setFilterCampaignId] = useState<string | null>(null);
  const [filterDisposition, setFilterDisposition] = useState<string>("interested");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  /* ── load campaigns scoped to this vertical ── */
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["calling-queue-campaigns", verticalSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_dialer_campaigns")
        .select("*")
        .eq("vertical_slug", verticalSlug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  /* ── create campaign ── */
  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error("Campaign name required");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("auto_dialer_campaigns")
        .insert({
          name: newName.trim(),
          description: newDescription.trim() || null,
          vertical: verticalSlug,
          vertical_slug: verticalSlug,
          status: "draft",
          created_by: user?.id ?? null,
          assigned_user_id: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
      setShowCreate(false);
      setNewName(""); setNewDescription("");
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── delete campaign ── */
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("auto_dialer_contacts").delete().eq("campaign_id", id);
      const { error } = await supabase.from("auto_dialer_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
      toast.success("Campaign deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── import contacts (file OR paste) ── */
  async function importContacts(
    campaignId: string,
    rows: { phone: string; name?: string; email?: string; city?: string }[],
    sourceLabel: string
  ) {
    if (!rows.length) {
      toast.error("No valid phone numbers found");
      return;
    }
    /* dedupe by phone within this campaign */
    const { data: existing } = await supabase
      .from("auto_dialer_contacts")
      .select("phone")
      .eq("campaign_id", campaignId);
    const seen = new Set((existing || []).map((r: any) => normalizePhone(r.phone)));
    const fresh = rows.filter((r) => !seen.has(r.phone) && (seen.add(r.phone) || true));

    if (!fresh.length) {
      toast.info("All numbers already in this campaign");
      return;
    }

    const payload = fresh.map((r) => ({
      campaign_id: campaignId,
      phone: r.phone,
      name: r.name || null,
      email: r.email || null,
      city: r.city || null,
      call_status: "pending",
      dial_attempts: 0,
    }));

    const { error } = await supabase.from("auto_dialer_contacts").insert(payload);
    if (error) { toast.error(error.message); return; }

    /* recount + activate */
    const { count: total } = await supabase
      .from("auto_dialer_contacts")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);
    const { count: pending } = await supabase
      .from("auto_dialer_contacts")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("call_status", "pending");

    await supabase
      .from("auto_dialer_campaigns")
      .update({
        total_contacts: total || 0,
        pending_contacts: pending || 0,
        status: "active",
        last_import_filename: sourceLabel,
        import_count: (campaigns.find((c: any) => c.id === campaignId)?.import_count || 0) + 1,
      })
      .eq("id", campaignId);

    qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
    toast.success(`Imported ${fresh.length} numbers (skipped ${rows.length - fresh.length} duplicates)`);
    setShowImportFor(null);
    setPasteText("");
  }

  async function handleFileUpload(campaignId: string, file: File) {
    try {
      const rows = await parseSpreadsheet(file);
      await importContacts(campaignId, rows, file.name);
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    }
  }

  async function handlePasteImport(campaignId: string) {
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const rows = lines.map((line) => {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      const phone = normalizePhone(parts[0]);
      return { phone, name: parts[1] || undefined, email: parts[2] || undefined, city: parts[3] || undefined };
    }).filter((r) => r.phone.length >= 10);
    await importContacts(campaignId, rows, "Pasted list");
  }

  /* ── Pull next pending contact ── */
  async function pullNextContact(campaignId: string) {
    const { data, error } = await supabase
      .from("auto_dialer_contacts")
      .select("*")
      .eq("campaign_id", campaignId)
      .in("call_status", ["pending", "retry"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) { toast.error(error.message); return null; }
    if (!data) {
      setActiveContact(null);
      toast.success("🎉 Queue complete — no more pending numbers");
      return null;
    }

    /* mark as calling + bump attempt */
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("auto_dialer_contacts")
      .update({
        call_status: "calling",
        called_at: new Date().toISOString(),
        last_dialed_at: new Date().toISOString(),
        dial_attempts: (data.dial_attempts || 0) + 1,
        dialed_by: user?.id ?? null,
      })
      .eq("id", data.id);

    setActiveContact({ ...data, dial_attempts: (data.dial_attempts || 0) + 1 });
    setDisposition("");
    setNotes("");
    setFollowUp("");
    return data;
  }

  function startCalling(campaignId: string) {
    setActiveCampaignId(campaignId);
    pullNextContact(campaignId);
  }

  /* ── Save disposition + auto-pull next ── */
  async function saveDisposition() {
    if (!activeContact || !activeCampaignId || !disposition) return;

    // Mandatory remarks for serious outcomes
    if (REMARKS_REQUIRED.has(disposition) && !notes.trim()) {
      toast.error("Remarks required for Hot / Interested / Callback");
      return;
    }

    const statusMap: Record<string, string> = {
      hot: "completed",
      interested: "completed",
      not_interested: "completed",
      wrong_number: "completed",
      dnd: "completed",
      switched_off: "no_answer",
      no_answer: "no_answer",
      busy: "retry",
      callback: "callback",
    };

    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("auto_dialer_contacts")
      .update({
        call_status: statusMap[disposition] || "completed",
        disposition,
        disposition_remarks: notes || null,
        notes: notes || null,
        follow_up_date: followUp ? new Date(followUp).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeContact.id);

    /* Audit log — every status change tracked (Point 6 prep) */
    await supabase.from("auto_dialer_dispositions").insert({
      campaign_id: activeCampaignId,
      contact_id: activeContact.id,
      phone: activeContact.phone,
      customer_name: activeContact.name || null,
      vertical_slug: verticalSlug,
      disposition,
      remarks: notes || null,
      attempt_number: activeContact.dial_attempts || 1,
      dialed_by: user?.id ?? null,
      dialed_by_email: user?.email ?? null,
      follow_up_at: followUp ? new Date(followUp).toISOString() : null,
    });

    /* refresh campaign counters */
    await refreshCampaignStats(activeCampaignId);

    /* 🎯 Dealer Network — auto-send onboarding kit on Interested / Hot */
    if (
      verticalSlug === "dealer" &&
      (disposition === "interested" || disposition === "hot") &&
      activeContact.phone
    ) {
      try {
        const dealerName = activeContact.name || "Partner";
        const onboardingMsg =
          `🤝 *GrabYourCar Dealer Partnership*\n\n` +
          `Hi ${dealerName}, thanks for your interest in joining the GrabYourCar dealer network!\n\n` +
          `🚗 *What you get:*\n` +
          `• Verified buyer leads in your city\n` +
          `• Zero subscription fees — pay-per-deal\n` +
          `• Inventory & discount management dashboard\n` +
          `• Auto WhatsApp + Email broadcasting to buyers\n` +
          `• Dedicated onboarding support\n\n` +
          `📋 *Next steps:*\n` +
          `1. We'll share the partnership agreement & commission structure\n` +
          `2. Quick 15-min onboarding call\n` +
          `3. Inventory upload & go-live within 24 hrs\n\n` +
          `Reply *YES* to receive the agreement, or call us at +91 95577 00200.\n\n` +
          `— Team GrabYourCar`;

        await supabase.functions.invoke("whatsapp-send", {
          body: { to: activeContact.phone, type: "text", message: onboardingMsg },
        });
        toast.success("📲 Dealer onboarding kit sent on WhatsApp");
      } catch (err) {
        console.error("Dealer onboarding WA send failed:", err);
        toast.warning("Disposition saved — WhatsApp onboarding kit failed (check WA settings)");
      }
    }

    qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
    toast.success("Saved — pulling next number");
    await pullNextContact(activeCampaignId);
  }

  async function refreshCampaignStats(campaignId: string) {
    const { data: rows } = await supabase
      .from("auto_dialer_contacts")
      .select("call_status, disposition")
      .eq("campaign_id", campaignId);

    const counts = {
      total: rows?.length || 0,
      pending: 0, completed: 0, interested: 0, not_interested: 0, no_answer: 0,
    };
    (rows || []).forEach((r: any) => {
      if (r.call_status === "pending") counts.pending++;
      if (r.call_status === "completed") counts.completed++;
      if (r.disposition === "interested") counts.interested++;
      if (r.disposition === "not_interested") counts.not_interested++;
      if (r.disposition === "no_answer") counts.no_answer++;
    });

    await supabase
      .from("auto_dialer_campaigns")
      .update({
        total_contacts: counts.total,
        pending_contacts: counts.pending,
        completed_contacts: counts.completed,
        interested_contacts: counts.interested,
        not_interested_contacts: counts.not_interested,
        no_answer_contacts: counts.no_answer,
      })
      .eq("id", campaignId);
  }

  function endSession() {
    setActiveContact(null);
    setActiveCampaignId(null);
  }

  /* ── Convert "interested" contacts into vertical leads ── */
  const convertLeads = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data: hot } = await supabase
        .from("auto_dialer_contacts")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("disposition", "interested")
        .is("lead_id", null);

      if (!hot?.length) return { created: 0 };

      let created = 0;
      for (const contact of hot) {
        try {
          const { data, error } = await supabase.functions.invoke("submit-lead", {
            body: {
              name: contact.name || "Calling Lead",
              phone: contact.phone,
              email: contact.email || undefined,
              city: contact.city || undefined,
              source: "calling_queue",
              serviceCategory: verticalSlug,
              vertical: verticalSlug,
              message: contact.notes || `Hot lead from ${verticalLabel} calling queue`,
            },
          });
          if (!error && (data as any)?.success !== false) {
            const leadId = (data as any)?.lead_id || (data as any)?.id || null;
            await supabase
              .from("auto_dialer_contacts")
              .update({ lead_id: leadId })
              .eq("id", contact.id);
            created++;
          }
        } catch (err) {
          console.warn("convertLead failed", err);
        }
      }
      return { created };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
      toast.success(`${data.created} interested contact${data.created === 1 ? "" : "s"} converted to ${verticalLabel} leads`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Filter dialog: load contacts of a campaign by disposition ── */
  const { data: filteredContacts = [], refetch: refetchFiltered } = useQuery({
    queryKey: ["calling-filter-contacts", filterCampaignId, filterDisposition],
    enabled: !!filterCampaignId,
    queryFn: async () => {
      if (!filterCampaignId) return [];
      let q = supabase
        .from("auto_dialer_contacts")
        .select("id, phone, name, email, city, disposition, call_status, lead_id, last_auto_followup_at, auto_followup_count, auto_followup_enabled, disposition_remarks, follow_up_date")
        .eq("campaign_id", filterCampaignId)
        .order("updated_at", { ascending: false })
        .limit(1000);
      if (filterDisposition && filterDisposition !== "all") {
        q = q.eq("disposition", filterDisposition);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  /* ── Bulk move selected contacts → vertical leads (new leads) ── */
  const bulkMoveLeads = useMutation({
    mutationFn: async () => {
      if (!selectedContactIds.size) throw new Error("Nothing selected");
      const ids = Array.from(selectedContactIds);
      const { data: rows, error } = await supabase
        .from("auto_dialer_contacts")
        .select("*")
        .in("id", ids);
      if (error) throw error;

      let created = 0;
      for (const contact of rows || []) {
        if (contact.lead_id) continue; // already converted
        try {
          const { data, error: invErr } = await supabase.functions.invoke("submit-lead", {
            body: {
              name: contact.name || "Calling Lead",
              phone: contact.phone,
              email: contact.email || undefined,
              city: contact.city || undefined,
              source: "calling_queue_bulk_move",
              serviceCategory: verticalSlug,
              vertical: verticalSlug,
              message: contact.disposition_remarks || contact.notes || `Bulk-moved ${contact.disposition} lead from ${verticalLabel} calling queue`,
            },
          });
          if (!invErr && (data as any)?.success !== false) {
            const leadId = (data as any)?.lead_id || (data as any)?.id || null;
            await supabase.from("auto_dialer_contacts").update({ lead_id: leadId }).eq("id", contact.id);
            created++;
          }
        } catch (err) {
          console.warn("bulk move failed for", contact.id, err);
        }
      }
      return { created };
    },
    onSuccess: ({ created }) => {
      toast.success(`✅ ${created} lead${created === 1 ? "" : "s"} moved to ${verticalLabel} pipeline`);
      setSelectedContactIds(new Set());
      refetchFiltered();
      qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Toggle auto follow-up for a contact ── */
  const toggleAutoFollowup = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("auto_dialer_contacts")
        .update({
          auto_followup_enabled: enabled,
          auto_followup_paused_at: enabled ? null : new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchFiltered();
      toast.success("Auto follow-up updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Trigger an immediate auto-followup run (test/manual) ── */
  const runAutoFollowupNow = useMutation({
    mutationFn: async (slot: "morning" | "evening") => {
      const { data, error } = await supabase.functions.invoke("calling-auto-followup", {
        body: { slot },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Sent ${data?.sent || 0} follow-ups (skipped ${data?.skipped || 0})`);
      refetchFiltered();
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Realtime: auto-refresh counters when contacts/campaigns change (Point 4) ── */
  useEffect(() => {
    const channel = supabase
      .channel(`calling-queue-${verticalSlug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auto_dialer_contacts" }, () => {
        qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
        qc.invalidateQueries({ queryKey: ["filtered-contacts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auto_dialer_campaigns", filter: `vertical_slug=eq.${verticalSlug}` }, () => {
        qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [verticalSlug, qc]);

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc: any, c: any) => {
        acc.total          += c.total_contacts || 0;
        acc.pending        += c.pending_contacts || 0;
        acc.completed      += c.completed_contacts || 0;
        acc.hot            += c.hot_contacts || 0;
        acc.interested     += c.interested_contacts || 0;
        acc.callback       += c.callback_contacts || 0;
        acc.not_interested += c.not_interested_contacts || 0;
        acc.no_answer      += c.no_answer_contacts || 0;
        acc.busy           += c.busy_contacts || 0;
        acc.dnd            += c.dnd_contacts || 0;
        acc.wrong_number   += c.wrong_number_contacts || 0;
        return acc;
      },
      { total: 0, pending: 0, completed: 0, hot: 0, interested: 0, callback: 0,
        not_interested: 0, no_answer: 0, busy: 0, dnd: 0, wrong_number: 0 }
    );
  }, [campaigns]);

  return (
    <div className="space-y-4">
      {/* HERO */}
      <Card className={accentClass || "border-blue-200 dark:border-blue-900"}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Calling Queue — {verticalLabel}</h2>
                <p className="text-xs text-muted-foreground">
                  Upload Excel/CSV → numbers queue up → dial one-by-one → mark disposition → auto-next
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{totals.total} total</Badge>
              <Badge className="bg-amber-500/15 text-amber-700">{totals.pending} pending</Badge>
              <Badge className="bg-blue-500/15 text-blue-700">{totals.completed} called</Badge>
              <Badge className="bg-emerald-500/15 text-emerald-700">{totals.interested} interested</Badge>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Campaign</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Calling Campaign — {verticalLabel}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Campaign name (e.g. April renewals batch)" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    <Textarea placeholder="Description (optional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} />
                  </div>
                  <DialogFooter>
                    <Button onClick={() => createCampaign.mutate()} disabled={!newName.trim() || createCampaign.isPending} className="w-full">
                      Create Campaign
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LIVE COUNTERS STRIP — all 8 dispositions, real-time (Point 4) */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Filter className="h-3 w-3" /> Live Disposition Counters
            </p>
            <Badge variant="outline" className="text-[10px] gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Realtime
            </Badge>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-2 text-center">
            <CounterTile label="Total"        value={totals.total}          tone="text-foreground" />
            <CounterTile label="Pending"      value={totals.pending}        tone="text-amber-600" />
            <CounterTile label="Called"       value={totals.completed}      tone="text-blue-600" />
            <CounterTile label="🔥 Hot"        value={totals.hot}            tone="text-orange-600" />
            <CounterTile label="✅ Interested" value={totals.interested}     tone="text-emerald-600" />
            <CounterTile label="📅 Callback"   value={totals.callback}       tone="text-blue-700" />
            <CounterTile label="❌ Not Int."   value={totals.not_interested} tone="text-rose-600" />
            <CounterTile label="📵 No Ans"     value={totals.no_answer}      tone="text-slate-600" />
            <CounterTile label="⏳ Busy"       value={totals.busy}           tone="text-amber-700" />
            <CounterTile label="🔇 DND"        value={totals.dnd}            tone="text-purple-600" />
            <CounterTile label="🚫 Wrong#"     value={totals.wrong_number}   tone="text-zinc-600" />
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!activeContact} onOpenChange={() => { /* blocked: must save disposition */ }}>
        <DialogContent
          className="max-w-2xl"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-blue-600 animate-pulse" />
              Now Calling — Status required to continue
              {activeContact && (
                <Badge variant="outline" className="text-[10px] ml-1">
                  Attempt #{activeContact.dial_attempts}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {activeContact && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-5">
                {/* Customer + Dial button */}
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{activeContact.name || "—"}</p>
                  <a
                    href={`tel:+91${activeContact.phone}`}
                    className="inline-flex items-center gap-2 text-2xl font-mono font-bold text-blue-700 hover:underline"
                  >
                    📞 +91 {activeContact.phone}
                  </a>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {activeContact.city && <p>📍 {activeContact.city}</p>}
                    {activeContact.email && <p>✉️ {activeContact.email}</p>}
                  </div>
                  <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700 w-full">
                    <a href={`tel:+91${activeContact.phone}`}>
                      <Phone className="h-4 w-4" /> Dial Now
                    </a>
                  </Button>
                </div>

                {/* Disposition */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {DISPOSITIONS.map((d) => (
                      <Button
                        key={d.value}
                        type="button"
                        size="sm"
                        className={disposition === d.value ? d.tone : "bg-muted text-foreground hover:bg-muted/70"}
                        onClick={() => setDisposition(d.value)}
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    placeholder={
                      REMARKS_REQUIRED.has(disposition)
                        ? "Remarks REQUIRED — what did the customer say?"
                        : "Notes (optional)"
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className={`text-sm ${
                      REMARKS_REQUIRED.has(disposition) && !notes.trim()
                        ? "border-rose-400 focus-visible:ring-rose-300"
                        : ""
                    }`}
                  />
                  {(disposition === "callback" || disposition === "interested" || disposition === "hot") && (
                    <Input
                      type="datetime-local"
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <Button size="sm" variant="ghost" onClick={endSession}>
                  <PhoneOff className="h-4 w-4 mr-1" /> End Session
                </Button>
                <Button
                  className="gap-2"
                  onClick={saveDisposition}
                  disabled={
                    !disposition ||
                    (REMARKS_REQUIRED.has(disposition) && !notes.trim())
                  }
                >
                  Save &amp; Next Number <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-center text-muted-foreground">
                💡 Modal locked — save a disposition to load the next number, or "End Session" to exit.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* CAMPAIGN LIST */}
      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ListChecks className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">No calling campaigns yet</p>
            <p className="text-sm text-muted-foreground mb-3">Create one and import an Excel/CSV of numbers to start dialing.</p>
            <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c: any) => {
            const total = c.total_contacts || 0;
            const completed = c.completed_contacts || 0;
            const pct = total ? Math.round((completed / total) * 100) : 0;
            return (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{c.name}</h3>
                        <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge>
                        {c.last_import_filename && (
                          <Badge variant="outline" className="text-[10px]">📄 {c.last_import_filename}</Badge>
                        )}
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowImportFor(c.id)} className="gap-1">
                        <Upload className="h-3.5 w-3.5" /> Import
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => startCalling(c.id)}
                        disabled={!c.pending_contacts}
                        className="gap-1"
                      >
                        <PhoneCall className="h-3.5 w-3.5" /> Start Calling
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFilterCampaignId(c.id);
                          setFilterDisposition("interested");
                          setSelectedContactIds(new Set());
                        }}
                        className="gap-1"
                      >
                        <Filter className="h-3.5 w-3.5" /> Filter & Bulk Move
                      </Button>
                      {(c.interested_contacts || 0) > 0 && (
                        <Button size="sm" variant="outline" onClick={() => convertLeads.mutate(c.id)} className="gap-1">
                          <UserPlus className="h-3.5 w-3.5" /> Convert {c.interested_contacts} → Lead{c.interested_contacts === 1 ? "" : "s"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete campaign "${c.name}" and all its contacts?`)) deleteCampaign.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <Progress value={pct} className="h-2" />

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                    <Stat label="Total"        value={total}                          />
                    <Stat label="Pending"      value={c.pending_contacts || 0}        tone="text-amber-600" />
                    <Stat label="Called"       value={completed}                      tone="text-blue-600" />
                    <Stat label="Interested"   value={c.interested_contacts || 0}     tone="text-emerald-600" />
                    <Stat label="Not Int."     value={c.not_interested_contacts || 0} tone="text-rose-600" />
                    <Stat label="No Answer"    value={c.no_answer_contacts || 0}      tone="text-slate-600" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* IMPORT DIALOG */}
      <Dialog open={!!showImportFor} onOpenChange={(o) => !o && setShowImportFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Import Numbers
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Choose Excel / CSV File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && showImportFor) handleFileUpload(showImportFor, f);
                  e.target.value = "";
                }}
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Expected columns (any order): <code>phone</code>, optional <code>name</code>, <code>email</code>, <code>city</code>.
              </p>
            </div>

            <div className="text-center text-xs text-muted-foreground">— or paste below —</div>

            <Textarea
              ref={pasteInputRef}
              placeholder={"9876543210, John, john@x.com, Delhi\n9876501234, Priya, , Mumbai"}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
            />
            <Button
              className="w-full"
              disabled={!pasteText.trim()}
              onClick={() => showImportFor && handlePasteImport(showImportFor)}
            >
              Import {pasteText.trim().split(/\r?\n/).filter(Boolean).length || 0} pasted line{pasteText.trim().split(/\r?\n/).filter(Boolean).length === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FILTER + BULK MOVE DIALOG */}
      <Dialog open={!!filterCampaignId} onOpenChange={(o) => { if (!o) { setFilterCampaignId(null); setSelectedContactIds(new Set()); } }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              Filter Contacts &amp; Bulk Move to {verticalLabel} Pipeline
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground mr-1">Status:</span>
              {[
                { v: "interested", lbl: "✅ Interested", tone: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
                { v: "hot", lbl: "🔥 Hot", tone: "bg-orange-500/15 text-orange-700 border-orange-300" },
                { v: "callback", lbl: "📅 Callback", tone: "bg-blue-500/15 text-blue-700 border-blue-300" },
                { v: "not_interested", lbl: "❌ Not Interested", tone: "bg-rose-500/15 text-rose-700 border-rose-300" },
                { v: "no_answer", lbl: "📵 No Answer", tone: "bg-slate-500/15 text-slate-700 border-slate-300" },
                { v: "all", lbl: "All", tone: "bg-muted text-foreground border-border" },
              ].map(opt => (
                <Button
                  key={opt.v}
                  size="sm"
                  variant="outline"
                  onClick={() => { setFilterDisposition(opt.v); setSelectedContactIds(new Set()); }}
                  className={`h-7 px-2.5 text-xs ${filterDisposition === opt.v ? opt.tone : ""}`}
                >
                  {opt.lbl}
                </Button>
              ))}
              <Badge variant="outline" className="ml-auto">{filteredContacts.length} matching</Badge>
            </div>

            {/* Auto follow-up controls */}
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs">
                  <p className="font-semibold flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> Daily Auto Follow-up (2x WhatsApp)</p>
                  <p className="text-muted-foreground">Interested + Hot leads receive auto WhatsApp at 10 AM &amp; 6 PM IST until converted to a lead.</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => runAutoFollowupNow.mutate("morning")} disabled={runAutoFollowupNow.isPending} className="h-7 text-xs gap-1">
                    <Send className="h-3 w-3" /> Run Morning Now
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => runAutoFollowupNow.mutate("evening")} disabled={runAutoFollowupNow.isPending} className="h-7 text-xs gap-1">
                    <Send className="h-3 w-3" /> Run Evening Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bulk action bar */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedContactIds(new Set(filteredContacts.map((c: any) => c.id)));
                    else setSelectedContactIds(new Set());
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {selectedContactIds.size > 0 ? `${selectedContactIds.size} selected` : "Select all"}
                </span>
              </div>
              <Button
                size="sm"
                disabled={!selectedContactIds.size || bulkMoveLeads.isPending}
                onClick={() => bulkMoveLeads.mutate()}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Move {selectedContactIds.size || ""} → New {verticalLabel} Lead{selectedContactIds.size === 1 ? "" : "s"}
              </Button>
            </div>

            {/* Contact list */}
            <ScrollArea className="h-[420px] border rounded-md">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No contacts with this status yet.
                </div>
              ) : (
                <div className="divide-y">
                  {filteredContacts.map((c: any) => {
                    const isSelected = selectedContactIds.has(c.id);
                    const alreadyLead = !!c.lead_id;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 p-2.5 hover:bg-muted/40 ${alreadyLead ? "opacity-60" : ""}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={alreadyLead}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedContactIds);
                            if (checked) next.add(c.id); else next.delete(c.id);
                            setSelectedContactIds(next);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{c.name || "—"}</span>
                            <span className="text-xs font-mono text-muted-foreground">+91 {c.phone}</span>
                            {alreadyLead && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700">Already a lead</Badge>}
                            {c.last_auto_followup_at && (
                              <Badge variant="outline" className="text-[10px]">
                                💬 Last sent {new Date(c.last_auto_followup_at).toLocaleString()}
                              </Badge>
                            )}
                            {(c.auto_followup_count || 0) > 0 && (
                              <Badge variant="outline" className="text-[10px]">{c.auto_followup_count}x sent</Badge>
                            )}
                            {!c.auto_followup_enabled && (
                              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Auto FU paused</Badge>
                            )}
                          </div>
                          {c.disposition_remarks && (
                            <p className="text-xs text-muted-foreground truncate">📝 {c.disposition_remarks}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title={c.auto_followup_enabled ? "Pause auto follow-up" : "Resume auto follow-up"}
                          onClick={() => toggleAutoFollowup.mutate({ id: c.id, enabled: !c.auto_followup_enabled })}
                        >
                          {c.auto_followup_enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div className={`font-bold text-lg ${tone || ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}