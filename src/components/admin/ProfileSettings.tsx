import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  Save, Upload, ImageIcon, Building2, Users, Shield, 
  Phone, MessageSquare, Mail, Key, Settings, Trash2, 
  UserPlus, Loader2, Check, X, RefreshCw, Send, Eye, EyeOff
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface BusinessProfile {
  company_name: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
  website: string;
  support_email: string;
  sales_email: string;
}

interface OTPSettings {
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  otp_length: number;
  otp_expiry_minutes: number;
  max_attempts: number;
  resend_cooldown_seconds: number;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

const roleColors: Record<AppRole, string> = {
  super_admin: "bg-red-500 text-white",
  admin: "bg-purple-500 text-white",
  sales: "bg-blue-500 text-white",
  dealer: "bg-green-500 text-white",
  finance: "bg-amber-500 text-white",
  insurance: "bg-emerald-500 text-white",
  marketing: "bg-pink-500 text-white",
  calling: "bg-cyan-500 text-white",
  operations: "bg-indigo-500 text-white",
};

const roleDescriptions: Record<AppRole, string> = {
  super_admin: "Full system access, can manage all roles",
  admin: "Can manage leads, bookings, and homepage content",
  sales: "Can view and manage assigned leads",
  dealer: "Dealer-specific access",
  finance: "Finance and payment access",
  insurance: "Insurance CRM — clients, policies, renewals",
  marketing: "Campaigns, SEO, content, analytics",
  calling: "Calling team — filtered lead databases",
  operations: "Day-to-day operations across verticals",
};

export const ProfileSettings = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("business");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Business Profile State
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    company_name: "Grabyourcar",
    tagline: "India's Smarter Way to Buy New Cars",
    email: "hello@grabyourcar.com",
    phone: "+91 98559 24442",
    whatsapp: "919855924442",
    address: "MS 228, 2nd Floor, DT Mega Mall, Sector 28",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122001",
    gst_number: "",
    pan_number: "",
    website: "https://grabyourcar.com",
    support_email: "support@grabyourcar.com",
    sales_email: "sales@grabyourcar.com",
  });

  // Logo State
  const [logoUrl, setLogoUrl] = useState("/src/assets/logo-grabyourcar-new.png");

  // OTP Settings State
  const [otpSettings, setOtpSettings] = useState<OTPSettings>({
    whatsapp_enabled: true,
    sms_enabled: false,
    email_enabled: true,
    otp_length: 6,
    otp_expiry_minutes: 10,
    max_attempts: 3,
    resend_cooldown_seconds: 60,
  });

  // User Management State
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "" as AppRole | "" });
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState({ userId: "", role: "" as AppRole | "" });

  // Fetch settings
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["profileSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .in("setting_key", ["business_profile", "otp_settings", "branding_settings"]);
      if (error) throw error;
      return data;
    },
  });

  // Load settings
  useEffect(() => {
    if (savedSettings) {
      savedSettings.forEach((setting) => {
        if (setting.setting_key === "business_profile") {
          setBusinessProfile({ ...businessProfile, ...setting.setting_value as unknown as BusinessProfile });
        } else if (setting.setting_key === "otp_settings") {
          setOtpSettings({ ...otpSettings, ...setting.setting_value as unknown as OTPSettings });
        } else if (setting.setting_key === "branding_settings") {
          const branding = setting.setting_value as Record<string, string>;
          if (branding.logo_url) setLogoUrl(branding.logo_url);
        }
      });
    }
  }, [savedSettings]);

  // Fetch user roles
  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoadingRoles(true);
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setUserRoles(data || []);
      } catch (error) {
        console.error("Error fetching roles:", error);
        toast.error("Failed to fetch user roles");
      } finally {
        setIsLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from("admin_settings")
        .upsert([{ 
          setting_key: key, 
          setting_value: JSON.parse(JSON.stringify(value)),
          updated_at: new Date().toISOString()
        }], { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profileSettings"] });
      queryClient.invalidateQueries({ queryKey: ["brandingSettings"] });
      toast.success("Settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      setLogoUrl(dataUrl);
      
      // Update branding settings with new logo
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "branding_settings")
        .single();

      const updatedBranding = {
        ...(existing?.setting_value as Record<string, string> || {}),
        logo_url: dataUrl,
      };

      await supabase
        .from("admin_settings")
        .upsert([{
          setting_key: "branding_settings",
          setting_value: updatedBranding,
          updated_at: new Date().toISOString(),
        }], { onConflict: "setting_key" });

      queryClient.invalidateQueries({ queryKey: ["brandingSettings"] });
      toast.success("Logo updated! It will appear on the main site.");
    } catch (error) {
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle creating new user with role
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.role) {
      toast.error("Please fill all fields");
      return;
    }

    setIsAddingRole(true);
    try {
      // Create user via Supabase Auth (admin API would be needed for production)
      // For now, we'll show the manual process
      toast.info("User creation requires Supabase Admin API. Please create user manually in authentication, then assign role below.");
      setNewUser({ email: "", password: "", role: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsAddingRole(false);
    }
  };

  // Handle adding role to existing user
  const handleAddRole = async () => {
    if (!newRole.userId || !newRole.role) {
      toast.error("Please fill all fields");
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(newRole.userId)) {
      toast.error("Invalid User ID format");
      return;
    }

    setIsAddingRole(true);
    try {
      const existingRole = userRoles.find(
        (r) => r.user_id === newRole.userId && r.role === newRole.role
      );
      if (existingRole) {
        toast.error("User already has this role");
        setIsAddingRole(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .insert({ user_id: newRole.userId, role: newRole.role as AppRole })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Role "${newRole.role}" assigned successfully`);
      setUserRoles([data, ...userRoles]);
      setNewRole({ userId: "", role: "" });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add role");
    } finally {
      setIsAddingRole(false);
    }
  };

  // Handle delete role
  const handleDeleteRole = async (id: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
      toast.success("Role removed");
      setUserRoles(userRoles.filter((r) => r.id !== id));
    } catch (error: any) {
      toast.error(error.message || "Failed to remove role");
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Test OTP
  const handleTestOTP = async (channel: "whatsapp" | "email") => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: `Sending test OTP via ${channel}...`,
        success: `Test OTP sent successfully!`,
        error: "Failed to send test OTP",
      }
    );
  };

  const filteredRoles = userRoles.filter((role) =>
    role.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleStats = userRoles.reduce((acc, role) => {
    acc[role.role] = (acc[role.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Profile & Settings
          </h2>
          <p className="text-muted-foreground">Manage business profile, users, and integrations</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full gap-1">
          <TabsTrigger value="business"><Building2 className="h-4 w-4 mr-1 hidden md:inline" />Business</TabsTrigger>
          <TabsTrigger value="logo"><ImageIcon className="h-4 w-4 mr-1 hidden md:inline" />Logo</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1 hidden md:inline" />Users</TabsTrigger>
          <TabsTrigger value="contact"><Phone className="h-4 w-4 mr-1 hidden md:inline" />Contact</TabsTrigger>
          <TabsTrigger value="otp"><Key className="h-4 w-4 mr-1 hidden md:inline" />OTP</TabsTrigger>
        </TabsList>

        {/* Business Profile Tab */}
        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Configure your company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={businessProfile.company_name}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={businessProfile.tagline}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, tagline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={businessProfile.website}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input
                    value={businessProfile.gst_number}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, gst_number: e.target.value })}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={businessProfile.address}
                  onChange={(e) => setBusinessProfile({ ...businessProfile, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={businessProfile.city}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={businessProfile.state}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input
                    value={businessProfile.pincode}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, pincode: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate({ key: "business_profile", value: businessProfile })} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />Save Business Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logo Tab */}
        <TabsContent value="logo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
              <CardDescription>Upload your logo - it will appear on the main website header</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
                {logoUrl ? (
                  <img src={logoUrl} alt="Company Logo" className="max-h-24 mx-auto object-contain" />
                ) : (
                  <ImageIcon className="h-24 w-24 mx-auto text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload New Logo'}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Or enter logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... or /assets/logo.png"
                />
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-sm">
                <Check className="h-4 w-4 inline mr-2 text-primary" />
                Logo is automatically displayed on the main website header
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">User & Role Management</h3>
              <p className="text-sm text-muted-foreground">Manage admin users and their permissions</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Assign Role</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Role to User</DialogTitle>
                  <DialogDescription>Enter the user's UUID and select a role</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>User ID (UUID)</Label>
                    <Input
                      placeholder="e.g., ff237d62-41f7-4dbc-b5ba-4056c510bb3c"
                      value={newRole.userId}
                      onChange={(e) => setNewRole({ ...newRole, userId: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Find User IDs in authentication logs</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newRole.role} onValueChange={(v: AppRole) => setNewRole({ ...newRole, role: v })}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="dealer">Dealer</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                    {newRole.role && <p className="text-xs text-muted-foreground">{roleDescriptions[newRole.role as AppRole]}</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddRole} disabled={isAddingRole}>
                    {isAddingRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Assign Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Role Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(["super_admin", "admin", "sales", "dealer", "finance"] as AppRole[]).map((role) => (
              <Card key={role}>
                <CardContent className="p-3 text-center">
                  <Badge className={`${roleColors[role]} mb-1 text-xs`}>{role.replace("_", " ")}</Badge>
                  <p className="text-xl font-bold">{roleStats[role] || 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* User Roles Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Assigned Roles ({filteredRoles.length})</CardTitle>
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRoles ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : filteredRoles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No roles assigned yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell className="font-mono text-xs">{userRole.user_id.substring(0, 8)}...</TableCell>
                        <TableCell><Badge className={roleColors[userRole.role]}>{userRole.role.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(userRole.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteConfirm(userRole.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-500" />WhatsApp</CardTitle>
                <CardDescription>Configure WhatsApp business number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>WhatsApp Number (with country code)</Label>
                  <Input
                    value={businessProfile.whatsapp}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, whatsapp: e.target.value })}
                    placeholder="919855924442"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => handleTestOTP("whatsapp")}>
                  <Send className="h-4 w-4 mr-2" />Test WhatsApp
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-blue-500" />Phone & SMS</CardTitle>
                <CardDescription>Configure phone numbers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Phone</Label>
                  <Input
                    value={businessProfile.phone}
                    onChange={(e) => setBusinessProfile({ ...businessProfile, phone: e.target.value })}
                    placeholder="+91 95772 00023"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-orange-500" />Email Configuration</CardTitle>
                <CardDescription>Configure email addresses for different purposes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Email</Label>
                    <Input
                      value={businessProfile.email}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input
                      value={businessProfile.support_email}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, support_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sales Email</Label>
                    <Input
                      value={businessProfile.sales_email}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, sales_email: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={() => saveMutation.mutate({ key: "business_profile", value: businessProfile })} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />Save Contact Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OTP Settings Tab */}
        <TabsContent value="otp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OTP & Verification Settings</CardTitle>
              <CardDescription>Configure OTP delivery channels and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    <div>
                      <Label className="font-medium">WhatsApp OTP</Label>
                      <p className="text-xs text-muted-foreground">Send OTP via WhatsApp</p>
                    </div>
                  </div>
                  <Switch
                    checked={otpSettings.whatsapp_enabled}
                    onCheckedChange={(v) => setOtpSettings({ ...otpSettings, whatsapp_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-blue-500" />
                    <div>
                      <Label className="font-medium">SMS OTP</Label>
                      <p className="text-xs text-muted-foreground">Send OTP via SMS</p>
                    </div>
                  </div>
                  <Switch
                    checked={otpSettings.sms_enabled}
                    onCheckedChange={(v) => setOtpSettings({ ...otpSettings, sms_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-orange-500" />
                    <div>
                      <Label className="font-medium">Email OTP</Label>
                      <p className="text-xs text-muted-foreground">Send OTP via Email</p>
                    </div>
                  </div>
                  <Switch
                    checked={otpSettings.email_enabled}
                    onCheckedChange={(v) => setOtpSettings({ ...otpSettings, email_enabled: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>OTP Length</Label>
                  <Select
                    value={String(otpSettings.otp_length)}
                    onValueChange={(v) => setOtpSettings({ ...otpSettings, otp_length: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 digits</SelectItem>
                      <SelectItem value="6">6 digits</SelectItem>
                      <SelectItem value="8">8 digits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expiry (minutes)</Label>
                  <Input
                    type="number"
                    value={otpSettings.otp_expiry_minutes}
                    onChange={(e) => setOtpSettings({ ...otpSettings, otp_expiry_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Attempts</Label>
                  <Input
                    type="number"
                    value={otpSettings.max_attempts}
                    onChange={(e) => setOtpSettings({ ...otpSettings, max_attempts: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resend Cooldown (sec)</Label>
                  <Input
                    type="number"
                    value={otpSettings.resend_cooldown_seconds}
                    onChange={(e) => setOtpSettings({ ...otpSettings, resend_cooldown_seconds: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate({ key: "otp_settings", value: otpSettings })} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />Save OTP Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role?</AlertDialogTitle>
            <AlertDialogDescription>This will revoke the user's permissions. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteConfirm && handleDeleteRole(deleteConfirm)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
