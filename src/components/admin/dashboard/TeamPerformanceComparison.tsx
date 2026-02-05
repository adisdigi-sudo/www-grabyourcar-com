import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Phone, CheckCircle2, X, UserPlus } from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  email: string;
  role: string;
}

interface MemberMetrics {
  userId: string;
  email: string;
  role: string;
  totalLeads: number;
  convertedLeads: number;
  hotLeads: number;
  followedUpLeads: number;
  conversionRate: number;
  followUpRate: number;
}

interface TeamPerformanceComparisonProps {
  dateRange: { from: Date; to: Date };
}

export const TeamPerformanceComparison = ({ dateRange }: TeamPerformanceComparisonProps) => {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Fetch team members with roles
  const { data: teamMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;

      // Get unique user IDs and their roles
      const memberMap = new Map<string, string>();
      roles?.forEach(r => {
        if (!memberMap.has(r.user_id)) {
          memberMap.set(r.user_id, r.role);
        }
      });

      // For now, use user_id as identifier (in real app, you'd join with profiles)
      return Array.from(memberMap.entries()).map(([id, role]) => ({
        id,
        email: `User ${id.substring(0, 8)}...`,
        role,
      })) as TeamMember[];
    },
  });

  // Fetch metrics for selected members
  const { data: memberMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['memberMetrics', selectedMembers, dateRange],
    queryFn: async () => {
      if (selectedMembers.length === 0) return [];

      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      const metrics: MemberMetrics[] = [];

      for (const memberId of selectedMembers) {
        const [
          totalLeadsResult,
          convertedResult,
          hotResult,
          followedUpResult,
        ] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true })
            .eq('assigned_to', memberId)
            .gte('created_at', fromDate)
            .lte('created_at', toDate),
          supabase.from('leads').select('id', { count: 'exact', head: true })
            .eq('assigned_to', memberId)
            .eq('status', 'converted')
            .gte('created_at', fromDate)
            .lte('created_at', toDate),
          supabase.from('leads').select('id', { count: 'exact', head: true })
            .eq('assigned_to', memberId)
            .eq('status', 'hot')
            .gte('created_at', fromDate)
            .lte('created_at', toDate),
          supabase.from('leads').select('id', { count: 'exact', head: true })
            .eq('assigned_to', memberId)
            .not('last_contacted_at', 'is', null)
            .gte('created_at', fromDate)
            .lte('created_at', toDate),
        ]);

        const total = totalLeadsResult.count || 0;
        const converted = convertedResult.count || 0;
        const hot = hotResult.count || 0;
        const followedUp = followedUpResult.count || 0;

        const member = teamMembers?.find(m => m.id === memberId);

        metrics.push({
          userId: memberId,
          email: member?.email || `User ${memberId.substring(0, 8)}`,
          role: member?.role || 'unknown',
          totalLeads: total,
          convertedLeads: converted,
          hotLeads: hot,
          followedUpLeads: followedUp,
          conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
          followUpRate: total > 0 ? Math.round((followedUp / total) * 100) : 0,
        });
      }

      return metrics;
    },
    enabled: selectedMembers.length > 0,
  });

  const handleAddMember = (memberId: string) => {
    if (!selectedMembers.includes(memberId) && selectedMembers.length < 4) {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(id => id !== memberId));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'sales': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'dealer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'finance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getMetricColor = (value: number, type: 'conversion' | 'followup') => {
    if (type === 'conversion') {
      if (value >= 30) return 'text-green-600';
      if (value >= 15) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value >= 80) return 'text-green-600';
      if (value >= 50) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  if (membersLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const availableMembers = teamMembers?.filter(m => !selectedMembers.includes(m.id)) || [];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Performance Comparison
            </CardTitle>
            <CardDescription>Compare performance metrics across team members</CardDescription>
          </div>
          {availableMembers.length > 0 && selectedMembers.length < 4 && (
            <Select onValueChange={handleAddMember}>
              <SelectTrigger className="w-[200px]">
                <UserPlus className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Add team member" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span>{member.email}</span>
                      <Badge variant="outline" className={`text-xs ${getRoleColor(member.role)}`}>
                        {member.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {selectedMembers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select team members to compare their performance</p>
            <p className="text-sm mt-1">You can compare up to 4 members at once</p>
          </div>
        ) : metricsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedMembers.map((id) => (
              <Skeleton key={id} className="h-64 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {memberMetrics?.map((member) => (
              <div 
                key={member.userId} 
                className="relative p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleRemoveMember(member.userId)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="mb-4">
                  <h4 className="font-semibold truncate pr-6">{member.email}</h4>
                  <Badge variant="outline" className={`text-xs mt-1 ${getRoleColor(member.role)}`}>
                    {member.role}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {/* Total Leads */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Leads</span>
                    <span className="font-bold text-lg">{member.totalLeads}</span>
                  </div>

                  {/* Hot Leads */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Hot Leads
                    </span>
                    <span className="font-semibold text-orange-600">{member.hotLeads}</span>
                  </div>

                  {/* Converted */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Converted
                    </span>
                    <span className="font-semibold text-green-600">{member.convertedLeads}</span>
                  </div>

                  {/* Conversion Rate */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Conversion Rate</span>
                      <span className={`font-bold ${getMetricColor(member.conversionRate, 'conversion')}`}>
                        {member.conversionRate}%
                      </span>
                    </div>
                    <Progress value={member.conversionRate} className="h-2" />
                  </div>

                  {/* Follow-up Rate */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Follow-up Rate
                      </span>
                      <span className={`font-bold ${getMetricColor(member.followUpRate, 'followup')}`}>
                        {member.followUpRate}%
                      </span>
                    </div>
                    <Progress value={member.followUpRate} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
