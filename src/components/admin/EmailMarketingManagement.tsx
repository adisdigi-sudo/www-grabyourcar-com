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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mail, Plus, Send, Users, FileText, BarChart3,
  Search, Eye, Trash2, Copy, Pause,
  Building2, Download, Upload, Sparkles,
  RefreshCw, CheckCircle, XCircle, Clock, TrendingUp, Loader2, Rocket
} from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");

  const [campaignForm, setCampaignForm] = useState({
    name: '', subject: '', content: '', template_id: '', scheduledAt: '',
  });

  const [contactForm, setContactForm] = useState({
    email: '', name: '', company: '', phone: '', tags: '',
  });

  useEffect(() => { fetchAll(); }, []);

  // Realtime subscription for campaign status
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
    totalFailed: campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0),
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject) {
      toast.error('Please fill in campaign name and subject');
      return;
    }

    const { error } = await supabase.from("email_campaigns").insert({
      name: campaignForm.name,
      subject: campaignForm.subject,
      html_content: campaignForm.content || null,
      template_id: campaignForm.template_id || null,
      status: 'draft',
      total_recipients: subscribers.filter(s => s.subscribed !== false).length,
      scheduled_at: campaignForm.scheduledAt ? new Date(campaignForm.scheduledAt).toISOString() : null,
    });

    if (error) { toast.error(error.message); return; }
    toast.success('Campaign created!');
    setIsCreateCampaignOpen(false);
    setCampaignForm({ name: '', subject: '', content: '', template_id: '', scheduledAt: '' });
    fetchAll();
  };

  const handleSendCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const subscriberCount = subscribers.filter(s => s.subscribed !== false).length;
    if (subscriberCount === 0) {
      toast.error('No subscribers to send to. Add contacts first!');
      return;
    }

    if (!confirm(`Send "${campaign.name}" to ${subscriberCount} subscribers? This action cannot be undone.`)) return;

    setIsSending(campaignId);
    toast.loading(`Sending to ${subscriberCount} subscribers...`, { id: 'bulk-send' });

    try {
      const { data, error } = await supabase.functions.invoke("send-bulk-email", {
        body: { campaign_id: campaignId },
      });

      if (error) throw error;

      toast.dismiss('bulk-send');
      toast.success(`✅ Campaign sent! ${data.sent} delivered, ${data.failed} failed`);
      fetchAll();
    } catch (err: any) {
      toast.dismiss('bulk-send');
      toast.error(`Failed: ${err.message}`);
    } finally {
      setIsSending(null);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await supabase.from("email_campaigns").delete().eq("id", id);
    toast.success('Campaign deleted');
    fetchAll();
  };

  const handleAddContact = async () => {
    if (!contactForm.email || !contactForm.name) {
      toast.error('Please fill in email and name');
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
      if (error.code === '23505') toast.error('Email already exists');
      else toast.error(error.message);
      return;
    }

    toast.success('Contact added');
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

      if (newContacts.length === 0) { toast.error('No valid contacts found'); return; }

      const { error } = await supabase.from("email_subscribers").upsert(
        newContacts,
        { onConflict: 'email', ignoreDuplicates: true }
      );

      if (error) throw error;
      toast.success(`Imported ${newContacts.length} contacts`);
      setIsBulkUploadOpen(false);
      fetchAll();
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    }
  };

  const handleAIGenerateContent = async () => {
    setIsAIGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const generatedContent = `<!DOCTYPE html>
<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; color: white; text-align: center;">
  <h1 style="margin: 0;">🚗 GrabYourCar</h1>
  <p style="margin: 8px 0 0 0; opacity: 0.9;">Your Trusted Car Buying Partner</p>
</div>
<div style="padding: 24px 0;">
  <p>Hi {customer_name},</p>
  <p>We have exciting offers waiting for you!</p>
  <ul>
    <li>💰 Up to ₹50,000 off on select models</li>
    <li>🏦 Zero processing fee on car loans</li>
    <li>🛡️ Free 1-year extended warranty</li>
    <li>🎁 Complimentary accessories package</li>
  </ul>
  <div style="text-align: center; margin: 24px 0;">
    <a href="https://grabyourcar.lovable.app/cars" style="background: #667eea; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Explore Offers →</a>
  </div>
  <p>📞 Call us: <strong>+91-XXXXXXXXXX</strong></p>
</div>
<div style="border-top: 1px solid #eee; padding-top: 16px; text-align: center; color: #999; font-size: 12px;">
  <p>GrabYourCar | Your Car, Our Passion</p>
</div>
</body></html>`;
    setCampaignForm(prev => ({ ...prev, content: generatedContent }));
    setIsAIGenerating(false);
    toast.success('AI content generated!');
  };

  const downloadSampleCSV = () => {
    const csv = `name,email,company,phone,tags\nJohn Doe,john@example.com,ABC Corp,9876543210,corporate\nJane Smith,jane@example.com,XYZ Ltd,9876543211,lead;interested`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'contacts_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" /> },
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
      sending: { color: 'bg-yellow-100 text-yellow-800', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      completed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      failed: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
    };
    const config = configs[status] || configs.draft;
    return <Badge className={`${config.color} gap-1`}>{config.icon}{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const filteredSubscribers = subscribers.filter(s =>
    !searchQuery || s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.company || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Marketing
          </h2>
          <p className="text-muted-foreground">Send bulk campaigns to unlimited subscribers via Resend</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.totalContacts}</div><p className="text-xs text-muted-foreground">Total Contacts</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{stats.subscribedContacts}</div><p className="text-xs text-muted-foreground">Subscribed</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.totalCampaigns}</div><p className="text-xs text-muted-foreground">Campaigns</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{stats.sentCampaigns}</div><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-purple-600">{stats.totalSent}</div><p className="text-xs text-muted-foreground">Emails Sent</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{stats.totalFailed}</div><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-2"><Send className="h-4 w-4" />Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2"><Users className="h-4 w-4" />Contacts ({subscribers.length})</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><FileText className="h-4 w-4" />Templates ({templates.length})</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Create campaigns and send to all subscribed contacts at once</p>
            <Button onClick={() => setIsCreateCampaignOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Campaign</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent / Total</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No campaigns yet. Create your first!</TableCell></TableRow>
                  ) : campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{campaign.subject}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{campaign.sent_count} / {campaign.total_recipients}</span>
                          {campaign.total_recipients > 0 && (
                            <Progress value={(campaign.sent_count / campaign.total_recipients) * 100} className="w-16 h-2" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell><span className={campaign.failed_count > 0 ? 'text-red-600 font-medium' : ''}>{campaign.failed_count}</span></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {campaign.status === 'draft' && (
                            <Button
                              variant="default" size="sm"
                              disabled={isSending === campaign.id}
                              onClick={() => handleSendCampaign(campaign.id)}
                            >
                              {isSending === campaign.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Rocket className="h-4 w-4 mr-1" />}
                              Send Now
                            </Button>
                          )}
                          {campaign.status === 'sending' && (
                            <Badge className="bg-yellow-100 text-yellow-800 gap-1"><RefreshCw className="h-3 w-3 animate-spin" />Sending...</Badge>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCampaign(campaign.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search contacts..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}><Upload className="h-4 w-4 mr-2" />Import CSV</Button>
              <Button onClick={() => setIsContactModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No contacts yet. Add or import contacts!</TableCell></TableRow>
                  ) : filteredSubscribers.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name || '—'}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.company || '—'}</TableCell>
                      <TableCell>{contact.phone || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(contact.tags || []).slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                          {(contact.tags || []).length > 2 && <Badge variant="outline" className="text-xs">+{(contact.tags || []).length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={contact.subscribed !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {contact.subscribed !== false ? 'Active' : 'Unsubscribed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteContact(contact.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader className="pb-2">
                  <Badge className="w-fit">{template.category}</Badge>
                  <CardTitle className="text-base mt-1">{template.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-1">{template.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm" className="w-full"
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
                    <Copy className="h-3 w-3 mr-1" /> Use in Campaign
                  </Button>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">
                No templates yet. Create them in Email Automation section.
              </CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Modal */}
      <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>Will be sent to {subscribers.filter(s => s.subscribed !== false).length} active subscribers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g., Diwali Special Offers" value={campaignForm.name} onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <Input placeholder="e.g., 🎉 Special Offers on New Cars!" value={campaignForm.subject} onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Content (HTML)</Label>
                <Button variant="outline" size="sm" onClick={handleAIGenerateContent} disabled={isAIGenerating}>
                  {isAIGenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                placeholder="Paste HTML content or generate with AI. Use {customer_name}, {email} for personalization"
                value={campaignForm.content}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
                rows={12}
                className="font-mono text-xs"
              />
            </div>
            {campaignForm.template_id && (
              <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />Using template</Badge>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCampaignOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCampaign}><Send className="h-4 w-4 mr-2" />Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
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
            <DialogDescription>Upload a CSV with: name, email, company, phone, tags columns</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">Select your CSV file</p>
              <Input type="file" accept=".csv" onChange={handleBulkUpload} className="max-w-[200px] mx-auto" />
            </div>
            <Button variant="outline" onClick={downloadSampleCSV} className="w-full"><Download className="h-4 w-4 mr-2" />Download Sample CSV</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
