import { useState } from "react";
import { useEcommerceOrders, useOrderStats, useUpdateEcommerceOrder, type EcommerceOrder } from "@/hooks/useEcommerceOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShieldCheck, AlertTriangle, TrendingDown, ArrowRightLeft, Search, Package,
  ShieldAlert, CheckCircle, XCircle, Send, Eye,
} from "lucide-react";
import { toast } from "sonner";

const riskColors: Record<string, string> = {
  low: "bg-green-500/10 text-green-700 border-green-200",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  high: "bg-orange-500/10 text-orange-700 border-orange-200",
  critical: "bg-red-500/10 text-red-700 border-red-200",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700",
  confirmed: "bg-blue-500/10 text-blue-700",
  processing: "bg-indigo-500/10 text-indigo-700",
  shipped: "bg-cyan-500/10 text-cyan-700",
  delivered: "bg-green-500/10 text-green-700",
  cancelled: "bg-muted text-muted-foreground",
  returned: "bg-purple-500/10 text-purple-700",
  rto: "bg-red-500/10 text-red-700",
};

export const RTOSuitePage = () => {
  const [riskFilter, setRiskFilter] = useState("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<EcommerceOrder | null>(null);

  const { data: orders = [], isLoading } = useEcommerceOrders({ flaggedOnly, riskLevel: riskFilter });
  const { data: stats } = useOrderStats();
  const updateOrder = useUpdateEcommerceOrder();

  const filteredOrders = searchQuery
    ? orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orders;

  const handleC2P = async (order: EcommerceOrder) => {
    await updateOrder.mutateAsync({ orderId: order.id, updates: { c2p_attempted: true } });
    toast.success(`C2P offer sent for ${order.order_number}`);
  };

  const summaryStats = [
    { title: "Total Orders", value: stats?.total || 0, icon: Package, color: "text-blue-500" },
    { title: "Flagged Orders", value: stats?.flagged || 0, icon: ShieldAlert, color: "text-red-500" },
    { title: "RTO Orders", value: stats?.rtoOrders || 0, icon: TrendingDown, color: "text-orange-500" },
    { title: "C2P Success Rate", value: `${stats?.c2pRate || 0}%`, icon: ArrowRightLeft, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">RTO Suite</h2>
        <p className="text-muted-foreground">AI-powered risk detection, NDR management & COD-to-Prepaid conversion</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Risk Distribution</h3>
        <div className="flex gap-3">
          {Object.entries(stats?.riskBreakdown || { low: 0, medium: 0, high: 0, critical: 0 }).map(([level, count]) => (
            <div key={level} className={`flex-1 rounded-xl border p-4 text-center ${riskColors[level]}`}>
              <p className="text-2xl font-bold">{count as number}</p>
              <p className="text-xs capitalize mt-1">{level} Risk</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by order # or customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Risk Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={flaggedOnly ? "default" : "outline"} size="sm" onClick={() => setFlaggedOnly(!flaggedOnly)} className="h-9">
          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Flagged Only
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Order</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Customer</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Amount</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Payment</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Risk</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={7} className="p-3"><div className="h-8 bg-muted animate-pulse rounded" /></td></tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-sm text-muted-foreground p-8">No orders found</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {order.is_flagged && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        <span className="text-sm font-medium">{order.order_number}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{order.contact_name || "—"}</td>
                    <td className="p-3 text-sm font-medium">₹{Number(order.total).toLocaleString("en-IN")}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs uppercase">{order.payment_method}</Badge></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${riskColors[order.risk_level]}`}>{order.risk_score}/100</Badge>
                        <span className="text-xs capitalize text-muted-foreground">{order.risk_level}</span>
                      </div>
                    </td>
                    <td className="p-3"><Badge className={`text-xs ${statusColors[order.status] || ""}`}>{order.status}</Badge></td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrder(order)}><Eye className="h-3.5 w-3.5" /></Button>
                        {order.payment_method === "cod" && !order.c2p_attempted && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleC2P(order)}>
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedOrder && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Order Detail: {selectedOrder.order_number}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>Close</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Customer</p>
                <p className="text-sm font-medium">{selectedOrder.contact_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{selectedOrder.contact_phone} · {selectedOrder.contact_email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Shipping Address</p>
                <p className="text-sm">
                  {selectedOrder.shipping_address?.address}, {selectedOrder.shipping_address?.city},{" "}
                  {selectedOrder.shipping_address?.state} - {selectedOrder.shipping_address?.pincode}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Items</p>
                {(selectedOrder.items as any[])?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.name} × {item.qty}</span>
                    <span>₹{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Risk Analysis</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`text-3xl font-bold ${selectedOrder.risk_score >= 70 ? "text-red-500" : selectedOrder.risk_score >= 40 ? "text-yellow-500" : "text-green-500"}`}>
                    {selectedOrder.risk_score}
                  </div>
                  <Badge className={riskColors[selectedOrder.risk_level]}>{selectedOrder.risk_level} risk</Badge>
                </div>
                {(selectedOrder.risk_factors as string[])?.length > 0 && (
                  <div className="space-y-1.5">
                    {(selectedOrder.risk_factors as string[]).map((factor, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">C2P Status</p>
                <div className="flex items-center gap-2">
                  {selectedOrder.c2p_converted ? (
                    <Badge className="bg-green-500/10 text-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Converted</Badge>
                  ) : selectedOrder.c2p_attempted ? (
                    <Badge className="bg-yellow-500/10 text-yellow-700"><Send className="h-3 w-3 mr-1" /> Offer Sent</Badge>
                  ) : selectedOrder.payment_method === "cod" ? (
                    <Button size="sm" variant="outline" onClick={() => handleC2P(selectedOrder)}>
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Send C2P Offer
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Prepaid — N/A</span>
                  )}
                </div>
              </div>
              {selectedOrder.ndr_status && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">NDR Status</p>
                  <p className="text-sm capitalize">{selectedOrder.ndr_status.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">Attempts: {selectedOrder.ndr_attempts}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
