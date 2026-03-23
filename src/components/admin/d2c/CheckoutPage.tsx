import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ShoppingCart, CreditCard, MapPin, TrendingUp, CheckCircle, AlertTriangle, IndianRupee, Settings2, Zap,
} from "lucide-react";
import { toast } from "sonner";

const checkoutAnalytics = {
  totalCheckouts: 1247, completionRate: 68.4, avgOrderValue: 1850, c2pConversionRate: 28.5,
};

const recentCheckouts = [
  { id: "CHK-001", customer: "Priya Sharma", amount: 2499, method: "UPI", status: "completed", address_valid: true, time: "2 min ago" },
  { id: "CHK-002", customer: "Rahul Verma", amount: 1299, method: "COD", status: "pending_verification", address_valid: false, time: "5 min ago" },
  { id: "CHK-003", customer: "Anita Patel", amount: 3750, method: "Card", status: "completed", address_valid: true, time: "8 min ago" },
  { id: "CHK-004", customer: "Kiran Das", amount: 899, method: "COD", status: "c2p_nudge_sent", address_valid: true, time: "12 min ago" },
  { id: "CHK-005", customer: "Meera Nair", amount: 4200, method: "Wallet", status: "completed", address_valid: true, time: "15 min ago" },
];

const statusColors: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  pending_verification: "bg-amber-500/10 text-amber-600 border-amber-200",
  c2p_nudge_sent: "bg-blue-500/10 text-blue-600 border-blue-200",
  c2p_converted: "bg-purple-500/10 text-purple-600 border-purple-200",
  abandoned: "bg-red-500/10 text-red-600 border-red-200",
};

const statusLabels: Record<string, string> = {
  completed: "Completed", pending_verification: "Verifying Address", c2p_nudge_sent: "C2P Nudge Sent", c2p_converted: "C2P Converted", abandoned: "Abandoned",
};

export const CheckoutPage = () => {
  const [c2pEnabled, setC2pEnabled] = useState(true);
  const [addressVerification, setAddressVerification] = useState(true);
  const [smartCodEnabled, setSmartCodEnabled] = useState(true);
  const [c2pDiscount, setC2pDiscount] = useState("10");
  const [c2pMessage, setC2pMessage] = useState(
    "Hey {name}! 🎉 Get {discount}% OFF when you pay online for order #{order_id}. Pay now: {link}"
  );

  const stats = [
    { title: "Total Checkouts", value: checkoutAnalytics.totalCheckouts.toLocaleString(), icon: ShoppingCart, change: "+12.4%", positive: true },
    { title: "Completion Rate", value: `${checkoutAnalytics.completionRate}%`, icon: CheckCircle, change: "+3.2%", positive: true },
    { title: "Avg Order Value", value: `₹${checkoutAnalytics.avgOrderValue}`, icon: IndianRupee, change: "+8.1%", positive: true },
    { title: "C2P Conversion", value: `${checkoutAnalytics.c2pConversionRate}%`, icon: TrendingUp, change: "+5.7%", positive: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">1Checkout</h2>
        <p className="text-muted-foreground">Optimize your checkout flow for maximum conversions.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs mt-1 ${stat.positive ? "text-emerald-600" : "text-red-500"}`}>{stat.change} from last week</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Recent Checkouts</TabsTrigger>
          <TabsTrigger value="c2p">C2P Settings</TabsTrigger>
          <TabsTrigger value="address">Address Verification</TabsTrigger>
          <TabsTrigger value="payments">Payment Config</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader><CardTitle className="text-lg">Recent Checkout Activity</CardTitle><CardDescription>Live view of checkout sessions and their status.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Checkout ID</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead><TableHead>Address</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCheckouts.map((checkout) => (
                    <TableRow key={checkout.id}>
                      <TableCell className="font-mono text-xs">{checkout.id}</TableCell>
                      <TableCell className="font-medium">{checkout.customer}</TableCell>
                      <TableCell>₹{checkout.amount.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{checkout.method}</Badge></TableCell>
                      <TableCell>{checkout.address_valid ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[checkout.status] || ""}>{statusLabels[checkout.status] || checkout.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{checkout.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="c2p">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> COD to Prepaid Conversion</CardTitle>
                <CardDescription>Nudge COD customers to pay online with incentives.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div><Label className="font-medium">Enable C2P Nudges</Label><p className="text-xs text-muted-foreground mt-0.5">Send WhatsApp nudges to COD customers</p></div>
                  <Switch checked={c2pEnabled} onCheckedChange={setC2pEnabled} />
                </div>
                <div className="space-y-2">
                  <Label>Discount Percentage</Label>
                  <div className="flex items-center gap-2"><Input type="number" value={c2pDiscount} onChange={(e) => setC2pDiscount(e.target.value)} className="w-24" /><span className="text-sm text-muted-foreground">% off for prepaid</span></div>
                </div>
                <div className="space-y-2">
                  <Label>Nudge Timing</Label>
                  <Select defaultValue="5min"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediately after order</SelectItem>
                      <SelectItem value="5min">5 minutes after</SelectItem>
                      <SelectItem value="15min">15 minutes after</SelectItem>
                      <SelectItem value="1hr">1 hour after</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Message Template</Label>
                  <Textarea value={c2pMessage} onChange={(e) => setC2pMessage(e.target.value)} rows={4} className="text-sm" />
                  <p className="text-xs text-muted-foreground">Variables: {"{name}"}, {"{discount}"}, {"{order_id}"}, {"{link}"}, {"{amount}"}</p>
                </div>
                <Button onClick={() => toast.success("C2P settings saved!")} className="w-full">Save C2P Settings</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">C2P Performance</CardTitle><CardDescription>Conversion metrics for COD to Prepaid nudges.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Nudges Sent", value: "342", sub: "This month" },
                  { label: "Converted to Prepaid", value: "98", sub: "28.6% conversion" },
                  { label: "Revenue Recovered", value: "₹1,43,500", sub: "From C2P conversions" },
                  { label: "Avg Discount Given", value: "₹185", sub: "Per converted order" },
                ].map((metric) => (
                  <div key={metric.label} className="flex justify-between items-center p-3 rounded-lg border">
                    <div><p className="text-sm font-medium">{metric.label}</p><p className="text-xs text-muted-foreground">{metric.sub}</p></div>
                    <span className="text-lg font-bold">{metric.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="address">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Address Verification Settings</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between"><div><Label className="font-medium">Auto Address Verification</Label><p className="text-xs text-muted-foreground mt-0.5">Validate pincode, city, state automatically</p></div><Switch checked={addressVerification} onCheckedChange={setAddressVerification} /></div>
                <div className="flex items-center justify-between"><div><Label className="font-medium">Auto-Correct Addresses</Label><p className="text-xs text-muted-foreground mt-0.5">Fix minor spelling errors and format issues</p></div><Switch defaultChecked /></div>
                <div className="flex items-center justify-between"><div><Label className="font-medium">Flag Risky Addresses</Label><p className="text-xs text-muted-foreground mt-0.5">Flag PG, hostel, temporary residences</p></div><Switch defaultChecked /></div>
                <div className="flex items-center justify-between"><div><Label className="font-medium">Block High-Risk Pincodes</Label><p className="text-xs text-muted-foreground mt-0.5">Block COD for historically high-RTO areas</p></div><Switch /></div>
                <div className="space-y-2"><Label>Blocked Pincodes (comma-separated)</Label><Textarea placeholder="110001, 400001, 560001..." rows={2} /></div>
                <Button onClick={() => toast.success("Address settings saved!")} className="w-full">Save Address Settings</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Address Verification Stats</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Addresses Verified", value: "1,089", sub: "This month" },
                  { label: "Auto-Corrected", value: "134", sub: "12.3% correction rate" },
                  { label: "Flagged Risky", value: "23", sub: "Temporary residences" },
                  { label: "Blocked COD", value: "8", sub: "High-risk pincode orders" },
                  { label: "Delivery Success Rate", value: "94.2%", sub: "+3.1% after verification" },
                ].map((metric) => (
                  <div key={metric.label} className="flex justify-between items-center p-3 rounded-lg border">
                    <div><p className="text-sm font-medium">{metric.label}</p><p className="text-xs text-muted-foreground">{metric.sub}</p></div>
                    <span className="text-lg font-bold">{metric.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Payment Methods</CardTitle><CardDescription>Configure available payment options at checkout.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "UPI (GPay, PhonePe, Paytm)", enabled: true },
                  { name: "Credit / Debit Cards", enabled: true },
                  { name: "Net Banking", enabled: true },
                  { name: "Wallets (Paytm, Amazon Pay)", enabled: true },
                  { name: "Cash on Delivery", enabled: true },
                  { name: "EMI / Pay Later", enabled: false },
                ].map((method) => (
                  <div key={method.name} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">{method.name}</span>
                    <Switch defaultChecked={method.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /> Smart COD</CardTitle><CardDescription>Intelligent COD restrictions based on risk scoring.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between"><div><Label className="font-medium">Enable Smart COD</Label><p className="text-xs text-muted-foreground mt-0.5">Use AI risk scoring to manage COD availability</p></div><Switch checked={smartCodEnabled} onCheckedChange={setSmartCodEnabled} /></div>
                <div className="space-y-2"><Label>COD Limit Per Order</Label><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">₹</span><Input type="number" defaultValue="5000" className="w-32" /></div></div>
                <div className="space-y-2"><Label>Min Risk Score to Block COD</Label><div className="flex items-center gap-2"><Input type="number" defaultValue="60" className="w-32" /><span className="text-sm text-muted-foreground">out of 100</span></div></div>
                <Button onClick={() => toast.success("Smart COD settings saved!")} className="w-full">Save Smart COD Settings</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
