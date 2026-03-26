import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, Plus, Edit, Trash2, Eye, Send, PlayCircle, PauseCircle,
  Clock, CheckCircle, XCircle, TrendingUp, Users, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  template_type: string;
  html_content: string;
  variables: string[] | null;
  is_active: boolean | null;
  created_at: string;
}

interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_event: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "welcome", label: "Welcome", color: "bg-green-500" },
  { value: "quote", label: "Price Quote", color: "bg-blue-500" },
  { value: "followup", label: "Follow-up", color: "bg-purple-500" },
  { value: "reminder", label: "Reminder", color: "bg-orange-500" },
  { value: "transactional", label: "Transactional", color: "bg-cyan-500" },
  { value: "newsletter", label: "Newsletter", color: "bg-pink-500" },
];

export default function EmailAutomationManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("templates");
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [templatesRes, sequencesRes, logsRes] = await Promise.all([
        supabase.from("email_templates").select("*").order("category"),
        supabase.from("email_sequences").select("*").order("created_at", { ascending: false }),
        supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (sequencesRes.data) setSequences(sequencesRes.data);
      if (logsRes.data) setLogs(logsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate?.name || !editingTemplate?.subject || !editingTemplate?.html_content) {
      toast({ title: "Validation Error", description: "Name, subject, and content are required", variant: "destructive" });
      return;
    }

    try {
      const variableRegex = /\{[a-z_]+\}/g;
      const extractedVariables = editingTemplate.html_content.match(variableRegex) || [];

      const templateData = {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        category: editingTemplate.category || "general",
        template_type: editingTemplate.template_type || "transactional",
        html_content: editingTemplate.html_content,
        variables: Array.from(new Set(extractedVariables)),
        is_active: editingTemplate.is_active ?? true,
      };

      if (editingTemplate.id) {
        const { error } = await supabase.from("email_templates").update(templateData).eq("id", editingTemplate.id);
        if (error) throw error;
        toast({ title: "Template updated" });
      } else {
        const { error } = await supabase.from("email_templates").insert([templateData]);
        if (error) throw error;
        toast({ title: "Template created" });
      }

      setIsEditing(false);
      setEditingTemplate(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Template deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean | null) => {
    try {
      await supabase.from("email_templates").update({ is_active: !isActive }).eq("id", id);
      fetchData();
    } catch (error) {
      console.error("Error toggling template:", error);
    }
  };

  const sendTestEmail = async () => {
    if (!previewTemplate || !testEmail) {
      toast({ title: "Enter email", description: "Please enter an email address", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-automated-email", {
        body: {
          template_id: previewTemplate.id,
          recipient_email: testEmail,
          recipient_name: "Test User",
          variables: {
            car_name: "Maruti Swift VXi",
            ex_showroom: "₹6,49,000",
            rto: "₹52,000",
            insurance: "₹28,000",
            on_road_price: "₹7,44,000",
            special_offer: "Free accessories worth ₹15,000",
            emi_amount: "₹12,500",
          },
        },
      });

      if (error) throw error;
      toast({ title: "Test email sent!", description: `Sent to ${testEmail}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.color || "bg-gray-500";
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  // Stats
  const stats = {
    totalTemplates: templates.length,
    activeTemplates: templates.filter(t => t.is_active).length,
    totalSent: logs.filter(l => l.status === "sent").length,
    openRate: logs.length > 0 ? Math.round((logs.filter(l => l.opened_at).length / logs.length) * 100) : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-500" />
            Email Automation
          </h2>
          <p className="text-muted-foreground">Manage email templates, sequences, and track performance</p>
        </div>
        <Button onClick={() => { setEditingTemplate({}); setIsEditing(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{stats.totalTemplates}</div>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.activeTemplates}</div>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalSent}</div>
                <p className="text-xs text-muted-foreground">Emails Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.openRate}%</div>
                <p className="text-xs text-muted-foreground">Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">📧 Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="sequences">🔄 Sequences ({sequences.length})</TabsTrigger>
          <TabsTrigger value="logs">📊 Send Logs ({logs.length})</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className={`relative ${!template.is_active ? "opacity-60" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Badge className={`${getCategoryColor(template.category)} text-white`}>
                      {getCategoryLabel(template.category)}
                    </Badge>
                    <Switch
                      checked={template.is_active ?? false}
                      onCheckedChange={() => handleToggleActive(template.id, template.is_active)}
                    />
                  </div>
                  <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-1">{template.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.variables.slice(0, 3).map((v, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{v}</Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{template.variables.length - 3}</Badge>
                      )}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewTemplate(template)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingTemplate(template); setIsEditing(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(template.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Sequences Tab */}
        <TabsContent value="sequences">
          <Card>
            <CardHeader>
              <CardTitle>Email Sequences</CardTitle>
              <CardDescription>Automated drip campaigns and follow-up sequences</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequences.map((seq) => (
                    <TableRow key={seq.id}>
                      <TableCell>
                        <div className="font-medium">{seq.name}</div>
                        <div className="text-xs text-muted-foreground">{seq.description}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{seq.trigger_event || seq.trigger_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {seq.is_active ? (
                          <Badge className="bg-green-500"><PlayCircle className="w-3 h-3 mr-1" /> Active</Badge>
                        ) : (
                          <Badge variant="secondary"><PauseCircle className="w-3 h-3 mr-1" /> Paused</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Email Activity</CardTitle>
              <CardDescription>Track sent emails and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="font-medium">{log.recipient_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{log.recipient_email}</div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
                        <TableCell>
                          {log.status === "sent" ? (
                            <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>
                          ) : log.status === "failed" ? (
                            <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>
                          ) : (
                            <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> {log.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.sent_at ? new Date(log.sent_at).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate?.id ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>Design email templates with dynamic variables like {"{customer_name}"}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={editingTemplate?.name || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editingTemplate?.category || "general"}
                  onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={editingTemplate?.subject || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                placeholder="e.g., Welcome to GrabYourCar, {customer_name}!"
              />
            </div>

            <div className="space-y-2">
              <Label>HTML Content</Label>
              <Textarea
                value={editingTemplate?.html_content || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, html_content: e.target.value })}
                placeholder="<div>Hi {customer_name}...</div>"
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{variable_name}"} for dynamic content. Common: {"{customer_name}"}, {"{car_name}"}, {"{price}"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editingTemplate?.is_active ?? true}
                onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>{editingTemplate?.id ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>Subject: {previewTemplate?.subject}</DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-white">
                <iframe
                  sandbox="allow-same-origin"
                  srcDoc={previewTemplate.html_content}
                  style={{ width: '100%', minHeight: '400px', border: 'none' }}
                  title="Email template preview"
                />
              </div>

              {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                <div>
                  <Label className="text-sm">Variables:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {previewTemplate.variables.map((v, i) => (
                      <Badge key={i} variant="outline">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <Label>Send Test Email</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button onClick={sendTestEmail} disabled={isSending}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSending ? "Sending..." : "Send Test"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
