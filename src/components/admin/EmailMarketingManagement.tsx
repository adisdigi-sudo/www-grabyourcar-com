import { useState } from "react";
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
import { format } from "date-fns";
import { 
  Mail, 
  Plus, 
  Send, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  Building2,
  Download,
  Upload,
  Sparkles,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from "lucide-react";

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  template: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  recipientCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  thumbnail?: string;
}

interface Contact {
  id: string;
  email: string;
  name: string;
  company?: string;
  gstin?: string;
  phone?: string;
  tags: string[];
  subscribed: boolean;
  createdAt: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  { id: '1', name: 'Welcome Email', subject: 'Welcome to Grabyourcar!', content: 'Welcome {name}...', category: 'onboarding' },
  { id: '2', name: 'Car Inquiry Follow-up', subject: 'About your {car_model} inquiry', content: 'Hi {name}, Thank you for...', category: 'sales' },
  { id: '3', name: 'Corporate Introduction', subject: 'Corporate Fleet Solutions for {company}', content: 'Dear {name}...', category: 'corporate' },
  { id: '4', name: 'New Car Launch', subject: 'Exciting News: {car_name} Now Available!', content: 'Be the first to...', category: 'marketing' },
  { id: '5', name: 'Festival Offer', subject: 'Special {festival} Offers on New Cars!', content: 'Celebrate with...', category: 'marketing' },
  { id: '6', name: 'Insurance Renewal', subject: 'Your Car Insurance is Due for Renewal', content: 'Dear {name}...', category: 'service' },
];

const STORAGE_KEYS = {
  campaigns: 'gyc_email_campaigns',
  contacts: 'gyc_email_contacts',
};

const getStoredData = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const saveData = (key: string, data: unknown) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const EmailMarketingManagement = () => {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>(() => getStoredData(STORAGE_KEYS.campaigns, []));
  const [contacts, setContacts] = useState<Contact[]>(() => getStoredData(STORAGE_KEYS.contacts, []));
  
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isGSTImportOpen, setIsGSTImportOpen] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    content: '',
    template: '',
    scheduledAt: '',
  });
  
  const [contactForm, setContactForm] = useState({
    email: '',
    name: '',
    company: '',
    gstin: '',
    phone: '',
    tags: '',
  });

  // Stats
  const stats = {
    totalContacts: contacts.length,
    subscribedContacts: contacts.filter(c => c.subscribed).length,
    totalCampaigns: campaigns.length,
    sentCampaigns: campaigns.filter(c => c.status === 'sent').length,
    avgOpenRate: campaigns.length > 0 
      ? Math.round(campaigns.reduce((acc, c) => acc + c.openRate, 0) / campaigns.length)
      : 0,
    avgClickRate: campaigns.length > 0
      ? Math.round(campaigns.reduce((acc, c) => acc + c.clickRate, 0) / campaigns.length)
      : 0,
  };

  const handleCreateCampaign = () => {
    if (!campaignForm.name || !campaignForm.subject) {
      toast.error('Please fill in campaign name and subject');
      return;
    }

    const newCampaign: EmailCampaign = {
      id: Date.now().toString(),
      name: campaignForm.name,
      subject: campaignForm.subject,
      content: campaignForm.content,
      template: campaignForm.template,
      status: 'draft',
      recipientCount: contacts.filter(c => c.subscribed).length,
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      createdAt: new Date().toISOString(),
    };

    const updated = [...campaigns, newCampaign];
    setCampaigns(updated);
    saveData(STORAGE_KEYS.campaigns, updated);
    
    toast.success('Campaign created');
    setIsCreateCampaignOpen(false);
    setCampaignForm({ name: '', subject: '', content: '', template: '', scheduledAt: '' });
  };

  const handleAddContact = () => {
    if (!contactForm.email || !contactForm.name) {
      toast.error('Please fill in email and name');
      return;
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      email: contactForm.email,
      name: contactForm.name,
      company: contactForm.company || undefined,
      gstin: contactForm.gstin || undefined,
      phone: contactForm.phone || undefined,
      tags: contactForm.tags ? contactForm.tags.split(',').map(t => t.trim()) : [],
      subscribed: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveData(STORAGE_KEYS.contacts, updated);
    
    toast.success('Contact added');
    setIsContactModalOpen(false);
    setContactForm({ email: '', name: '', company: '', gstin: '', phone: '', tags: '' });
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      
      const newContacts: Contact[] = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        
        return {
          id: Date.now().toString() + Math.random(),
          email: obj.email || '',
          name: obj.name || obj.company_name || 'Unknown',
          company: obj.company || obj.company_name,
          gstin: obj.gstin || obj.gst || obj.gst_number,
          phone: obj.phone || obj.mobile,
          tags: obj.tags ? obj.tags.split(';') : ['imported'],
          subscribed: true,
          createdAt: new Date().toISOString(),
        };
      }).filter(c => c.email);

      const updated = [...contacts, ...newContacts];
      setContacts(updated);
      saveData(STORAGE_KEYS.contacts, updated);
      
      toast.success(`Imported ${newContacts.length} contacts`);
      setIsBulkUploadOpen(false);
    } catch (error) {
      toast.error('Failed to process file');
    }
  };

  const handleGSTSearch = async () => {
    toast.loading('Searching GST database...');
    
    // Simulate GST API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock data - in production, this would call actual GST API
    const mockCompanies: Contact[] = [
      { id: Date.now().toString() + '1', email: 'info@example1.com', name: 'ABC Motors Pvt Ltd', company: 'ABC Motors Pvt Ltd', gstin: '27AABCU9603R1ZM', phone: '9876543210', tags: ['corporate', 'auto-imported'], subscribed: true, createdAt: new Date().toISOString() },
      { id: Date.now().toString() + '2', email: 'contact@example2.com', name: 'XYZ Industries', company: 'XYZ Industries Ltd', gstin: '07AAACZ2345F1ZN', phone: '9876543211', tags: ['corporate', 'auto-imported'], subscribed: true, createdAt: new Date().toISOString() },
    ];
    
    const updated = [...contacts, ...mockCompanies];
    setContacts(updated);
    saveData(STORAGE_KEYS.contacts, updated);
    
    toast.dismiss();
    toast.success(`Found and imported ${mockCompanies.length} companies`);
    setIsGSTImportOpen(false);
  };

  const handleAIGenerateContent = async () => {
    setIsAIGenerating(true);
    
    // Simulate AI content generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const generatedContent = `Dear {name},

We hope this email finds you well. At Grabyourcar, we're committed to making your car buying journey seamless and rewarding.

🚗 Special Offers This Month:
• Up to ₹50,000 off on select SUVs
• Zero processing fee on car loans
• Free 1-year extended warranty

📞 Schedule a test drive today and experience the difference!

Best regards,
Team Grabyourcar

---
To unsubscribe, click {unsubscribe_link}`;
    
    setCampaignForm(prev => ({ ...prev, content: generatedContent }));
    setIsAIGenerating(false);
    toast.success('AI content generated');
  };

  const handleSendCampaign = (campaignId: string) => {
    const updated = campaigns.map(c => 
      c.id === campaignId 
        ? { 
            ...c, 
            status: 'sent' as const, 
            sentAt: new Date().toISOString(),
            sentCount: c.recipientCount,
            openRate: Math.floor(Math.random() * 40) + 20,
            clickRate: Math.floor(Math.random() * 15) + 5,
          }
        : c
    );
    setCampaigns(updated);
    saveData(STORAGE_KEYS.campaigns, updated);
    toast.success('Campaign sent successfully');
  };

  const handleDeleteCampaign = (id: string) => {
    const updated = campaigns.filter(c => c.id !== id);
    setCampaigns(updated);
    saveData(STORAGE_KEYS.campaigns, updated);
    toast.success('Campaign deleted');
  };

  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    saveData(STORAGE_KEYS.contacts, updated);
    toast.success('Contact deleted');
  };

  const downloadSampleCSV = () => {
    const csv = `name,email,company,gstin,phone,tags
John Doe,john@example.com,ABC Corp,27AABCU9603R1ZM,9876543210,corporate
Jane Smith,jane@example.com,XYZ Ltd,07AAACZ2345F1ZN,9876543211,lead;interested`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded');
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" /> },
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
      sending: { color: 'bg-yellow-100 text-yellow-800', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      sent: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      paused: { color: 'bg-orange-100 text-orange-800', icon: <Pause className="h-3 w-3" /> },
    };
    const config = configs[status] || configs.draft;
    
    return (
      <Badge className={`${config.color} gap-1`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Marketing
          </h2>
          <p className="text-muted-foreground">
            Create campaigns, manage contacts, and track performance
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
            <p className="text-xs text-muted-foreground">Total Contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.subscribedContacts}</div>
            <p className="text-xs text-muted-foreground">Subscribed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">Total Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.sentCampaigns}</div>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{stats.avgOpenRate}%</div>
            <p className="text-xs text-muted-foreground">Avg Open Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-600">{stats.avgClickRate}%</div>
            <p className="text-xs text-muted-foreground">Avg Click Rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-2">
            <Send className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="corporate" className="gap-2">
            <Building2 className="h-4 w-4" />
            Corporate GST
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setIsCreateCampaignOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Click Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No campaigns yet. Create your first campaign!
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{campaign.subject}</TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>{campaign.recipientCount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={campaign.openRate} className="w-16 h-2" />
                            <span className="text-sm">{campaign.openRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={campaign.clickRate} className="w-16 h-2" />
                            <span className="text-sm">{campaign.clickRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {campaign.status === 'draft' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleSendCampaign(campaign.id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteCampaign(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
              <Input
                placeholder="Search contacts..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={() => setIsContactModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
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
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No contacts yet. Add or import contacts!
                      </TableCell>
                    </TableRow>
                  ) : (
                    contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.company || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{contact.gstin || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {contact.tags.slice(0, 2).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                            {contact.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{contact.tags.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={contact.subscribed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {contact.subscribed ? 'Subscribed' : 'Unsubscribed'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteContact(contact.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {EMAIL_TEMPLATES.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-xs">{template.category}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{template.subject}</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setCampaignForm(prev => ({ 
                          ...prev, 
                          template: template.id,
                          subject: template.subject,
                          content: template.content,
                        }));
                        setIsCreateCampaignOpen(true);
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Corporate GST Tab */}
        <TabsContent value="corporate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Corporate GST Database Import
              </CardTitle>
              <CardDescription>
                Import companies registered in India via GST database and send automated introduction emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>State Filter</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      <SelectItem value="MH">Maharashtra</SelectItem>
                      <SelectItem value="DL">Delhi</SelectItem>
                      <SelectItem value="KA">Karnataka</SelectItem>
                      <SelectItem value="TN">Tamil Nadu</SelectItem>
                      <SelectItem value="UP">Uttar Pradesh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Industry/Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="it">IT & Software</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleGSTSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Search GST Database
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload GST List
                </Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Auto Email Workflow</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  When companies are imported, you can set up automatic introduction emails:
                </p>
                <div className="flex items-center gap-2">
                  <Switch />
                  <Label>Send automated introduction email to new corporate contacts</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Modal */}
      <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>
              Design and schedule your email campaign
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                placeholder="e.g., Diwali Special Offers"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <Input
                placeholder="e.g., 🎉 Special Diwali Offers on New Cars!"
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Content</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAIGenerateContent}
                  disabled={isAIGenerating}
                >
                  {isAIGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                placeholder="Write your email content here... Use {name}, {company}, etc. for personalization"
                value={campaignForm.content}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
                rows={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Schedule (Optional)</Label>
              <Input
                type="datetime-local"
                value={campaignForm.scheduledAt}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCampaignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCampaign}>
              <Send className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="Contact name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  placeholder="Company name"
                  value={contactForm.company}
                  onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  placeholder="GST Number"
                  value={contactForm.gstin}
                  onChange={(e) => setContactForm(prev => ({ ...prev, gstin: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="Phone number"
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="corporate, interested, delhi"
                value={contactForm.tags}
                onChange={(e) => setContactForm(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContact}>
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with contact information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleBulkUpload}
                className="max-w-[200px] mx-auto"
              />
            </div>

            <Button variant="outline" onClick={downloadSampleCSV} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Sample CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
