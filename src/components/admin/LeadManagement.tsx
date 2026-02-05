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

export const LeadManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Fetch leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ['adminLeads', statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
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

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return '-';
    const formatNum = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
    if (min && max) return `${formatNum(min)} - ${formatNum(max)}`;
    if (min) return `${formatNum(min)}+`;
    if (max) return `Up to ${formatNum(max)}`;
    return '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Management</h1>
          <p className="text-muted-foreground">
            Manage and track all customer leads
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
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
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
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
                  <TableHead>Contact</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
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
                            {lead.city && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {lead.city}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </p>
                          {lead.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.car_brand ? (
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.car_brand} {lead.car_model}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatBudget(lead.budget_min, lead.budget_max)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => handleStatusChange(lead.id, value)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
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
                      <TableCell>
                        <Badge variant="outline">{lead.source}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), 'dd MMM yyyy')}
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              View and manage lead information
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
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
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Buying Timeline</label>
                  <p>{selectedLead.buying_timeline || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Follow-ups</label>
                  <p>{selectedLead.follow_up_count || 0}</p>
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
    </div>
  );
};
