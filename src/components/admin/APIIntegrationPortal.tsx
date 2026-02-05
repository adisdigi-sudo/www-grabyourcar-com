import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Plus, 
  Key, 
  Settings, 
  Globe, 
  Truck, 
  Building2, 
  CreditCard, 
  MessageSquare,
  Shield,
  Check,
  X,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Edit,
  TestTube,
  Zap,
  Database,
  Mail,
  Phone
} from "lucide-react";

interface APIConnection {
  id: string;
  name: string;
  category: string;
  provider: string;
  apiKey: string;
  secretKey?: string;
  webhookUrl?: string;
  isActive: boolean;
  lastTested?: string;
  status: 'connected' | 'disconnected' | 'error';
  description?: string;
}

const API_CATEGORIES = [
  { id: 'crm', label: 'CRM & Marketing', icon: Building2, color: 'bg-blue-500' },
  { id: 'shipping', label: 'Shipping & Logistics', icon: Truck, color: 'bg-orange-500' },
  { id: 'banking', label: 'Banking & Finance', icon: CreditCard, color: 'bg-green-500' },
  { id: 'insurance', label: 'Insurance', icon: Shield, color: 'bg-purple-500' },
  { id: 'communication', label: 'Communication', icon: MessageSquare, color: 'bg-teal-500' },
  { id: 'analytics', label: 'Analytics', icon: Database, color: 'bg-pink-500' },
];

const AVAILABLE_INTEGRATIONS = [
  // CRM
  { id: 'zoho_crm', name: 'Zoho CRM', category: 'crm', logo: '🔵', description: 'Sync leads and contacts with Zoho CRM' },
  { id: 'salesforce', name: 'Salesforce', category: 'crm', logo: '☁️', description: 'Enterprise CRM integration' },
  { id: 'hubspot', name: 'HubSpot', category: 'crm', logo: '🧡', description: 'Marketing and sales automation' },
  { id: 'freshsales', name: 'Freshsales', category: 'crm', logo: '💚', description: 'Sales CRM for small businesses' },
  // Shipping
  { id: 'delhivery', name: 'Delhivery', category: 'shipping', logo: '📦', description: 'Pan-India logistics partner' },
  { id: 'bluedart', name: 'BlueDart', category: 'shipping', logo: '🚚', description: 'Premium express delivery' },
  { id: 'shiprocket', name: 'Shiprocket', category: 'shipping', logo: '🚀', description: 'Multi-carrier shipping aggregator' },
  { id: 'ecom_express', name: 'Ecom Express', category: 'shipping', logo: '📬', description: 'E-commerce focused logistics' },
  { id: 'dtdc', name: 'DTDC', category: 'shipping', logo: '📮', description: 'Domestic and international courier' },
  // Banking
  { id: 'hdfc_bank', name: 'HDFC Bank', category: 'banking', logo: '🏦', description: 'Car loan API integration' },
  { id: 'icici_bank', name: 'ICICI Bank', category: 'banking', logo: '🏛️', description: 'Vehicle finance solutions' },
  { id: 'axis_bank', name: 'Axis Bank', category: 'banking', logo: '💳', description: 'Auto loan offerings' },
  { id: 'sbi', name: 'SBI', category: 'banking', logo: '🇮🇳', description: 'State Bank auto finance' },
  { id: 'bajaj_finance', name: 'Bajaj Finance', category: 'banking', logo: '💰', description: 'Quick car loans' },
  // Insurance
  { id: 'policybazaar', name: 'PolicyBazaar', category: 'insurance', logo: '🛡️', description: 'Insurance comparison API' },
  { id: 'acko', name: 'Acko', category: 'insurance', logo: '⚡', description: 'Digital-first car insurance' },
  { id: 'digit', name: 'Digit Insurance', category: 'insurance', logo: '🔢', description: 'Simple car insurance' },
  { id: 'hdfc_ergo', name: 'HDFC Ergo', category: 'insurance', logo: '🛡️', description: 'General insurance' },
  { id: 'tata_aig', name: 'Tata AIG', category: 'insurance', logo: '🏢', description: 'Motor insurance solutions' },
  // Communication
  { id: 'whatsapp_business', name: 'WhatsApp Business', category: 'communication', logo: '💬', description: 'WhatsApp Business API' },
  { id: 'twilio', name: 'Twilio', category: 'communication', logo: '📱', description: 'SMS and voice API' },
  { id: 'msg91', name: 'MSG91', category: 'communication', logo: '📨', description: 'Indian SMS gateway' },
  { id: 'gupshup', name: 'Gupshup', category: 'communication', logo: '💭', description: 'Conversational messaging' },
  // Analytics
  { id: 'google_analytics', name: 'Google Analytics', category: 'analytics', logo: '📊', description: 'Website analytics' },
  { id: 'mixpanel', name: 'Mixpanel', category: 'analytics', logo: '📈', description: 'Product analytics' },
  { id: 'clevertap', name: 'CleverTap', category: 'analytics', logo: '🎯', description: 'Customer engagement' },
];

const STORAGE_KEY = 'gyc_api_connections';

const getStoredConnections = (): APIConnection[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveConnections = (connections: APIConnection[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
};

export const APIIntegrationPortal = () => {
  const [connections, setConnections] = useState<APIConnection[]>(getStoredConnections);
  const [activeTab, setActiveTab] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<typeof AVAILABLE_INTEGRATIONS[0] | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    apiKey: '',
    secretKey: '',
    webhookUrl: '',
    isActive: true,
  });

  const handleAddConnection = () => {
    if (!selectedProvider || !formData.apiKey) {
      toast.error('Please fill in required fields');
      return;
    }

    const newConnection: APIConnection = {
      id: Date.now().toString(),
      name: selectedProvider.name,
      category: selectedProvider.category,
      provider: selectedProvider.id,
      apiKey: formData.apiKey,
      secretKey: formData.secretKey || undefined,
      webhookUrl: formData.webhookUrl || undefined,
      isActive: formData.isActive,
      status: 'connected',
      description: selectedProvider.description,
      lastTested: new Date().toISOString(),
    };

    const updated = [...connections, newConnection];
    setConnections(updated);
    saveConnections(updated);
    
    toast.success(`${selectedProvider.name} connected successfully`);
    setIsAddModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ apiKey: '', secretKey: '', webhookUrl: '', isActive: true });
    setSelectedProvider(null);
  };

  const handleDeleteConnection = (id: string) => {
    const updated = connections.filter(c => c.id !== id);
    setConnections(updated);
    saveConnections(updated);
    toast.success('Connection removed');
  };

  const handleToggleActive = (id: string) => {
    const updated = connections.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    );
    setConnections(updated);
    saveConnections(updated);
  };

  const handleTestConnection = async (connection: APIConnection) => {
    setTestingId(connection.id);
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updated = connections.map(c => 
      c.id === connection.id 
        ? { ...c, lastTested: new Date().toISOString(), status: 'connected' as const }
        : c
    );
    setConnections(updated);
    saveConnections(updated);
    
    setTestingId(null);
    toast.success(`${connection.name} connection verified`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const filteredConnections = activeTab === 'all' 
    ? connections 
    : connections.filter(c => c.category === activeTab);

  const filteredIntegrations = activeTab === 'all'
    ? AVAILABLE_INTEGRATIONS
    : AVAILABLE_INTEGRATIONS.filter(i => i.category === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            API Integration Portal
          </h2>
          <p className="text-muted-foreground">
            Connect and manage third-party services, APIs, and integrations
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{connections.length}</div>
            <p className="text-xs text-muted-foreground">Total Connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {connections.filter(c => c.status === 'connected' && c.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {connections.filter(c => !c.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {connections.filter(c => c.status === 'error').length}
            </div>
            <p className="text-xs text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="gap-2">
            <Globe className="h-4 w-4" />
            All
          </TabsTrigger>
          {API_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {/* Connected APIs */}
          {filteredConnections.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Connected APIs ({filteredConnections.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredConnections.map((connection) => (
                  <Card key={connection.id} className={!connection.isActive ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                            {AVAILABLE_INTEGRATIONS.find(i => i.id === connection.provider)?.logo || '🔗'}
                          </div>
                          <div>
                            <CardTitle className="text-base">{connection.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {API_CATEGORIES.find(c => c.id === connection.category)?.label}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge 
                          variant={connection.status === 'connected' ? 'default' : 'destructive'}
                          className={connection.status === 'connected' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {connection.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">API Key</span>
                          <div className="flex items-center gap-1">
                            <code className="bg-muted px-2 py-0.5 rounded text-xs">
                              {showSecrets[connection.id] 
                                ? connection.apiKey 
                                : '•'.repeat(Math.min(connection.apiKey.length, 20))}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => setShowSecrets(prev => ({ ...prev, [connection.id]: !prev[connection.id] }))}
                            >
                              {showSecrets[connection.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(connection.apiKey)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {connection.lastTested && (
                          <p className="text-xs text-muted-foreground">
                            Last tested: {new Date(connection.lastTested).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={connection.isActive}
                            onCheckedChange={() => handleToggleActive(connection.id)}
                          />
                          <span className="text-xs text-muted-foreground">Active</span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleTestConnection(connection)}
                            disabled={testingId === connection.id}
                          >
                            {testingId === connection.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteConnection(connection.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Available Integrations */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Available Integrations
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {filteredIntegrations
                .filter(i => !connections.some(c => c.provider === i.id))
                .map((integration) => (
                  <Card 
                    key={integration.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      setSelectedProvider(integration);
                      setIsAddModalOpen(true);
                    }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                          {integration.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{integration.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {integration.description}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Integration Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProvider ? (
                <>
                  <span className="text-2xl">{selectedProvider.logo}</span>
                  Connect {selectedProvider.name}
                </>
              ) : (
                'Add New Integration'
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider 
                ? selectedProvider.description
                : 'Select an integration to connect'}
            </DialogDescription>
          </DialogHeader>

          {!selectedProvider ? (
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {AVAILABLE_INTEGRATIONS.map((integration) => (
                <Button
                  key={integration.id}
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  onClick={() => setSelectedProvider(integration)}
                  disabled={connections.some(c => c.provider === integration.id)}
                >
                  <span className="text-xl">{integration.logo}</span>
                  <div className="text-left">
                    <p className="font-medium">{integration.name}</p>
                    <p className="text-xs text-muted-foreground">{integration.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key (Optional)</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="Enter secret key if required"
                  value={formData.secretKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://your-webhook-url.com"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label>Enable immediately after connection</Label>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">📘 How to get your API key:</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>Log in to your {selectedProvider.name} account</li>
                  <li>Navigate to Settings → API or Developer section</li>
                  <li>Generate a new API key and copy it here</li>
                </ol>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedProvider && (
              <Button variant="outline" onClick={() => setSelectedProvider(null)}>
                Back
              </Button>
            )}
            <Button onClick={handleAddConnection} disabled={!selectedProvider || !formData.apiKey}>
              <Key className="h-4 w-4 mr-2" />
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
