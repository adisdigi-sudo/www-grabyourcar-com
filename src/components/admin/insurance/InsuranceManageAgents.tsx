import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Users, Search, Trash2, Edit, Shield, Key, UserPlus, Eye, EyeOff } from "lucide-react";

// ─── Types ───
interface SubAgent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  company_name: string | null;
  role: string | null;
  is_active: boolean;
  total_policies: number;
  created_at: string;
}

interface AgentRole {
  id: string;
  name: string;
  permissions: string[];
  created_at: string;
}

const ALL_PERMISSIONS = [
  "view_policies", "create_policies", "edit_policies", "delete_policies",
  "view_clients", "create_clients", "edit_clients",
  "view_commissions", "manage_commissions",
  "view_reports", "export_reports",
  "manage_renewals", "view_documents", "upload_documents",
  "view_analytics", "manage_sub_agents",
];

// ─── Main Component ───
export function InsuranceManageAgents() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" /> Manage Agents
        </h3>
        <p className="text-xs text-muted-foreground">
          Manage sub agents, roles and permissions for your insurance team
        </p>
      </div>

      <Tabs defaultValue="subagents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subagents" className="gap-1.5 text-xs">
            <UserPlus className="h-3.5 w-3.5" /> Sub Agents
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5" /> Role & Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subagents"><SubAgentsList /></TabsContent>
        <TabsContent value="roles"><RolesPermissions /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub Agents List ───
function SubAgentsList() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["ins-sub-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_advisors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        username: a.email?.split("@")[0] || null,
        company_name: null,
        role: a.specialization?.[0] || "Sub Agent",
        is_active: a.is_active ?? true,
        total_policies: a.total_policies_sold || 0,
        created_at: a.created_at,
      })) as SubAgent[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("insurance_advisors").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-sub-agents"] });
      toast.success("Status updated");
    },
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_advisors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-sub-agents"] });
      toast.success("Sub agent removed");
    },
  });

  const addAgent = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("insurance_advisors").insert({
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        specialization: form.role ? [form.role] : ["Sub Agent"],
        cities: form.company ? [form.company] : null,
        max_daily_leads: 20,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-sub-agents"] });
      toast.success("Sub agent added");
      setShowAdd(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = agents.filter((a) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !a.name?.toLowerCase().includes(s) &&
        !a.email?.toLowerCase().includes(s) &&
        !a.phone?.includes(s) &&
        !a.company_name?.toLowerCase().includes(s)
      )
        return false;
    }
    if (roleFilter !== "all" && a.role !== roleFilter) return false;
    if (statusFilter === "active" && !a.is_active) return false;
    if (statusFilter === "inactive" && a.is_active) return false;
    return true;
  });

  const roles = [...new Set(agents.map((a) => a.role).filter(Boolean))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
          <div>
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r!} value={r!}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 mt-4"><UserPlus className="h-4 w-4" /> Add Sub Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Sub Agent</DialogTitle></DialogHeader>
            <AddSubAgentForm onSubmit={(f) => addAgent.mutate(f)} loading={addAgent.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Total Policy</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No data available in table</TableCell></TableRow>
              ) : (
                filtered.map((a, idx) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-sm">{a.name}</TableCell>
                    <TableCell className="text-sm">{a.email || "—"}</TableCell>
                    <TableCell className="text-sm">{a.username || "—"}</TableCell>
                    <TableCell className="text-sm">{a.company_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{a.role}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{a.total_policies}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">
                        {a.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Switch
                          checked={a.is_active}
                          onCheckedChange={(v) => toggleActive.mutate({ id: a.id, active: v })}
                        />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteAgent.mutate(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="px-4 py-2 border-t text-xs text-muted-foreground flex justify-between items-center">
            <span>Showing {filtered.length} of {agents.length} entries</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled>Previous</Button>
              <Button variant="default" size="sm" className="h-7 w-7 text-xs p-0">1</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddSubAgentForm({ onSubmit, loading }: { onSubmit: (f: any) => void; loading: boolean }) {
  const [form, setForm] = useState<any>({});
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div><Label className="text-xs">Name *</Label><Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
        <div><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Company Name</Label><Input value={form.company || ""} onChange={(e) => set("company", e.target.value)} /></div>
        <div><Label className="text-xs">Role</Label><Input value={form.role || ""} onChange={(e) => set("role", e.target.value)} placeholder="Sub Agent" /></div>
      </div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.name} className="w-full">
        {loading ? "Adding..." : "Add Sub Agent"}
      </Button>
    </div>
  );
}

// ─── Roles & Permissions ───
function RolesPermissions() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingRole, setEditingRole] = useState<AgentRole | null>(null);
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["ins-agent-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "insurance_agent_roles");
      if (error) throw error;
      if (data && data.length > 0) {
        const val = data[0].setting_value as any;
        return (val?.roles || []) as AgentRole[];
      }
      return [{ id: "1", name: "Sub Agent", permissions: ["view_policies", "view_clients", "view_commissions"], created_at: new Date().toISOString() }] as AgentRole[];
    },
  });

  const saveRoles = async (newRoles: AgentRole[]) => {
    const { data: existing } = await supabase
      .from("admin_settings")
      .select("id")
      .eq("setting_key", "insurance_agent_roles")
      .maybeSingle();

    if (existing) {
      await supabase.from("admin_settings").update({ setting_value: { roles: newRoles } as any }).eq("id", existing.id);
    } else {
      await supabase.from("admin_settings").insert({ setting_key: "insurance_agent_roles", setting_value: { roles: newRoles } as any });
    }
    queryClient.invalidateQueries({ queryKey: ["ins-agent-roles"] });
  };

  const addRole = async (name: string) => {
    const newRole: AgentRole = {
      id: String(roles.length + 1),
      name,
      permissions: [],
      created_at: new Date().toISOString(),
    };
    await saveRoles([...roles, newRole]);
    toast.success("Role added");
    setShowAdd(false);
  };

  const deleteRole = async (id: string) => {
    await saveRoles(roles.filter((r) => r.id !== id));
    toast.success("Role deleted");
  };

  const updatePermissions = async (roleId: string, permissions: string[]) => {
    const updated = roles.map((r) => (r.id === roleId ? { ...r, permissions } : r));
    await saveRoles(updated);
    toast.success("Permissions updated");
    setEditingRole(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Role</DialogTitle></DialogHeader>
            <AddRoleForm onSubmit={addRole} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : roles.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No roles defined</TableCell></TableRow>
              ) : (
                roles.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-semibold text-sm">{r.name}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setEditingRole(r)}>
                          <Key className="h-3 w-3" /> Permissions
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRole(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">
            Showing {roles.length} of {roles.length} entries
          </div>
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Permissions — {editingRole?.name}</DialogTitle></DialogHeader>
          {editingRole && (
            <PermissionsEditor
              permissions={editingRole.permissions}
              onSave={(perms) => updatePermissions(editingRole.id, perms)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddRoleForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-3">
      <div><Label className="text-xs">Role Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Agent" /></div>
      <Button onClick={() => onSubmit(name)} disabled={!name} className="w-full">Add Role</Button>
    </div>
  );
}

function PermissionsEditor({ permissions, onSave }: { permissions: string[]; onSave: (p: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(permissions);

  const toggle = (perm: string) => {
    setSelected((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
        {ALL_PERMISSIONS.map((perm) => (
          <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted/50">
            <Checkbox checked={selected.includes(perm)} onCheckedChange={() => toggle(perm)} />
            <span className="capitalize">{perm.replace(/_/g, " ")}</span>
          </label>
        ))}
      </div>
      <Button onClick={() => onSave(selected)} className="w-full">Save Permissions</Button>
    </div>
  );
}
