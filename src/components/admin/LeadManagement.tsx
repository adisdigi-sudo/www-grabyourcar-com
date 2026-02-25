import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Plus,
  MessageSquare,
  Edit,
  Eye,
  Flame,
  ThermometerSun,
  Snowflake,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Car,
  Tag,
  Users,
  Shield,
  CreditCard,
  Package,
  Building2,
  X,
  UserCheck,
} from "lucide-react";

interface Lead {
  id: string;
  source: string;
  lead_type: string;
  status: string;
  priority: string;
  customer_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  car_brand: string | null;
  car_model: string | null;
  car_variant: string | null;
  budget_min: number | null;
  budget_max: number | null;
  follow_up_count: number | null;
  buying_timeline: string | null;
  assigned_to: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  tags: string[];
  service_category: string | null;
  team_assigned: string | null;
  created_at: string;
  updated_at: string;
}

const statusOptions = [
  { value: 'new', label: 'New', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', icon: Phone, color: 'bg-purple-100 text-purple-800' },
  { value: 'qualified', label: 'Qualified', icon: CheckCircle, color: 'bg-teal-100 text-teal-800' },
  { value: 'hot', label: 'Hot', icon: Flame, color: 'bg-red-100 text-red-800' },
  { value: 'warm', label: 'Warm', icon: ThermometerSun, color: 'bg-orange-100 text-orange-800' },
  { value: 'cold', label: 'Cold', icon: Snowflake, color: 'bg-gray-100 text-gray-800' },
  { value: 'converted', label: 'Converted', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'lost', label: 'Lost', icon: XCircle, color: 'bg-red-100 text-red-800' },
];

const sourceOptions = ['website', 'whatsapp', 'chatbot', 'landing_page', 'phone', 'referral'];
const leadTypeOptions = ['car_inquiry', 'test_drive', 'finance', 'insurance', 'hsrp', 'rental'];

// Service categories with icons and colors
const serviceCategoryOptions = [
  { value: 'car_inquiry', label: 'Car Inquiry', icon: Car, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'insurance', label: 'Insurance', icon: Shield, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'finance', label: 'Car Loan', icon: CreditCard, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'hsrp', label: 'HSRP', icon: Tag, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'rental', label: 'Rental', icon: Car, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  { value: 'accessories', label: 'Accessories', icon: Package, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  { value: 'corporate', label: 'Corporate', icon: Building2, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
];

// Team assignment options
const teamOptions = [
  { value: 'sales', label: 'Sales Team', color: 'bg-blue-500' },
  { value: 'insurance_team', label: 'Insurance Team', color: 'bg-green-500' },
  { value: 'finance_team', label: 'Finance Team', color: 'bg-purple-500' },
  { value: 'hsrp_team', label: 'HSRP Team', color: 'bg-orange-500' },
  { value: 'rental_team', label: 'Rental Team', color: 'bg-teal-500' },
  { value: 'corporate_team', label: 'Corporate Team', color: 'bg-indigo-500' },
];

// Quick tags for leads
const quickTags = [
  'VIP', 'Urgent', 'Follow-up', 'Callback', 'Document Pending', 'Price Negotiation',
  'Test Drive Done', 'Finance Approved', 'Insurance Quoted', 'Ready to Buy'
];

export const LeadManagement = ({ verticalFilter }: { verticalFilter?: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>(
    verticalFilter === "insurance" ? "insurance" :
    verticalFilter === "sales" ? "car_inquiry" :
    verticalFilter === "loans" ? "finance" :
    "all"
  );
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newLeadForm, setNewLeadForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    city: "",
    car_brand: "",
    car_model: "",
    source: "website",
    lead_type: "car_inquiry",
    service_category: "car_inquiry",
    team_assigned: "",
    status: "new",
    notes: "",
    tags: [] as string[],
  });

  // Map vertical to allowed service categories
  const verticalCategoryMap: Record<string, string[]> = {
    insurance: ['insurance'],
    sales: ['car_inquiry'],
    loans: ['finance'],
  };
  const allowedCategories = verticalFilter ? verticalCategoryMap[verticalFilter] : null;

  // Fetch leads with category filter
  const { data: leads, isLoading } = useQuery({
    queryKey: ['adminLeads', statusFilter, categoryFilter, teamFilter, searchQuery, verticalFilter],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply vertical-level filter (enforced, can't be bypassed)
      if (allowedCategories && allowedCategories.length === 1) {
        query = query.eq('service_category', allowedCategories[0]);
      } else if (allowedCategories && allowedCategories.length > 1) {
        query = query.in('service_category', allowedCategories);
      } else if (categoryFilter !== 'all') {
        query = query.eq('service_category', categoryFilter);
      }
      
      if (teamFilter !== 'all') {
        query = query.eq('team_assigned', teamFilter);
      }
      
      if (searchQuery) {
        query = query.or(`customer_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Lead[];
    },
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
      toast.success('Lead updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update lead');
      console.error(error);
    },
  });

  // Add activity mutation
  const addActivityMutation = useMutation({
    mutationFn: async ({ leadId, type, description }: { leadId: string; type: string; description: string }) => {
      const { error } = await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          activity_type: type,
          description,
          performed_by: user?.id,
        });
      
      if (error) throw error;

      // Update lead's follow-up count
      await supabase
        .from('leads')
        .update({ 
          last_contacted_at: new Date().toISOString(),
          follow_up_count: (selectedLead?.follow_up_count || 0) + 1,
        })
        .eq('id', leadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
      setNoteText("");
      setIsAddingNote(false);
      toast.success('Activity logged');
    },
    onError: (error) => {
      toast.error('Failed to log activity');
      console.error(error);
    },
  });

  // Add lead mutation
  const addLeadMutation = useMutation({
    mutationFn: async (leadData: typeof newLeadForm) => {
      const { error } = await supabase
        .from('leads')
        .insert([{
          customer_name: leadData.customer_name,
          phone: leadData.phone,
          email: leadData.email || null,
          city: leadData.city || null,
          car_brand: leadData.car_brand || null,
          car_model: leadData.car_model || null,
          source: leadData.source,
          lead_type: leadData.lead_type,
          service_category: leadData.service_category,
          team_assigned: leadData.team_assigned || null,
          status: leadData.status,
          notes: leadData.notes || null,
          tags: leadData.tags,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
      toast.success('Lead added successfully');
      setIsAddLeadOpen(false);
      setNewLeadForm({
        customer_name: "",
        phone: "",
        email: "",
        city: "",
        car_brand: "",
        car_model: "",
        source: "website",
        lead_type: "car_inquiry",
        service_category: "car_inquiry",
        team_assigned: "",
        status: "new",
        notes: "",
        tags: [],
      });
    },
    onError: (error) => {
      toast.error('Failed to add lead');
      console.error(error);
    },
  });

  // Bulk upload handler
  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      
      const leads = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const leadObj: Record<string, string> = {};
        headers.forEach((header, index) => {
          leadObj[header] = values[index] || '';
        });
        return leadObj;
      });

      toast.loading(`Processing ${leads.length} leads...`);
      
      let success = 0;
      let failed = 0;

      for (const lead of leads) {
        try {
          const { error } = await supabase.from('leads').insert({
            customer_name: lead.customer_name || lead.name || 'Unknown',
            phone: lead.phone || lead.mobile || '',
            email: lead.email || null,
            city: lead.city || null,
            car_brand: lead.car_brand || lead.brand || null,
            car_model: lead.car_model || lead.model || null,
            source: lead.source || 'csv_import',
            lead_type: lead.lead_type || 'car_inquiry',
            status: 'new',
            notes: lead.notes || null,
          });
          
          if (error) throw error;
          success++;
        } catch {
          failed++;
        }
      }

      toast.dismiss();
      toast.success(`Imported ${success} leads, ${failed} failed`);
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
      setIsBulkUploadOpen(false);
    } catch (error) {
      toast.error('Failed to process file');
      console.error(error);
    }
  };

  const handleAddLead = () => {
    if (!newLeadForm.customer_name || !newLeadForm.phone) {
      toast.error('Please fill in customer name and phone');
      return;
    }
    addLeadMutation.mutate(newLeadForm);
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    updateLeadMutation.mutate({ id: leadId, updates: { status: newStatus } });
  };

  const handleAddNote = () => {
    if (!selectedLead || !noteText.trim()) return;
    
    addActivityMutation.mutate({
      leadId: selectedLead.id,
      type: 'note',
      description: noteText,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    if (!statusConfig) return <Badge>{status}</Badge>;
    
    const Icon = statusConfig.icon;
    return (
      <Badge className={`${statusConfig.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string | null) => {
    const categoryConfig = serviceCategoryOptions.find(c => c.value === category);
    if (!categoryConfig) return <Badge variant="outline">{category || 'General'}</Badge>;
    
    const Icon = categoryConfig.icon;
    return (
      <Badge className={`${categoryConfig.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {categoryConfig.label}
      </Badge>
    );
  };

  const getTeamBadge = (team: string | null) => {
    if (!team) return <span className="text-muted-foreground text-sm">Unassigned</span>;
    const teamConfig = teamOptions.find(t => t.value === team);
    return (
      <Badge variant="secondary" className="gap-1">
        <Users className="h-3 w-3" />
        {teamConfig?.label || team}
      </Badge>
    );
  };

  const handleAddTag = (leadId: string, tag: string) => {
    const lead = leads?.find(l => l.id === leadId);
    if (!lead) return;
    const newTags = [...(lead.tags || []), tag].filter((t, i, a) => a.indexOf(t) === i);
    updateLeadMutation.mutate({ id: leadId, updates: { tags: newTags } });
  };

  const handleRemoveTag = (leadId: string, tag: string) => {
    const lead = leads?.find(l => l.id === leadId);
    if (!lead) return;
    const newTags = (lead.tags || []).filter(t => t !== tag);
    updateLeadMutation.mutate({ id: leadId, updates: { tags: newTags } });
  };

  const handleAssignTeam = (leadId: string, team: string) => {
    updateLeadMutation.mutate({ id: leadId, updates: { team_assigned: team } });
    toast.success(`Lead assigned to ${teamOptions.find(t => t.value === team)?.label || team}`);
  };

  const handleUpdateCategory = (leadId: string, category: string) => {
    updateLeadMutation.mutate({ id: leadId, updates: { service_category: category } });
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return '-';
    const formatNum = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
    if (min && max) return `${formatNum(min)} - ${formatNum(max)}`;
    if (min) return `${formatNum(min)}+`;
    if (max) return `Up to ${formatNum(max)}`;
    return '-';
  };

  // Category stats
  const categoryStats = leads?.reduce((acc, lead) => {
    const cat = lead.service_category || 'car_inquiry';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {verticalFilter === 'insurance' ? 'Insurance Lead Management' :
             verticalFilter === 'sales' ? 'Sales Lead Management' :
             verticalFilter === 'loans' ? 'Loan Lead Management' :
             'Lead Management'}
          </h1>
          <p className="text-muted-foreground">
            {verticalFilter ? `Manage ${verticalFilter} leads` : 'Manage, tag, and assign leads across all services'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Category Quick Filters - hide when vertical is locked */}
      {!verticalFilter && (
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('all')}
        >
          All ({leads?.length || 0})
        </Button>
        {serviceCategoryOptions.map((cat) => {
          const Icon = cat.icon;
          const count = categoryStats[cat.value] || 0;
          return (
            <Button
              key={cat.value}
              variant={categoryFilter === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat.value)}
              className="gap-1"
            >
              <Icon className="h-3 w-3" />
              {cat.label} ({count})
            </Button>
          );
        })}
      </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[160px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teamOptions.map((team) => (
                  <SelectItem key={team.value} value={team.value}>
                    {team.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading leads...
                    </TableCell>
                  </TableRow>
                ) : leads && leads.length > 0 ? (
                  leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{lead.customer_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.service_category || 'car_inquiry'}
                          onValueChange={(value) => handleUpdateCategory(lead.id, value)}
                        >
                          <SelectTrigger className="w-[130px] h-8 border-0 p-0">
                            {getCategoryBadge(lead.service_category)}
                          </SelectTrigger>
                          <SelectContent>
                            {serviceCategoryOptions.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.team_assigned || ''}
                          onValueChange={(value) => handleAssignTeam(lead.id, value)}
                        >
                          <SelectTrigger className="w-[140px] h-8 border-0 p-0">
                            {getTeamBadge(lead.team_assigned)}
                          </SelectTrigger>
                          <SelectContent>
                            {teamOptions.map((team) => (
                              <SelectItem key={team.value} value={team.value}>
                                {team.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(lead.tags || []).slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs gap-1">
                              {tag}
                              <X 
                                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                onClick={() => handleRemoveTag(lead.id, tag)}
                              />
                            </Badge>
                          ))}
                          {(lead.tags || []).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{lead.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => handleStatusChange(lead.id, value)}
                        >
                          <SelectTrigger className="w-[120px] h-8 border-0 p-0">
                            {getStatusBadge(lead.status)}
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), 'dd MMM')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`tel:${lead.phone}`)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`https://wa.me/91${lead.phone.replace(/\D/g, '')}`)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No leads found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Lead Details
              {selectedLead && getCategoryBadge(selectedLead.service_category)}
            </DialogTitle>
            <DialogDescription>
              View, tag, and manage lead information
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              {/* Category & Team Assignment */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service Category</label>
                  <Select
                    value={selectedLead.service_category || 'car_inquiry'}
                    onValueChange={(value) => {
                      handleUpdateCategory(selectedLead.id, value);
                      setSelectedLead({ ...selectedLead, service_category: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategoryOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign to Team</label>
                  <Select
                    value={selectedLead.team_assigned || ''}
                    onValueChange={(value) => {
                      handleAssignTeam(selectedLead.id, value);
                      setSelectedLead({ ...selectedLead, team_assigned: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamOptions.map((team) => (
                        <SelectItem key={team.value} value={team.value}>
                          {team.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {(selectedLead.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 px-3 py-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => {
                          handleRemoveTag(selectedLead.id, tag);
                          setSelectedLead({ ...selectedLead, tags: selectedLead.tags.filter(t => t !== tag) });
                        }}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {quickTags.filter(t => !(selectedLead.tags || []).includes(t)).slice(0, 6).map((tag) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleAddTag(selectedLead.id, tag);
                        setSelectedLead({ ...selectedLead, tags: [...(selectedLead.tags || []), tag] });
                      }}
                    >
                      + {tag}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="max-w-[200px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        handleAddTag(selectedLead.id, newTag.trim());
                        setSelectedLead({ ...selectedLead, tags: [...(selectedLead.tags || []), newTag.trim()] });
                        setNewTag('');
                      }
                    }}
                  />
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      if (newTag.trim()) {
                        handleAddTag(selectedLead.id, newTag.trim());
                        setSelectedLead({ ...selectedLead, tags: [...(selectedLead.tags || []), newTag.trim()] });
                        setNewTag('');
                      }
                    }}
                  >
                    Add Tag
                  </Button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
                  <p className="font-medium">{selectedLead.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedLead.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p>{selectedLead.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p>{selectedLead.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p>{selectedLead.city || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Source</label>
                  <Badge variant="outline">{selectedLead.source}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Interest</label>
                  <p>{selectedLead.car_brand} {selectedLead.car_model} {selectedLead.car_variant || ''}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Budget</label>
                  <p>{formatBudget(selectedLead.budget_min, selectedLead.budget_max)}</p>
                </div>
              </div>

              {selectedLead.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="mt-1 text-sm bg-muted p-3 rounded">{selectedLead.notes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Add Activity</h4>
                </div>
                <Textarea
                  placeholder="Add a note about this lead..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || addActivityMutation.isPending}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`tel:${selectedLead.phone}`)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://wa.me/91${selectedLead.phone.replace(/\D/g, '')}`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Add a new customer lead to the CRM</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Category & Team Assignment - First */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">Service Category *</label>
                <Select 
                  value={newLeadForm.service_category} 
                  onValueChange={(v) => setNewLeadForm({ ...newLeadForm, service_category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {serviceCategoryOptions.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to Team</label>
                <Select 
                  value={newLeadForm.team_assigned} 
                  onValueChange={(v) => setNewLeadForm({ ...newLeadForm, team_assigned: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select team..." /></SelectTrigger>
                  <SelectContent>
                    {teamOptions.map(team => (
                      <SelectItem key={team.value} value={team.value}>{team.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name *</label>
                <Input
                  value={newLeadForm.customer_name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, customer_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone *</label>
                <Input
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  placeholder="10-digit mobile"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input
                  value={newLeadForm.city}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Car Brand</label>
                <Input
                  value={newLeadForm.car_brand}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, car_brand: e.target.value })}
                  placeholder="e.g., Maruti, Hyundai"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Car Model</label>
                <Input
                  value={newLeadForm.car_model}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, car_model: e.target.value })}
                  placeholder="e.g., Swift, Creta"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Source</label>
                <Select value={newLeadForm.source} onValueChange={(v) => setNewLeadForm({ ...newLeadForm, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map(s => (
                      <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lead Type</label>
                <Select value={newLeadForm.lead_type} onValueChange={(v) => setNewLeadForm({ ...newLeadForm, lead_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leadTypeOptions.map(t => (
                      <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsAddLeadOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={addLeadMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              {addLeadMutation.isPending ? 'Adding...' : 'Add Lead'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Leads</DialogTitle>
            <DialogDescription>
              Upload a CSV file with lead data
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Plus className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop a CSV file or click to browse
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleBulkUpload}
                className="max-w-xs mx-auto"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">CSV Format:</p>
              <code className="text-xs bg-muted p-2 rounded block">
                customer_name,phone,email,city,car_brand,car_model,source
              </code>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
