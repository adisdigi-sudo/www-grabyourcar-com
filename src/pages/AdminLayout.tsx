import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LeadManagement } from "@/components/admin/LeadManagement";
import { HomepageManagement } from "@/components/admin/HomepageManagement";
import { HSRPManagement } from "@/components/admin/HSRPManagement";
import { CarDataManagement } from "@/components/admin/CarDataManagement";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  Users, 
  Image, 
  Shield, 
  Database,
  UserCog,
} from "lucide-react";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isAdmin, roles } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Redirect if not authenticated
  if (!isLoading && !user) {
    navigate('/auth');
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check admin access - if no roles, allow access (for initial setup)
  const hasAdminAccess = roles.length === 0 || isAdmin();

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You don't have permission to access the admin panel.</p>
        <Button onClick={() => navigate('/')}>Go to Homepage</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your platform, leads, and content
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="leads" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Users className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger 
              value="hsrp" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Shield className="h-4 w-4" />
              HSRP Bookings
            </TabsTrigger>
            <TabsTrigger 
              value="homepage" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Image className="h-4 w-4" />
              Homepage
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Database className="h-4 w-4" />
              Data & Migration
            </TabsTrigger>
            <TabsTrigger 
              value="roles" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <UserCog className="h-4 w-4" />
              Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="leads">
            <LeadManagement />
          </TabsContent>

          <TabsContent value="hsrp">
            <HSRPManagement />
          </TabsContent>

          <TabsContent value="homepage">
            <HomepageManagement />
          </TabsContent>

          <TabsContent value="data">
            <CarDataManagement />
          </TabsContent>

          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default AdminLayout;
