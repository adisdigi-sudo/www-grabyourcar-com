import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Users, UserPlus, Search, Shield, ShieldCheck, Edit2, Trash2,
  Key, Building2, Phone, Mail, Loader2, CheckCircle2, XCircle,
  ChevronDown, Copy
} from "lucide-react";

type AppRole = "super_admin" | "admin" | "sales" | "dealer" | "finance" | "insurance" | "marketing" | "calling" | "operations";

const ROLE_OPTIONS: { value: AppRole; label: string; color: string }[] = [
  { value: "admin", label: "Admin", color: "bg-red-500/10 text-red-600" },
  { value: "sales", label: "Sales", color: "bg-blue-500/10 text-blue-600" },
  { value: "insurance", label: "Insurance", color: "bg-green-500/10 text-green-600" },
  { value: "finance", label: "Finance", color: "bg-amber-500/10 text-amber-600" },
  { value: "dealer", label: "Dealer", color: "bg-purple-500/10 text-purple-600" },
  { value: "marketing", label: "Marketing", color: "bg-pink-500/10 text-pink-600" },
  { value: "calling", label: "Calling", color: "bg-cyan-500/10 text-cyan-600" },
  { value: "operations", label: "Operations", color: "bg-orange-500/10 text-orange-600" },
];

interface TeamUser {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  roles: Array<{ role: string }>;
  verticalAccess: Array<{ vertical_id: string; access_level: string; business_verticals: { name: string; slug: string; color: string | null; icon: string | null } }>;
}

interface Vertical {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

export function UserManagementDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<TeamUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string } | null>(null);

  // Form state
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    phone: "",
    designation: "",
    department: "",
    role: "sales" as AppRole,
    verticalIds: [] as string[],
    accessLevels: {} as Record<string, string>,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to load users");
      return { users: data.users as TeamUser[], verticals: data.verticals as Vertical[] };
    },
  });

  const users = data?.users || [];
  const verticals = data?.verticals || [];

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.display_name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search);
    const matchRole = roleFilter === "all" || u.roles.some(r => r.role === roleFilter);
    return matchSearch && matchRole;
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: {
          action: "create_user",
          username: form.username,
          displayName: form.displayName,
          phone: form.phone || null,
          role: form.role,
          verticalIds: form.verticalIds,
          designation: form.designation || null,
          department: form.department || null,
          accessLevels: form.accessLevels,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create");
      return data;
    },
    onSuccess: (data) => {
      toast.success("Employee created successfully!");
      setCreatedCreds(data.credentials);
      setShowCreateDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update_user", ...payload },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to update");
      return data;
    },
    onSuccess: () => {
      toast.success("User updated");
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "delete_user", userId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to delete");
    },
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetPwdMutation = useMutation({
    mutationFn: async () => {
      if (!resetPasswordUser) return;
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "reset_password", userId: resetPasswordUser.user_id, newPassword },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to reset");
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetPasswordUser(null);
      setNewPassword("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  function resetForm() {
    setForm({ username: "", displayName: "", phone: "", designation: "", department: "", role: "sales", verticalIds: [], accessLevels: {} });
  }

  const activeCount = users.filter(u => u.is_active).length;
  const verticalCounts = verticals.map(v => ({
    ...v,
    count: users.filter(u => u.verticalAccess?.some(a => a.vertical_id === v.id)).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Team Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} active employees across {verticals.length} verticals
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Employee
        </Button>
      </div>

      {/* Vertical Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {verticalCounts.map(v => (
          <Card key={v.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{v.count}</p>
              <p className="text-xs text-muted-foreground truncate">{v.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, username, phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLE_OPTIONS.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No employees found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map(user => (
            <Card key={user.id} className={`transition-all ${!user.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${user.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{user.display_name}</span>
                      <span className="text-xs text-muted-foreground font-mono">@{user.username}</span>
                      {!user.is_active && <Badge variant="outline" className="text-destructive border-destructive/20 text-[10px]">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</span>}
                      {user.designation && <span>{user.designation}</span>}
                      {user.department && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{user.department}</span>}
                    </div>
                    {/* Roles & Verticals */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {user.roles.map((r, i) => {
                        const opt = ROLE_OPTIONS.find(o => o.value === r.role);
                        return <Badge key={i} variant="outline" className={`text-[10px] ${opt?.color || ""}`}>{opt?.label || r.role}</Badge>;
                      })}
                      {user.verticalAccess?.map((va, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                          {va.business_verticals?.name || "—"}
                          {va.access_level === "manager" && <Shield className="h-2.5 w-2.5" />}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                      setEditingUser(user);
                      setForm({
                        username: user.username,
                        displayName: user.display_name,
                        phone: user.phone || "",
                        designation: user.designation || "",
                        department: user.department || "",
                        role: (user.roles[0]?.role as AppRole) || "sales",
                        verticalIds: user.verticalAccess?.map(va => va.vertical_id) || [],
                        accessLevels: Object.fromEntries(user.verticalAccess?.map(va => [va.vertical_id, va.access_level || "member"]) || []),
                      });
                    }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setResetPasswordUser(user)}>
                      <Key className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                      if (confirm(`Delete ${user.display_name}? This cannot be undone.`)) {
                        deleteMutation.mutate(user.user_id);
                      }
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Employee Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={v => { setShowCreateDialog(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Create Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Username *</Label>
                <Input placeholder="rahul.sharma" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") }))} />
                <p className="text-[10px] text-muted-foreground mt-1">Login: {form.username || "..."}@grabyourcar</p>
              </div>
              <div>
                <Label>Display Name *</Label>
                <Input placeholder="Rahul Sharma" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input placeholder="9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as AppRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Designation</Label>
                <Input placeholder="Sales Executive" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
              </div>
              <div>
                <Label>Department</Label>
                <Input placeholder="Sales" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>

            {/* Vertical Access */}
            <div>
              <Label className="mb-2 block">Vertical Access</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {verticals.map(v => (
                  <div key={v.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={form.verticalIds.includes(v.id)}
                        onCheckedChange={checked => {
                          setForm(f => ({
                            ...f,
                            verticalIds: checked ? [...f.verticalIds, v.id] : f.verticalIds.filter(id => id !== v.id),
                          }));
                        }}
                      />
                      <span className="text-sm">{v.name}</span>
                    </div>
                    {form.verticalIds.includes(v.id) && (
                      <Select value={form.accessLevels[v.id] || "member"} onValueChange={val => setForm(f => ({ ...f, accessLevels: { ...f.accessLevels, [v.id]: val } }))}>
                        <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.username || !form.displayName || createMutation.isPending} className="gap-2">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={v => { if (!v) setEditingUser(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit2 className="h-5 w-5" /> Edit Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Display Name</Label>
                <Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as AppRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Switch checked={editingUser?.is_active ?? true} onCheckedChange={checked => setEditingUser(prev => prev ? { ...prev, is_active: checked } : null)} />
                  <span className="text-sm">{editingUser?.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Designation</Label>
                <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Vertical Access</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {verticals.map(v => (
                  <div key={v.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={form.verticalIds.includes(v.id)}
                        onCheckedChange={checked => {
                          setForm(f => ({
                            ...f,
                            verticalIds: checked ? [...f.verticalIds, v.id] : f.verticalIds.filter(id => id !== v.id),
                          }));
                        }}
                      />
                      <span className="text-sm">{v.name}</span>
                    </div>
                    {form.verticalIds.includes(v.id) && (
                      <Select value={form.accessLevels[v.id] || "member"} onValueChange={val => setForm(f => ({ ...f, accessLevels: { ...f.accessLevels, [v.id]: val } }))}>
                        <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!editingUser) return;
              updateMutation.mutate({
                userId: editingUser.user_id,
                displayName: form.displayName,
                phone: form.phone || null,
                role: form.role,
                verticalIds: form.verticalIds,
                isActive: editingUser.is_active,
                designation: form.designation || null,
                department: form.department || null,
                accessLevels: form.accessLevels,
              });
            }} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={v => { if (!v) { setResetPasswordUser(null); setNewPassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Reset password for <strong>{resetPasswordUser?.display_name}</strong></p>
            <div>
              <Label>New Password</Label>
              <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)}>Cancel</Button>
            <Button onClick={() => resetPwdMutation.mutate()} disabled={!newPassword || resetPwdMutation.isPending} className="gap-2">
              {resetPwdMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created Credentials Dialog */}
      <Dialog open={!!createdCreds} onOpenChange={v => { if (!v) setCreatedCreds(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> Employee Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Share these credentials with the employee:</p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Login ID</p>
                  <p className="font-mono font-medium">{createdCreds?.username}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                  navigator.clipboard.writeText(createdCreds?.username || "");
                  toast.success("Copied!");
                }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="font-mono font-medium">{createdCreds?.password}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                  navigator.clipboard.writeText(createdCreds?.password || "");
                  toast.success("Copied!");
                }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">⚠️ Save these credentials now. The password won't be shown again.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedCreds(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
