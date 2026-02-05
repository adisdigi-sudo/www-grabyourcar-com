import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Shield, 
  Car, 
  Phone,
  CreditCard,
  MessageSquare,
  CalendarCheck
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  status: string;
  car_brand?: string;
  car_model?: string;
  source: string;
  created_at: string;
}

interface HSRPBooking {
  id: string;
  registration_number: string;
  owner_name: string;
  vehicle_class: string;
  order_status: string;
  payment_amount: number;
  created_at: string;
}

interface RecentActivityProps {
  recentLeads: Lead[] | undefined;
  recentHsrp: HSRPBooking[] | undefined;
  isLoading: boolean;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    hot: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    warm: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    cold: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    converted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
};

export const RecentActivity = ({ recentLeads, recentHsrp, isLoading }: RecentActivityProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Recent Leads
          </CardTitle>
          <CardDescription>Latest leads from all sources</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[320px] pr-4">
            {recentLeads && recentLeads.length > 0 ? (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{lead.customer_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                      {lead.car_brand && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Car className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.car_brand} {lead.car_model}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No leads yet</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent HSRP Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Recent HSRP Bookings
          </CardTitle>
          <CardDescription>Latest HSRP plate orders</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[320px] pr-4">
            {recentHsrp && recentHsrp.length > 0 ? (
              <div className="space-y-3">
                {recentHsrp.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium font-mono truncate">{booking.registration_number}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{booking.owner_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Car className="h-3 w-3 shrink-0" />
                        <span>{booking.vehicle_class}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <Badge className={getStatusColor(booking.order_status)}>
                        {booking.order_status}
                      </Badge>
                      <span className="text-xs font-medium text-primary">
                        ₹{booking.payment_amount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No HSRP bookings yet</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
