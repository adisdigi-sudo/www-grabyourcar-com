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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Users, UserPlus, Trash2, Loader2, Search, Shield, 
  Car, CreditCard, FileText, Building2, Megaphone, 
  Wrench, Package, Check, AlertCircle, Mail
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Extended team roles - mapped to app_role enum
interface TeamConfig {
  role: AppRole;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
  accessModules: string[];
}

const teamConfigs: TeamConfig[] = [
  {
    role: "super_admin",
    label: "Super Admin",
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    description: "Full system access - all modules and settings",
    accessModules: ["All Modules", "User Management", "Settings", "Security"],
  },
  {
    role: "admin",
    label: "Admin",
    icon: Building2,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    description: "Manage website, leads, and operations",
    accessModules: ["Dashboard", "Leads", "Cars", "Website", "Reports"],
  },
  {
    role: "sales",
    label: "Sales Team",
    icon: Car,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "Handle car inquiries and test drives",
    accessModules: ["Dashboard", "Car Inquiry Leads", "Test Drives", "Follow-ups"],
  },
  {
    role: "dealer",
    label: "Insurance Team",
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    description: "Manage insurance leads and policies",
    accessModules: ["Dashboard", "Insurance Leads", "Policy Quotes", "Claims"],
  },
  {
    role: "finance",
    label: "Finance Team",
    icon: CreditCard,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    description: "Handle car loans and EMI processing",
    accessModules: ["Dashboard", "Finance Leads", "Loan Applications", "EMI Calculator"],
  },
];

// Service-based team assignment
const serviceTeamMapping = {
  car_inquiry: "sales",
  test_drive: "sales",
  insurance: "dealer",
  finance: "finance",
  hsrp: "sales",
  rental: "sales",
  accessories: "sales",
  corporate: "admin",
};

export const TeamUserManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<AppRole | "all">("all");
  
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    role: "" as AppRole | "",
  });

  // Fetch all user roles
  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['teamUserRoles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if already exists
      const existing = userRoles.find(r => r.user_id === userId && r.role === role);
      if (existing) throw new Error("User already has this role");
      
      const { data, error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const teamLabel = teamConfigs.find(t => t.role === variables.role)?.label || variables.role;
      queryClient.invalidateQueries({ queryKey: ['teamUserRoles'] });
      toast.success(`User added to ${teamLabel}`);
      setIsAddDialogOpen(false);
      setNewUserForm({ email: "", role: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add user");
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamUserRoles'] });
      toast.success("User removed from team");
      setDeleteConfirm(null);
    },
    onError: () => {
      toast.error("Failed to remove user");
    },
  });

  // Lookup user by email
  const handleAddUserByEmail = async () => {
    if (!newUserForm.email || !newUserForm.role) {
      toast.error("Please enter email and select a team");
      return;
    }

    // For now, we need to look up the user ID from the email
    // In production, you'd have a profiles table or use admin API
    toast.info(
      "To add a user:\n1. User must first sign up on the platform\n2. Find their User ID from auth logs\n3. Use 'Add by User ID' option",
      { duration: 5000 }
    );
  };

  // Add by User ID
  const handleAddByUserId = async (userId: string, role: AppRole) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      toast.error("Invalid User ID format");
      return;
    }
    addRoleMutation.mutate({ userId, role });
  };

  // Filter roles
  const filteredRoles = userRoles.filter(role => {
    const matchesSearch = role.user_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = selectedTeam === "all" || role.role === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  // Team stats
  const teamStats = teamConfigs.map(team => ({
    ...team,
    count: userRoles.filter(r => r.role === team.role).length,
  }));

  const getTeamConfig = (role: AppRole) => teamConfigs.find(t => t.role === role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team & User Management
          </h2>
          <p className="text-muted-foreground">
            Assign users to teams based on their job role - each team has specific feature access
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Team Overview</TabsTrigger>
          <TabsTrigger value="members">All Members</TabsTrigger>
          <TabsTrigger value="access">Access Guide</TabsTrigger>
        </TabsList>

        {/* Team Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamStats.map((team) => {
              const Icon = team.icon;
              return (
                <Card 
                  key={team.role} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedTeam === team.role ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedTeam(team.role);
                    setActiveTab("members");
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${team.bgColor}`}>
                        <Icon className={`h-5 w-5 ${team.color}`} />
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold">
                        {team.count}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{team.label}</CardTitle>
                    <CardDescription className="text-sm">
                      {team.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {team.accessModules.slice(0, 3).map((module) => (
                        <Badge key={module} variant="outline" className="text-xs">
                          {module}
                        </Badge>
                      ))}
                      {team.accessModules.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{team.accessModules.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setNewUserForm({ ...newUserForm, role: "sales" });
                    setIsAddDialogOpen(true);
                  }}
                >
                  <Car className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">Add Sales Person</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setNewUserForm({ ...newUserForm, role: "dealer" });
                    setIsAddDialogOpen(true);
                  }}
                >
                  <FileText className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Add Insurance Person</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setNewUserForm({ ...newUserForm, role: "finance" });
                    setIsAddDialogOpen(true);
                  }}
                >
                  <CreditCard className="h-5 w-5 text-amber-600" />
                  <span className="text-sm">Add Finance Person</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setNewUserForm({ ...newUserForm, role: "admin" });
                    setIsAddDialogOpen(true);
                  }}
                >
                  <Building2 className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">Add Admin</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Members */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members ({filteredRoles.length})
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by User ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedTeam} onValueChange={(v) => setSelectedTeam(v as AppRole | "all")}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Filter team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teamConfigs.map((team) => (
                        <SelectItem key={team.role} value={team.role}>
                          {team.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <p>No team members found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Member
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Team / Role</TableHead>
                      <TableHead>Access Modules</TableHead>
                      <TableHead>Assigned On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((userRole) => {
                      const teamConfig = getTeamConfig(userRole.role);
                      const Icon = teamConfig?.icon || Users;
                      return (
                        <TableRow key={userRole.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {userRole.user_id.substring(0, 8)}...{userRole.user_id.slice(-4)}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded ${teamConfig?.bgColor}`}>
                                <Icon className={`h-4 w-4 ${teamConfig?.color}`} />
                              </div>
                              <span className="font-medium">{teamConfig?.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[250px]">
                              {teamConfig?.accessModules.slice(0, 2).map((module) => (
                                <Badge key={module} variant="secondary" className="text-xs">
                                  {module}
                                </Badge>
                              ))}
                              {(teamConfig?.accessModules.length || 0) > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(teamConfig?.accessModules.length || 0) - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
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
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Guide */}
        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Access Guide</CardTitle>
              <CardDescription>
                Each team has access to specific modules based on their job function
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {teamConfigs.map((team) => {
                const Icon = team.icon;
                return (
                  <div key={team.role} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${team.bgColor}`}>
                        <Icon className={`h-5 w-5 ${team.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{team.label}</h3>
                        <p className="text-sm text-muted-foreground">{team.description}</p>
                      </div>
                    </div>
                    <div className="ml-12">
                      <p className="text-sm font-medium mb-2">Can Access:</p>
                      <div className="flex flex-wrap gap-2">
                        {team.accessModules.map((module) => (
                          <Badge key={module} variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            {module}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium">Lead Assignment by Service</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Leads are automatically categorized and can be assigned to the appropriate team:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    Car Inquiry → Sales
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    Insurance → Insurance Team
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                    Finance → Finance Team
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    Corporate → Admin
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a user to a team to give them access to specific features
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label>Select Team *</Label>
              <div className="grid grid-cols-2 gap-2">
                {teamConfigs.slice(1).map((team) => {
                  const Icon = team.icon;
                  return (
                    <Button
                      key={team.role}
                      type="button"
                      variant={newUserForm.role === team.role ? "default" : "outline"}
                      className="h-auto py-3 flex-col gap-1"
                      onClick={() => setNewUserForm({ ...newUserForm, role: team.role })}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{team.label}</span>
                    </Button>
                  );
                })}
              </div>
              {newUserForm.role && (
                <p className="text-xs text-muted-foreground mt-2">
                  {teamConfigs.find(t => t.role === newUserForm.role)?.description}
                </p>
              )}
            </div>

            {/* User ID Input */}
            <div className="space-y-2">
              <Label>User ID (UUID) *</Label>
              <Input
                placeholder="e.g., ff237d62-41f7-4dbc-b5ba-4056c510bb3c"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The user must first sign up on the platform. Get their User ID from the backend → Authentication logs.
              </p>
            </div>

            {/* Access Preview */}
            {newUserForm.role && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">This user will have access to:</p>
                <div className="flex flex-wrap gap-1">
                  {teamConfigs.find(t => t.role === newUserForm.role)?.accessModules.map((module) => (
                    <Badge key={module} variant="secondary" className="text-xs">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => newUserForm.email && newUserForm.role && 
                handleAddByUserId(newUserForm.email, newUserForm.role as AppRole)}
              disabled={!newUserForm.email || !newUserForm.role || addRoleMutation.isPending}
            >
              {addRoleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add to Team
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the user's access to team-specific features. They can be re-added later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteRoleMutation.mutate(deleteConfirm)}
            >
              {deleteRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
