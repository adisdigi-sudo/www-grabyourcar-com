import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, Plus, Edit, Trash2, Send, Eye, Copy, CheckCircle,
  Play, Pause, Users, BarChart3, TestTube, Sparkles,
  Palette, Type, Image, ArrowRight, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmailCampaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  status: string;
  target_segment: any;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  conversion_count: number;
  ab_test_enabled: boolean;
  ab_test_variants: any[];
  created_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  html_content: string;
  is_active: boolean;
}

const TEMPLATE_BLOCKS = [
  { id: "header", label: "Header", icon: Type, preview: "Company Logo & Title" },
  { id: "hero", label: "Hero Image", icon: Image, preview: "Featured car image" },
  { id: "text", label: "Text Block", icon: Type, preview: "Paragraph content" },
  { id: "cta", label: "Call to Action", icon: ArrowRight, preview: "Button: Get Quote" },
  { id: "cars", label: "Car Cards", icon: Palette, preview: "3 car recommendations" },
  { id: "offers", label: "Offers", icon: Sparkles, preview: "Current promotions" },
  { id: "footer", label: "Footer", icon: Type, preview: "Contact & unsubscribe" },
];

export function EmailCampaignBuilder() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    campaign_type: "email",
    segment: "all",
    template_id: "",
    ab_test_enabled: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [campaignsRes, templatesRes] = await Promise.all([
        supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("email_templates").select("*").eq("is_active", true),
      ]);

      if (campaignsRes.data) {
        setCampaigns(campaignsRes.data.map(c => ({
          ...c,
          ab_test_variants: Array.isArray(c.ab_test_variants) ? c.ab_test_variants : []
        })));
      }
      if (templatesRes.data) setTemplates(templatesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) {
      toast({ title: "Error", description: "Campaign name is required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("marketing_campaigns")
        .insert([{
          name: newCampaign.name,
          description: newCampaign.description,
          campaign_type: newCampaign.campaign_type,
          target_segment: { segment: newCampaign.segment },
          status: "draft",
          ab_test_enabled: newCampaign.ab_test_enabled,
        }]);

      if (error) throw error;

      toast({ title: "Campaign created", description: "Now design your email" });
      setIsCreating(false);
      setNewCampaign({ name: "", description: "", campaign_type: "email", segment: "all", template_id: "", ab_test_enabled: false });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleLaunchCampaign = async (campaign: EmailCampaign) => {
    if (!confirm(`Launch "${campaign.name}" to ${campaign.total_recipients} recipients?`)) return;

    try {
      await supabase
        .from("marketing_campaigns")
        .update({ status: "active", start_date: new Date().toISOString() })
        .eq("id", campaign.id);

      toast({ title: "Campaign launched", description: "Emails are being sent" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;

    try {
      await supabase.from("marketing_campaigns").delete().eq("id", id);
      toast({ title: "Campaign deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><Play className="w-3 h-3 mr-1" /> Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "paused":
        return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" /> Paused</Badge>;
      case "scheduled":
        return <Badge className="bg-purple-500">Scheduled</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.sent_count, 0),
    avgOpenRate: campaigns.length > 0 
      ? Math.round(campaigns.reduce((sum, c) => sum + (c.sent_count > 0 ? (c.open_count / c.sent_count) * 100 : 0), 0) / campaigns.length)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Campaigns</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Emails Sent</p>
                <p className="text-xl font-bold">{stats.totalSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Open Rate</p>
                <p className="text-xl font-bold">{stats.avgOpenRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Email Campaigns
          </h2>
          <p className="text-sm text-muted-foreground">
            Create and manage email marketing campaigns with A/B testing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="builder">Visual Builder</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>A/B Test</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          No campaigns yet. Create your first email campaign.
                        </TableCell>
                      </TableRow>
                    ) : (
                      campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{campaign.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(campaign.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {campaign.campaign_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <Users className="w-3 h-3 mr-1" />
                              {campaign.total_recipients}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {campaign.sent_count > 0 ? (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3 text-blue-500" />
                                  {Math.round((campaign.open_count / campaign.sent_count) * 100)}%
                                </span>
                                <span className="flex items-center gap-1">
                                  <BarChart3 className="h-3 w-3 text-green-500" />
                                  {Math.round((campaign.click_count / campaign.sent_count) * 100)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {campaign.ab_test_enabled ? (
                              <Badge className="bg-purple-500">
                                <TestTube className="w-3 h-3 mr-1" />
                                A/B
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {campaign.status === "draft" && (
                                <Button 
                                  size="sm"
                                  onClick={() => handleLaunchCampaign(campaign)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
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
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline">{template.category}</Badge>
                    <Switch checked={template.is_active} />
                  </div>
                  <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-1">{template.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4 mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Copy className="h-4 w-4 mr-1" /> Duplicate
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Visual Builder Tab */}
        <TabsContent value="builder">
          <Card>
            <CardHeader>
              <CardTitle>Drag & Drop Email Builder</CardTitle>
              <CardDescription>Build beautiful emails with pre-made blocks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-4 gap-6">
                {/* Block Palette */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">BLOCKS</h4>
                  {TEMPLATE_BLOCKS.map((block) => (
                    <motion.div
                      key={block.id}
                      className="p-3 rounded-lg border bg-muted/30 cursor-move hover:border-primary transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-2">
                        <block.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{block.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{block.preview}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Email Preview */}
                <div className="lg:col-span-3">
                  <div className="border rounded-lg bg-background p-4 min-h-[500px]">
                    <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Palette className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg">Drag blocks here to build your email</p>
                      <p className="text-sm">Or start with a pre-built template</p>
                      <Button variant="outline" className="mt-4">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Use AI to Generate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>Set up your email marketing campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                placeholder="e.g., Summer Sale Announcement"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What's this campaign about?"
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Segment</Label>
              <Select 
                value={newCampaign.segment}
                onValueChange={(v) => setNewCampaign({ ...newCampaign, segment: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscribers</SelectItem>
                  <SelectItem value="hot_leads">Hot Leads</SelectItem>
                  <SelectItem value="warm_leads">Warm Leads</SelectItem>
                  <SelectItem value="new_subscribers">New Subscribers</SelectItem>
                  <SelectItem value="inactive">Inactive (Re-engagement)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label>Enable A/B Testing</Label>
                <p className="text-xs text-muted-foreground">Test different subject lines or content</p>
              </div>
              <Switch
                checked={newCampaign.ab_test_enabled}
                onCheckedChange={(v) => setNewCampaign({ ...newCampaign, ab_test_enabled: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateCampaign}>
              <Mail className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
