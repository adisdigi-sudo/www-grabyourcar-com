import { useState } from "react";
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
  Car, CreditCard, FileText, Building2, Check, AlertCircle, Mail
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole {
  id: string;
  user_id: string;
  user_email?: string;
  role: AppRole;
  created_at: string;
}

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

export const TeamUserManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<AppRole | "all">("all");
  const [isLookingUpEmail, setIsLookingUpEmail] = useState(false);
  const [emailLookupStatus, setEmailLookupStatus] = useState<{ success: boolean; userId?: string; message: string } | null>(null);
  
  
  const [newUserForm, setNewUserForm] = useState<{ email: string; role: AppRole }>({
    email: "",
    role: "sales",
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

  // Lookup user by email using admin API
  const handleLookupEmail = async (email: string) => {
    if (!email) {
      setEmailLookupStatus(null);
      return;
    }

    try {
      setIsLookingUpEmail(true);
      const trimmedEmail = email.trim().toLowerCase();

      // Check if email is valid
      if (!trimmedEmail.includes("@")) {
        throw new Error("Invalid email format");
      }
      
      // Use Supabase admin API to find user by email
      const { data: userData, error } = await (supabase.auth.admin as any).listUsers();

      if (error) {
        throw new Error("Could not fetch users - make sure you're logged in as admin");
      }

      const user = userData?.users?.find((u: any) => u.email?.toLowerCase() === trimmedEmail);
      
      if (user?.id) {
        setEmailLookupStatus({ 
          success: true, 
          userId: user.id,
          message: `✓ Found: ${user.email}`
        });
      } else {
        setEmailLookupStatus({ 
          success: false,
          message: `No user found with this email. They must sign up first.`
        });
      }
    } catch (error: any) {
      setEmailLookupStatus({ 
        success: false,
        message: error.message || "Error looking up email"
      });
    } finally {
      setIsLookingUpEmail(false);
    }
  };

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
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
    onSuccess: () => {
      const teamLabel = teamConfigs.find(t => t.role === newUserForm.role)?.label || newUserForm.role;
      queryClient.invalidateQueries({ queryKey: ['teamUserRoles'] });
      toast.success(`${newUserForm.email} added to ${teamLabel}`);
      setIsAddDialogOpen(false);
      setNewUserForm({ email: "", role: "sales" });
      setEmailLookupStatus(null);
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

  // Filter roles
  const filteredRoles = userRoles.filter(role => {
    const matchesSearch = 
      role.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
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
            Add users by email and assign them to teams with specific feature access
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
                  className="cursor-pointer hover:shadow-md transition-shadow"
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
                    setNewUserForm({ email: newUserForm.email, role: "sales" });
                    setIsAddDialogOpen(true);
                  }}
                >
                  <Car className="h-5 w-5" />
                  <span className="text-sm">Add Sales</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setNewUserForm({ email: newUserForm.email, role: "dealer" });
                    setIsAddDialogOpen(true);
                  }}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">Add Insurance</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setNewUserForm({ email: newUserForm.email, role: "finance" });
                    setIsAddDialogOpen(true);
                  }}
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-sm">Add Finance</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setNewUserForm({ email: newUserForm.email, role: "admin" });
                    setIsAddDialogOpen(true);
                  }}
                >
                  <Building2 className="h-5 w-5" />
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
                      placeholder="Search by email or ID..."
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
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
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{userRole.user_email || "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded ${teamConfig?.bgColor}`}>
                                  <Icon className={`h-4 w-4 ${teamConfig?.color}`} />
                                </div>
                                <span className="font-medium text-sm">{teamConfig?.label}</span>
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
                </div>
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
              Enter their email to add them to a team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newUserForm.email}
                onChange={(e) => {
                  setNewUserForm({ ...newUserForm, email: e.target.value });
                  setEmailLookupStatus(null);
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    handleLookupEmail(e.target.value);
                  }
                }}
              />
              {emailLookupStatus && (
                <div className={`flex items-center gap-2 text-sm p-2 rounded ${
                  emailLookupStatus.success 
                    ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' 
                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                }`}>
                  {emailLookupStatus.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {emailLookupStatus.message}
                </div>
              )}
              {isLookingUpEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Looking up user...
                </div>
              )}
            </div>

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
                      <span className="text-xs text-center">{team.label}</span>
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

            {/* Access Preview */}
            {newUserForm.role && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">This team gets access to:</p>
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
              onClick={() => {
                if (emailLookupStatus?.success && emailLookupStatus.userId && newUserForm.role) {
                  addRoleMutation.mutate({ 
                    userId: emailLookupStatus.userId, 
                    role: newUserForm.role as AppRole 
                  });
                } else {
                  toast.error("Please select a valid email and team");
                }
              }}
              disabled={!emailLookupStatus?.success || !newUserForm.role || addRoleMutation.isPending}
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
              This will revoke their access to team features. They can be re-added later.
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
