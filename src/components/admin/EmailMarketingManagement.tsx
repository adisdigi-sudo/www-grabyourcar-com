import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Mail, Plus, Send, Users, FileText,
  Search, Trash2, Copy,
  Download, Upload, Sparkles,
  RefreshCw, CheckCircle, XCircle, Clock, Loader2, Rocket,
  Wand2, Eye, AtSign, User, Zap, ListChecks,
  MoreHorizontal, Calendar, TrendingUp, MousePointerClick
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  html_content: string | null;
  template_id: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  open_count: number;
  click_count: number;
  from_name: string | null;
  from_email: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

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

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  html_content: string;
  is_active: boolean | null;
}

const SENDER_PRESETS = [
  { name: "Anshdeep", email: "anshdeep@grabyourcar.com", color: "bg-blue-500" },
  { name: "GrabYourCar", email: "hello@grabyourcar.com", color: "bg-primary" },
  { name: "Marketing", email: "marketing@grabyourcar.com", color: "bg-purple-500" },
  { name: "Insurance", email: "insurance@grabyourcar.com", color: "bg-emerald-500" },
  { name: "Sales", email: "sales@grabyourcar.com", color: "bg-orange-500" },
  { name: "Support", email: "support@grabyourcar.com", color: "bg-teal-500" },
];

export const EmailMarketingManagement = () => {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState<string | null>(null);

  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [isSubjectGenerating, setIsSubjectGenerating] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);

  const [campaignForm, setCampaignForm] = useState({
    name: '', subject: '', content: '', template_id: '', scheduledAt: '',
    from_name: 'Anshdeep', from_email: 'anshdeep@grabyourcar.com',
    ai_prompt: '', ai_tone: 'professional', ai_audience: 'corporate',
  });

  const [contactForm, setContactForm] = useState({
    email: '', name: '', company: '', phone: '', tags: '',
  });

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('campaign-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'email_campaigns' }, (payload) => {
        setCampaigns(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } as EmailCampaign : c));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    const [campRes, subRes, tmpRes] = await Promise.all([
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("email_subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("email_templates").select("*").eq("is_active", true).order("category"),
    ]);
    if (campRes.data) setCampaigns(campRes.data as EmailCampaign[]);
    if (subRes.data) setSubscribers(subRes.data as Subscriber[]);
    if (tmpRes.data) setTemplates(tmpRes.data as EmailTemplate[]);
    setIsLoading(false);
  };

  const stats = {
    totalContacts: subscribers.length,
    subscribedContacts: subscribers.filter(c => c.subscribed !== false).length,
    totalCampaigns: campaigns.length,
    sentCampaigns: campaigns.filter(c => c.status === 'completed').length,
    totalSent: campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0),
    totalOpens: campaigns.reduce((acc, c) => acc + (c.open_count || 0), 0),
    totalClicks: campaigns.reduce((acc, c) => acc + (c.click_count || 0), 0),
    totalFailed: campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0),
  };

  const avgOpenRate = stats.totalSent > 0 ? Math.round((stats.totalOpens / stats.totalSent) * 100) : 0;

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject) {
      toast.error('Campaign name aur subject dono chahiye');
      return;
    }

    const { error } = await supabase.from("email_campaigns").insert({
      name: campaignForm.name,
      subject: campaignForm.subject,
      html_content: campaignForm.content || null,
      template_id: campaignForm.template_id || null,
      from_name: campaignForm.from_name || 'GrabYourCar',
      from_email: campaignForm.from_email || 'noreply@grabyourcar.com',
      status: 'draft',
      total_recipients: subscribers.filter(s => s.subscribed !== false).length,
      scheduled_at: campaignForm.scheduledAt ? new Date(campaignForm.scheduledAt).toISOString() : null,
    });

    if (error) { toast.error(error.message); return; }
    toast.success('✅ Campaign created!');
    setIsCreateCampaignOpen(false);
    resetCampaignForm();
    fetchAll();
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '', subject: '', content: '', template_id: '', scheduledAt: '',
      from_name: 'Anshdeep', from_email: 'anshdeep@grabyourcar.com',
      ai_prompt: '', ai_tone: 'professional', ai_audience: 'corporate',
    });
    setSubjectSuggestions([]);
  };

  const handleDuplicateCampaign = (campaign: EmailCampaign) => {
    setCampaignForm({
      name: `${campaign.name} (Copy)`,
      subject: campaign.subject,
      content: campaign.html_content || '',
      template_id: campaign.template_id || '',
      scheduledAt: '',
      from_name: campaign.from_name || 'Anshdeep',
      from_email: campaign.from_email || 'anshdeep@grabyourcar.com',
      ai_prompt: '', ai_tone: 'professional', ai_audience: 'corporate',
    });
    setIsCreateCampaignOpen(true);
    toast.info('Campaign duplicated — edit and send!');
  };

  const handleSendCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const subscriberCount = subscribers.filter(s => s.subscribed !== false).length;
    if (subscriberCount === 0) {
      toast.error('Koi subscriber nahi hai! Pehle contacts add karo.');
      return;
    }

    if (!confirm(`"${campaign.name}" bhejein?\n\nFrom: ${campaign.from_name || 'GrabYourCar'} <${campaign.from_email || 'noreply@grabyourcar.com'}>\nTo: ${subscriberCount} subscribers`)) return;

    setIsSending(campaignId);
    toast.loading(`${subscriberCount} subscribers ko bhej rahe hain...`, { id: 'bulk-send' });

    try {
      const { data, error } = await supabase.functions.invoke("send-bulk-email", {
        body: {
          campaign_id: campaignId,
          from_name: campaign.from_name,
          from_email: campaign.from_email,
        },
      });

      if (error) throw error;
      toast.dismiss('bulk-send');

      if (data.error) {
        toast.error(`⚠️ ${data.error}`);
      } else {
        const warmupNote = data.is_warmup ? ' (Warmup Mode 🔥)' : '';
        const skippedNote = data.skipped > 0 ? ` | ${data.skipped} kal bhejenge` : '';
        toast.success(`✅ ${data.sent} delivered, ${data.failed} failed${skippedNote}${warmupNote}`);
      }
      fetchAll();
    } catch (err: any) {
      toast.dismiss('bulk-send');
      toast.error(`Failed: ${err.message}`);
    } finally {
      setIsSending(null);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Yeh campaign delete kar dein?')) return;
    await supabase.from("email_campaigns").delete().eq("id", id);
    toast.success('Campaign deleted');
    fetchAll();
  };

  const handleAddContact = async () => {
    if (!contactForm.email || !contactForm.name) {
      toast.error('Email aur name required hai');
      return;
    }

    const { error } = await supabase.from("email_subscribers").insert({
      email: contactForm.email,
      name: contactForm.name,
      company: contactForm.company || null,
      phone: contactForm.phone || null,
      tags: contactForm.tags ? contactForm.tags.split(',').map(t => t.trim()) : [],
      subscribed: true,
      source: 'manual',
    });

    if (error) {
      if (error.code === '23505') toast.error('Yeh email already exists');
      else toast.error(error.message);
      return;
    }

    toast.success('✅ Contact added');
    setIsContactModalOpen(false);
    setContactForm({ email: '', name: '', company: '', phone: '', tags: '' });
    fetchAll();
  };

  const handleDeleteContact = async (id: string) => {
    await supabase.from("email_subscribers").delete().eq("id", id);
    toast.success('Contact removed');
    fetchAll();
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

      const newContacts = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => { obj[header] = values[index] || ''; });

        return {
          email: obj.email || '',
          name: obj.name || obj.company_name || 'Unknown',
          company: obj.company || obj.company_name || null,
          phone: obj.phone || obj.mobile || null,
          tags: obj.tags ? obj.tags.split(';') : ['imported'],
          subscribed: true,
          source: 'csv_import',
        };
      }).filter(c => c.email);

      if (newContacts.length === 0) { toast.error('Koi valid contact nahi mila'); return; }

      const { error } = await supabase.from("email_subscribers").upsert(
        newContacts,
        { onConflict: 'email', ignoreDuplicates: true }
      );

      if (error) throw error;
      toast.success(`✅ ${newContacts.length} contacts imported!`);
      setIsBulkUploadOpen(false);
      fetchAll();
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    }
  };

  // ── AI Email Writer ──
  const getFunctionErrorMessage = (error: any, fallback: string) => {
    const context = error?.context;
    if (typeof context === "string") {
      try {
        const parsed = JSON.parse(context);
        return parsed?.error || parsed?.message || fallback;
      } catch { return context || fallback; }
    }
    return error?.message || fallback;
  };

  const handleAIGenerateContent = async () => {
    if (!campaignForm.ai_prompt) {
      toast.error("Batao kya likhna hai email me");
      return;
    }
    setIsAIGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-email-writer", {
        body: {
          action: "generate_email",
          prompt: campaignForm.ai_prompt,
          tone: campaignForm.ai_tone,
          audience: campaignForm.ai_audience,
          brand_name: "GrabYourCar",
          from_name: campaignForm.from_name,
        },
      });
      if (error) throw error;
      if (data?.html_content) {
        setCampaignForm(prev => ({ ...prev, content: data.html_content }));
        toast.success('✨ AI email ready! Review kar lo.');
      } else {
        throw new Error(data?.error || "No content generated");
      }
    } catch (err: any) {
      toast.error(`AI generation failed: ${getFunctionErrorMessage(err, "Abhi generate nahi ho pa raha")}`);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleAISubjectLines = async () => {
    setIsSubjectGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-email-writer", {
        body: {
          action: "generate_subject",
          prompt: campaignForm.ai_prompt || campaignForm.name || "Marketing email",
          brand_name: "GrabYourCar",
        },
      });
      if (error) throw error;
      if (data?.subjects?.length) {
        setSubjectSuggestions(data.subjects);
        toast.success("Subject lines ready!");
      } else {
        throw new Error(data?.error || "No suggestions");
      }
    } catch (err: any) {
      toast.error(`Failed: ${getFunctionErrorMessage(err, "Abhi subject generate nahi ho pa raha")}`);
    } finally {
      setIsSubjectGenerating(false);
    }
  };

  const handleAIImprove = async () => {
    if (!campaignForm.content) { toast.error("Content to hona chahiye improve karne ke liye"); return; }
    setIsAIGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-email-writer", {
        body: { action: "improve_email", existing_content: campaignForm.content },
      });
      if (error) throw error;
      if (data?.html_content) {
        setCampaignForm(prev => ({ ...prev, content: data.html_content }));
        toast.success("✨ Email improved!");
      } else {
        throw new Error(data?.error || "No improved content");
      }
    } catch (err: any) {
      toast.error(`Failed: ${getFunctionErrorMessage(err, "Improve nahi ho pa raha abhi")}`);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const downloadSampleCSV = () => {
    const csv = `name,email,company,phone,tags\nJohn Doe,john@example.com,ABC Corp,9876543210,corporate\nJane Smith,jane@example.com,XYZ Ltd,9876543211,lead;interested`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'contacts_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      draft: { color: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" />, label: 'Draft' },
      scheduled: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: <Clock className="h-3 w-3" />, label: 'Scheduled' },
      sending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <RefreshCw className="h-3 w-3 animate-spin" />, label: 'Sending...' },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="h-3 w-3" />, label: 'Completed' },
      partially_completed: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: <CheckCircle className="h-3 w-3" />, label: 'Partial' },
      rate_limited: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock className="h-3 w-3" />, label: 'Rate Limited' },
      failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="h-3 w-3" />, label: 'Failed' },
    };
    return configs[status] || configs.draft;
  };

  const filteredSubscribers = subscribers.filter(s =>
    !searchQuery || s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.company || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading email data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ═══ Quick Stats ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: "Contacts", value: stats.totalContacts, icon: Users, color: "text-primary" },
          { label: "Subscribed", value: stats.subscribedContacts, icon: CheckCircle, color: "text-green-600" },
          { label: "Campaigns", value: stats.totalCampaigns, icon: Send, color: "text-blue-600" },
          { label: "Completed", value: stats.sentCampaigns, icon: Rocket, color: "text-emerald-600" },
          { label: "Emails Sent", value: stats.totalSent, icon: Mail, color: "text-purple-600" },
          { label: "Opens", value: stats.totalOpens, icon: Eye, color: "text-teal-600" },
          { label: "Avg Open %", value: `${avgOpenRate}%`, icon: TrendingUp, color: "text-indigo-600" },
          { label: "Failed", value: stats.totalFailed, icon: XCircle, color: "text-destructive" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <stat.icon className={`h-4 w-4 ${stat.color} mb-1`} />
                <p className="text-lg font-bold leading-tight">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />Campaigns
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />Contacts
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />Templates
          </TabsTrigger>
        </TabsList>

        {/* ═══ CAMPAIGNS TAB ═══ */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">AI-powered campaigns from your own email address</p>
            <Button onClick={() => { resetCampaignForm(); setIsCreateCampaignOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />New Campaign
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-primary/5 mb-4">
                  <Send className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Koi campaign nahi hai abhi</h3>
                <p className="text-sm text-muted-foreground mb-4">Pehla campaign banao aur apne subscribers ko email bhejo</p>
                <Button onClick={() => { resetCampaignForm(); setIsCreateCampaignOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Create First Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {campaigns.map((campaign, i) => {
                const sc = getStatusConfig(campaign.status);
                const openRate = campaign.sent_count > 0 ? Math.round((campaign.open_count / campaign.sent_count) * 100) : 0;
                const clickRate = campaign.open_count > 0 ? Math.round((campaign.click_count / campaign.open_count) * 100) : 0;
                const progress = campaign.total_recipients > 0 ? Math.round((campaign.sent_count / campaign.total_recipients) * 100) : 0;

                return (
                  <motion.div key={campaign.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="hover:shadow-md transition-all group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Campaign info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm truncate">{campaign.name}</h4>
                              <Badge className={`${sc.color} gap-1 text-[10px] shrink-0`}>{sc.icon}{sc.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-2">
                              <span className="font-medium">{campaign.subject}</span>
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {campaign.from_name || 'GrabYourCar'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDistanceToNowStrict(new Date(campaign.created_at), { addSuffix: true })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {campaign.total_recipients} recipients
                              </span>
                            </div>
                          </div>

                          {/* Center: Stats (only for sent campaigns) */}
                          {campaign.sent_count > 0 && (
                            <div className="hidden md:flex items-center gap-4 shrink-0">
                              <div className="text-center">
                                <p className="text-sm font-bold text-green-600">{campaign.sent_count}</p>
                                <p className="text-[10px] text-muted-foreground">Sent</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-blue-600">{openRate}%</p>
                                <p className="text-[10px] text-muted-foreground">Open Rate</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-purple-600">{clickRate}%</p>
                                <p className="text-[10px] text-muted-foreground">CTR</p>
                              </div>
                              {campaign.failed_count > 0 && (
                                <div className="text-center">
                                  <p className="text-sm font-bold text-destructive">{campaign.failed_count}</p>
                                  <p className="text-[10px] text-muted-foreground">Failed</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {campaign.status === 'draft' && (
                              <Button
                                size="sm"
                                disabled={isSending === campaign.id}
                                onClick={() => handleSendCampaign(campaign.id)}
                                className="gap-1.5"
                              >
                                {isSending === campaign.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Rocket className="h-3.5 w-3.5" />}
                                Send
                              </Button>
                            )}
                            {campaign.status === 'sending' && (
                              <Badge className="bg-yellow-100 text-yellow-800 gap-1 animate-pulse">
                                <RefreshCw className="h-3 w-3 animate-spin" />Sending...
                              </Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign)}>
                                  <Copy className="h-3.5 w-3.5 mr-2" />Duplicate
                                </DropdownMenuItem>
                                {campaign.html_content && (
                                  <DropdownMenuItem onClick={() => {
                                    setCampaignForm(prev => ({ ...prev, content: campaign.html_content || '' }));
                                    setIsPreviewOpen(true);
                                  }}>
                                    <Eye className="h-3.5 w-3.5 mr-2" />Preview
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCampaign(campaign.id)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Progress bar for active sends */}
                        {(campaign.status === 'sending' || (campaign.status === 'completed' && campaign.total_recipients > 0)) && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-3">
                              <Progress value={progress} className="flex-1 h-1.5" />
                              <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ CONTACTS TAB ═══ */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search contacts..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />Import CSV
              </Button>
              <Button size="sm" onClick={() => setIsContactModalOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Add Contact
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscribers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="inline-flex p-3 rounded-xl bg-muted mb-3">
                            <Users className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">Koi contact nahi hai. Add ya import karo!</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredSubscribers.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {(contact.name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-sm">{contact.name || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{contact.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{contact.company || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(contact.tags || []).slice(0, 2).map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                            ))}
                            {(contact.tags || []).length > 2 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{(contact.tags || []).length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={contact.subscribed !== false
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400'
                          }>
                            {contact.subscribed !== false ? 'Active' : 'Unsubscribed'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteContact(contact.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TEMPLATES TAB ═══ */}
        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="inline-flex p-3 rounded-xl bg-primary/5 mb-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Koi template nahi hai</h3>
                <p className="text-sm text-muted-foreground">Template Builder tab se templates banao</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template, i) => (
                <motion.div key={template.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                  <Card className="hover:shadow-md transition-all group cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary" className="text-[10px]">{template.category}</Badge>
                      </div>
                      <CardTitle className="text-sm mt-2">{template.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-1">{template.subject}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button
                        size="sm" variant="outline" className="w-full gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={() => {
                          setCampaignForm(prev => ({
                            ...prev,
                            template_id: template.id,
                            subject: template.subject,
                            content: template.html_content,
                          }));
                          setIsCreateCampaignOpen(true);
                        }}
                      >
                        <Send className="h-3 w-3" /> Use in Campaign
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ Create Campaign Modal ═══ */}
      <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Campaign
            </DialogTitle>
            <DialogDescription>
              {subscribers.filter(s => s.subscribed !== false).length} active subscribers ko bheja jaega
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Sender Selection */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <AtSign className="h-4 w-4" /> Send From
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SENDER_PRESETS.map((preset) => (
                    <Button
                      key={preset.email}
                      variant={campaignForm.from_email === preset.email ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setCampaignForm(prev => ({ ...prev, from_name: preset.name, from_email: preset.email }))}
                    >
                      <div className={`h-2 w-2 rounded-full ${preset.color}`} />
                      {preset.name}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Sender Name</Label>
                    <Input value={campaignForm.from_name} onChange={(e) => setCampaignForm(prev => ({ ...prev, from_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sender Email</Label>
                    <Input value={campaignForm.from_email} onChange={(e) => setCampaignForm(prev => ({ ...prev, from_email: e.target.value }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Name */}
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g., Fleet Insurance Offer Q2 2026" value={campaignForm.name} onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>

            {/* Subject Line + AI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subject Line *</Label>
                <Button variant="ghost" size="sm" onClick={handleAISubjectLines} disabled={isSubjectGenerating} className="h-7 text-xs gap-1">
                  {isSubjectGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  AI Suggest
                </Button>
              </div>
              <Input placeholder="🎉 Special Pricing for Your Fleet!" value={campaignForm.subject} onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))} />
              {subjectSuggestions.length > 0 && (
                <div className="space-y-1 p-2 bg-muted/50 rounded-lg">
                  <p className="text-[10px] font-medium text-muted-foreground px-1">AI Suggestions — click to use:</p>
                  {subjectSuggestions.map((s, i) => (
                    <Button
                      key={i} variant="ghost" size="sm"
                      className="justify-start text-xs h-auto py-1.5 w-full font-normal"
                      onClick={() => { setCampaignForm(prev => ({ ...prev, subject: s })); setSubjectSuggestions([]); }}
                    >
                      <ListChecks className="h-3 w-3 mr-2 text-primary shrink-0" />
                      <span className="truncate text-left">{s}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Email Writer */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />AI Email Writer
                </CardTitle>
                <CardDescription className="text-xs">Batao kya likhna hai — AI poora email likh dega</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="e.g., Corporate fleet insurance email likhna hai — competitive pricing, 24/7 claims, dedicated manager, call schedule karne ka CTA"
                  value={campaignForm.ai_prompt}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, ai_prompt: e.target.value }))}
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tone</Label>
                    <Select value={campaignForm.ai_tone} onValueChange={(v) => setCampaignForm(prev => ({ ...prev, ai_tone: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="urgent">Urgent / FOMO</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="luxury">Luxury / Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Audience</Label>
                    <Select value={campaignForm.ai_audience} onValueChange={(v) => setCampaignForm(prev => ({ ...prev, ai_audience: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corporate">Corporate / B2B</SelectItem>
                        <SelectItem value="individual">Individual Buyers</SelectItem>
                        <SelectItem value="fleet">Fleet Managers</SelectItem>
                        <SelectItem value="renewal">Insurance Renewals</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAIGenerateContent} disabled={isAIGenerating || !campaignForm.ai_prompt} className="flex-1 gap-1.5">
                    {isAIGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {isAIGenerating ? 'Generating...' : 'Generate Email'}
                  </Button>
                  {campaignForm.content && (
                    <Button variant="outline" onClick={handleAIImprove} disabled={isAIGenerating} className="gap-1.5">
                      <Wand2 className="h-4 w-4" />Improve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Email Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Content (HTML)</Label>
                {campaignForm.content && (
                  <Button variant="ghost" size="sm" onClick={() => setIsPreviewOpen(true)} className="h-7 text-xs gap-1">
                    <Eye className="h-3 w-3" />Preview
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="HTML paste karo ya AI writer use karo. Variables: {customer_name}, {email}, {company}"
                value={campaignForm.content}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            {campaignForm.template_id && (
              <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />Template linked</Badge>
            )}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsCreateCampaignOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCampaign} className="gap-1.5">
              <Send className="h-4 w-4" />Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" />Email Preview</DialogTitle>
            <DialogDescription>From: {campaignForm.from_name} &lt;{campaignForm.from_email}&gt;</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] border rounded-lg bg-muted/30 p-4">
            <div className="bg-white mx-auto shadow-sm rounded-lg overflow-hidden" style={{ maxWidth: 600 }} dangerouslySetInnerHTML={{ __html: campaignForm.content || '<p>No content</p>' }} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Contact Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><Input placeholder="Contact name" value={contactForm.name} onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="email@example.com" value={contactForm.email} onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Company</Label><Input placeholder="Company name" value={contactForm.company} onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="Phone number" value={contactForm.phone} onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Tags (comma-separated)</Label><Input placeholder="corporate, interested, delhi" value={contactForm.tags} onChange={(e) => setContactForm(prev => ({ ...prev, tags: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddContact}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
            <DialogDescription>CSV me: name, email, company, phone, tags columns honi chahiye</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/30">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">CSV file select karo</p>
              <Input type="file" accept=".csv" onChange={handleBulkUpload} className="max-w-[200px] mx-auto" />
            </div>
            <Button variant="outline" onClick={downloadSampleCSV} className="w-full gap-2">
              <Download className="h-4 w-4" />Download Sample CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
