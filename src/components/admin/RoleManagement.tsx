import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, UserPlus, Trash2, Loader2, Users, Search } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  email?: string;
}

const roleColors: Record<AppRole, string> = {
  super_admin: "bg-red-500 text-white",
  admin: "bg-purple-500 text-white",
  sales: "bg-blue-500 text-white",
  dealer: "bg-green-500 text-white",
  finance: "bg-amber-500 text-white",
};

const roleDescriptions: Record<AppRole, string> = {
  super_admin: "Full system access, can manage all roles",
  admin: "Can manage leads, bookings, and homepage content",
  sales: "Can view and manage assigned leads",
  dealer: "Dealer-specific access",
  finance: "Finance and payment access",
};

export const RoleManagement = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [newRole, setNewRole] = useState({
    userId: "",
    role: "" as AppRole | "",
  });

  const fetchUserRoles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error: any) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to fetch user roles");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const handleAddRole = async () => {
    if (!newRole.userId || !newRole.role) {
      toast.error("Please fill all fields");
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(newRole.userId)) {
      toast.error("Invalid User ID format. Please enter a valid UUID.");
      return;
    }

    setIsAdding(true);
    try {
      // Check if user already has this role
      const existingRole = userRoles.find(
        (r) => r.user_id === newRole.userId && r.role === newRole.role
      );
      if (existingRole) {
        toast.error("User already has this role");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .insert({
          user_id: newRole.userId,
          role: newRole.role as AppRole,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Role "${newRole.role}" added successfully`);
      setUserRoles([data, ...userRoles]);
      setNewRole({ userId: "", role: "" });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding role:", error);
      toast.error(error.message || "Failed to add role");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Role removed successfully");
      setUserRoles(userRoles.filter((r) => r.id !== id));
    } catch (error: any) {
      console.error("Error deleting role:", error);
      toast.error(error.message || "Failed to remove role");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const filteredRoles = userRoles.filter((role) =>
    role.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleStats = userRoles.reduce((acc, role) => {
    acc[role.role] = (acc[role.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Role Management
          </h2>
          <p className="text-muted-foreground">
            Manage user roles and permissions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User Role</DialogTitle>
              <DialogDescription>
                Assign a role to a user by their User ID.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID (UUID)</Label>
                <Input
                  id="userId"
                  placeholder="e.g., ff237d62-41f7-4dbc-b5ba-4056c510bb3c"
                  value={newRole.userId}
                  onChange={(e) =>
                    setNewRole({ ...newRole, userId: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Find User IDs in your backend authentication logs
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newRole.role}
                  onValueChange={(value: AppRole) =>
                    setNewRole({ ...newRole, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
                {newRole.role && (
                  <p className="text-xs text-muted-foreground">
                    {roleDescriptions[newRole.role as AppRole]}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRole} disabled={isAdding}>
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  "Add Role"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(["super_admin", "admin", "sales", "dealer", "finance"] as AppRole[]).map(
          (role) => (
            <Card key={role}>
              <CardContent className="p-4 text-center">
                <Badge className={`${roleColors[role]} mb-2`}>{role.replace("_", " ")}</Badge>
                <p className="text-2xl font-bold">{roleStats[role] || 0}</p>
                <p className="text-xs text-muted-foreground">users</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Roles ({filteredRoles.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by User ID or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No user roles found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((userRole) => (
                  <TableRow key={userRole.id}>
                    <TableCell className="font-mono text-sm">
                      {userRole.user_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[userRole.role]}>
                        {userRole.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(userRole.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(userRole.id)}
                      >
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

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the user's permissions associated with this role.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDeleteRole(deleteConfirm)}
            >
              Remove Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
