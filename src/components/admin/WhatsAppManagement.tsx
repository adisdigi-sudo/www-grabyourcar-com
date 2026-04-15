import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, MessageSquare, Phone, User, RefreshCw, Send, Bot, AlertCircle, CheckCircle } from "lucide-react";

interface MessageItem {
  role: string;
  content: string;
  timestamp: string;
}

interface WhatsAppConversation {
  id: string;
  phone_number: string;
  customer_name: string | null;
  messages: MessageItem[] | unknown;
  status: string | null;
  last_message_at: string | null;
  created_at: string;
}

export const WhatsAppManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch conversations
  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['whatsappConversations', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as WhatsAppConversation[];
    },
  });

  // Helper to safely get messages array
  const getMessages = (conv: WhatsAppConversation): MessageItem[] => {
    if (Array.isArray(conv.messages)) return conv.messages as MessageItem[];
    return [];
  };

  // Filter conversations by search
  const filteredConversations = conversations?.filter(conv => 
    conv.phone_number.includes(searchQuery) || 
    conv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: conversations?.length || 0,
    active: conversations?.filter(c => c.status === 'active').length || 0,
    hotLeads: conversations?.filter(c => {
      const messages = getMessages(c);
      const hasHighIntent = messages.some(m => 
        m.content.toLowerCase().includes('price') || 
        m.content.toLowerCase().includes('book') ||
        m.content.toLowerCase().includes('buy')
      );
      return hasHighIntent;
    }).length || 0,
    today: conversations?.filter(c => {
      const today = new Date().toDateString();
      return new Date(c.last_message_at || c.created_at).toDateString() === today;
    }).length || 0,
  };

  const getMessagePreview = (conv: WhatsAppConversation) => {
    const messages = getMessages(conv);
    if (messages.length === 0) return 'No messages';
    const lastMessage = messages[messages.length - 1];
    return lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? '...' : '');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Conversations</h2>
          <p className="text-muted-foreground">
            Manage WhatsApp leads and AI chatbot conversations
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.hotLeads}</div>
            <p className="text-xs text-muted-foreground">Hot Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* API Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            WhatsApp API Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">API Connected</p>
                <p className="text-xs text-muted-foreground">Finbite Provider</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">AI Chatbot Active</p>
                <p className="text-xs text-muted-foreground">Gemini 2.5 Flash</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Webhook Active</p>
                <p className="text-xs text-muted-foreground">Receiving messages</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredConversations && filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => (
                    <TableRow key={conv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                      setSelectedConversation(conv);
                      setIsDetailOpen(true);
                    }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{conv.customer_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{conv.phone_number}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {getMessagePreview(conv)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getMessages(conv).length}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={conv.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {conv.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conv.last_message_at ? format(new Date(conv.last_message_at), 'dd MMM, HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://wa.me/${conv.phone_number.replace(/\D/g, '')}`, '_blank');
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${conv.phone_number}`, '_blank');
                            }}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No conversations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Conversation Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Conversation with {selectedConversation?.customer_name || selectedConversation?.phone_number}
            </DialogTitle>
            <DialogDescription>
              View full conversation history
            </DialogDescription>
          </DialogHeader>
          
          {selectedConversation && (
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4">
                {getMessages(selectedConversation).map((msg, index) => (
                  <div 
                    key={index}
                    className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'assistant' 
                        ? 'bg-muted' 
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.role === 'assistant' ? (
                          <Bot className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        <span className="text-xs opacity-70">
                          {msg.role === 'assistant' ? 'AI Bot' : 'Customer'}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-50 mt-1">
                        {msg.timestamp ? format(new Date(msg.timestamp), 'dd MMM, HH:mm') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
