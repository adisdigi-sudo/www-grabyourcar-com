import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Users, UserPlus, Trash2, Loader2, Search, Shield, KeyRound,
  Ban, CheckCircle2, Copy, Eye, EyeOff, RefreshCw, Lock
} from "lucide-react";

interface ManagedUser {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  role_tier: string | null;
  reporting_to: string | null;
  is_active: boolean;
  created_at: string;
  roles: { role: string }[];
  verticalAccess: { vertical_id: string; access_level?: string; business_verticals: { name: string; slug: string; color: string; icon: string } }[];
}

interface BusinessVertical {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

const roleOptions = [
  { value: "sales", label: "Sales Team" },
  { value: "insurance", label: "Insurance Team" },
  { value: "finance", label: "Finance Team" },
  { value: "calling", label: "Calling Team" },
  { value: "operations", label: "Operations" },
  { value: "marketing", label: "Marketing" },
  { value: "dealer", label: "Dealer" },
  { value: "admin", label: "Admin" },
  { value: "team_leader", label: "Team Leader" },
  { value: "manager", label: "Manager" },
];

const roleColors: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-600 border-red-200",
  admin: "bg-purple-500/10 text-purple-600 border-purple-200",
  sales: "bg-blue-500/10 text-blue-600 border-blue-200",
  insurance: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  finance: "bg-amber-500/10 text-amber-600 border-amber-200",
  calling: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  operations: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  marketing: "bg-pink-500/10 text-pink-600 border-pink-200",
  dealer: "bg-green-500/10 text-green-600 border-green-200",
  team_leader: "bg-orange-500/10 text-orange-600 border-orange-200",
  manager: "bg-teal-500/10 text-teal-600 border-teal-200",
};

const roleTierOptions = [
  { value: "caller", label: "Caller / Executive" },
  { value: "team_leader", label: "Team Leader" },
  { value: "manager", label: "Manager" },
];

export const SuperAdminUserManager = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState<{ username: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    phone: "",
    role: "sales",
    designation: "",
    department: "",
    password: "",
    verticalIds: [] as string[],
    roleTier: "caller",
    reportingTo: "",
  });

  // Fetch all users
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["managed-users"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list_users" },
      });
      if (res.error) throw res.error;
      if (!res.data.success) throw new Error(res.data.error);
      return res.data as { users: ManagedUser[]; verticals: BusinessVertical[] };
    },
  });

  const users = data?.users || [];
  const verticals = data?.verticals || [];

  // Create user
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("admin-manage-users", {
        body: {
          action: "create_user",
          username: form.username,
          displayName: form.displayName,
          phone: form.phone || null,
          role: form.role,
          verticalIds: form.verticalIds,
          designation: form.designation || null,
          department: form.department || null,
          password: form.password || undefined,
          roleTier: form.roleTier,
          reportingTo: form.reportingTo || null,
        },
      });
      if (res.error) throw res.error;
      if (!res.data.success) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      setIsCreateOpen(false);
      setShowCredentials(data.credentials);
      setForm({ username: "", displayName: "", phone: "", role: "sales", designation: "", department: "", password: "", verticalIds: [], roleTier: "caller", reportingTo: "" });
      toast.success("User created successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Toggle ban
  const toggleBanMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update_user", userId, isActive },
      });
      if (res.error) throw res.error;
      if (!res.data.success) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      toast.success("User status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete user
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "delete_user", userId },
      });
      if (res.error) throw res.error;
      if (!res.data.success) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      setDeleteUserId(null);
      toast.success("User deleted permanently");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Reset password
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const res = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "reset_password", userId, newPassword },
      });
      if (res.error) throw res.error;
      if (!res.data.success) throw new Error(res.data.error);
    },
    onSuccess: () => {
      setResetPasswordUser(null);
      setNewPassword("");
      toast.success("Password reset successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update user (verticals/role)
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update_user", ...payload },
      });
      if (res.error) throw res.error;
      if (!res.data.success) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      setEditUser(null);
      toast.success("User updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phone || "").includes(searchQuery)
  );

  const toggleVertical = (verticalId: string) => {
    setForm(prev => ({
      ...prev,
      verticalIds: prev.verticalIds.includes(verticalId)
        ? prev.verticalIds.filter(id => id !== verticalId)
        : [...prev.verticalIds, verticalId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Super Admin — User Management
          </h2>
          <p className="text-muted-foreground">Create credentials, assign verticals & roles, ban or delete users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Create User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{users.filter(u => u.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{users.filter(u => !u.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Banned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{verticals.length}</p>
            <p className="text-xs text-muted-foreground">Verticals</p>
          </CardContent>
        </Card>
      </div>

      {/* Vertical Passwords */}
      <VerticalPasswordManager verticals={verticals} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> All Users ({filteredUsers.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found. Create your first team member.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Verticals</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id} className={!user.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.display_name}</p>
                          <p className="text-xs text-muted-foreground">{user.username}@grabyourcar</p>
                          {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.roles.map(r => (
                          <Badge key={r.role} className={`${roleColors[r.role] || ""} text-xs`}>
                            {r.role.replace("_", " ")}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {user.verticalAccess.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None assigned</span>
                          ) : (
                            user.verticalAccess.map(va => (
                              <Badge key={va.vertical_id} variant="outline" className="text-[10px]"
                                style={{ borderColor: va.business_verticals?.color || undefined }}>
                                {va.business_verticals?.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">
                            <Ban className="h-3 w-3 mr-1" /> Banned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditUser(user)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Reset Password" onClick={() => { setResetPasswordUser(user); setNewPassword(""); }}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            title={user.is_active ? "Ban User" : "Unban User"}
                            onClick={() => toggleBanMutation.mutate({ userId: user.user_id, isActive: !user.is_active })}
                          >
                            {user.is_active ? <Ban className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteUserId(user.user_id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Create login credentials and assign to specific verticals</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <div className="flex items-center gap-1">
                  <Input placeholder="john.doe" value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })} />
                </div>
                <p className="text-[10px] text-muted-foreground">Login: {form.username || "___"}@grabyourcar</p>
              </div>
              <div className="space-y-1.5">
                <Label>Display Name *</Label>
                <Input placeholder="John Doe" value={form.displayName}
                  onChange={e => setForm({ ...form, displayName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+91 9876543210" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input placeholder="Senior Executive" value={form.designation}
                  onChange={e => setForm({ ...form, designation: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input placeholder="Insurance" value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>

            {/* Hierarchy */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role Tier *</Label>
                <Select value={form.roleTier} onValueChange={v => setForm({ ...form, roleTier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleTierOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reports To</Label>
                <Select value={form.reportingTo} onValueChange={v => setForm({ ...form, reportingTo: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supervisor</SelectItem>
                    {users.filter(u => u.role_tier === "team_leader" || u.role_tier === "manager").map(u => (
                      <SelectItem key={u.user_id} value={u.id}>{u.display_name} ({u.role_tier})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Password (optional — auto-generated if empty)</Label>
              <Input type="password" placeholder="Leave empty for auto-generated" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            
            {/* Vertical Assignment */}
            <div className="space-y-2">
              <Label className="font-semibold">Assign to Verticals *</Label>
              <p className="text-xs text-muted-foreground">User can only access selected verticals after login</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {verticals.map(v => (
                  <label key={v.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={form.verticalIds.includes(v.id)}
                      onCheckedChange={() => toggleVertical(v.id)}
                    />
                    <span className="text-sm">{v.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.username || !form.displayName || form.verticalIds.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={!!showCredentials} onOpenChange={() => setShowCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600">✅ User Created Successfully</DialogTitle>
            <DialogDescription>Share these credentials with the team member securely</DialogDescription>
          </DialogHeader>
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Login Username</p>
                  <p className="font-mono font-bold">{showCredentials?.username}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  navigator.clipboard.writeText(showCredentials?.username || "");
                  toast.success("Username copied!");
                }}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="font-mono font-bold">{showPassword ? showCredentials?.password : "••••••••••"}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => {
                    navigator.clipboard.writeText(showCredentials?.password || "");
                    toast.success("Password copied!");
                  }}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button onClick={() => { setShowCredentials(null); setShowPassword(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editUser}
        verticals={verticals}
        onClose={() => setEditUser(null)}
        onSave={(payload) => updateMutation.mutate(payload)}
        isPending={updateMutation.isPending}
      />

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={() => setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {resetPasswordUser?.display_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)}>Cancel</Button>
            <Button disabled={!newPassword || resetPasswordMutation.isPending}
              onClick={() => resetPasswordUser && resetPasswordMutation.mutate({ userId: resetPasswordUser.user_id, newPassword })}>
              {resetPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account, remove all roles and vertical access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Edit User Sub-dialog
function EditUserDialog({ user, verticals, onClose, onSave, isPending }: {
  user: ManagedUser | null;
  verticals: BusinessVertical[];
  onClose: () => void;
  onSave: (payload: any) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState("");
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  // Sync state when user changes
  useState(() => {
    if (user) {
      setRole(user.roles[0]?.role || "sales");
      setSelectedVerticals(user.verticalAccess.map(va => va.vertical_id));
      setDisplayName(user.display_name);
      setPhone(user.phone || "");
    }
  });

  if (!user) return null;

  // Re-init on open
  if (role === "" && user.roles.length > 0) {
    setRole(user.roles[0]?.role || "sales");
    setSelectedVerticals(user.verticalAccess.map(va => va.vertical_id));
    setDisplayName(user.display_name);
    setPhone(user.phone || "");
  }

  const toggleV = (id: string) => {
    setSelectedVerticals(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User — {user.display_name}</DialogTitle>
          <DialogDescription>Update role, vertical access, and details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Vertical Access</Label>
            <div className="grid grid-cols-2 gap-2">
              {verticals.map(v => (
                <label key={v.id} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={selectedVerticals.includes(v.id)} onCheckedChange={() => toggleV(v.id)} />
                  <span className="text-sm">{v.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={isPending} onClick={() => onSave({
            userId: user.user_id,
            role,
            verticalIds: selectedVerticals,
            displayName,
            phone: phone || null,
          })}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Vertical Password Manager ──
function VerticalPasswordManager({ verticals }: { verticals: BusinessVertical[] }) {
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch current passwords via admin-only edge function
  // (vertical_password column is server-side only; not readable by client SDK).
  const { data: verticalData = [], isLoading } = useQuery({
    queryKey: ["vertical-passwords-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-vertical-password", {
        body: { action: "list" },
      });
      if (error) throw error;
      return (data?.verticals || []) as any[];
    },
  });

  useEffect(() => {
    const map: Record<string, string> = {};
    verticalData.forEach((v: any) => {
      map[v.id] = v.vertical_password || "";
    });
    setPasswords(map);
  }, [verticalData]);

  const handleSave = async (verticalId: string) => {
    setSaving(verticalId);
    const pw = passwords[verticalId]?.trim() || null;
    const { error } = await supabase.functions.invoke("admin-vertical-password", {
      body: { action: "set", vertical_id: verticalId, password: pw },
    });

    if (error) {
      toast.error("Failed to update password");
    } else {
      toast.success(pw ? "Password set" : "Password removed");
      queryClient.invalidateQueries({ queryKey: ["vertical-passwords-admin"] });
    }
    setSaving(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-5 w-5" /> Vertical Passwords
        </CardTitle>
        <CardDescription>Set a password for each workspace. Leave empty for no password.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="grid gap-3">
            {verticalData.map((v: any) => (
              <div key={v.id} className="flex items-center gap-3">
                <span className="text-sm font-medium w-32 truncate">{v.name}</span>
                <div className="relative flex-1 max-w-xs">
                  <Input
                    type={showPasswords[v.id] ? "text" : "password"}
                    placeholder="No password"
                    value={passwords[v.id] || ""}
                    onChange={(e) => setPasswords(p => ({ ...p, [v.id]: e.target.value }))}
                    className="pr-8 h-8 text-sm"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPasswords(p => ({ ...p, [v.id]: !p[v.id] }))}
                  >
                    {showPasswords[v.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={saving === v.id}
                  onClick={() => handleSave(v.id)}
                >
                  {saving === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
