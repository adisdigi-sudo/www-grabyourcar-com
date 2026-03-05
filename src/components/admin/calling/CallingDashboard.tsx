import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhoneCall, CheckCircle2, Inbox, Zap, Shield, Car, CreditCard, CalendarDays, Wrench } from "lucide-react";
import { SmartCallingQueue } from "./SmartCallingQueue";
import { FreshLeadsQueue } from "./FreshLeadsQueue";
import { LoanCallingWorkspace } from "../loans/LoanCallingWorkspace";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { motion } from "framer-motion";
import { useState } from "react";

const VERTICAL_META: Record<string, { label: string; icon: React.ElementType; gradient: string; desc: string }> = {
  sales: { label: "Car Sales", icon: Car, gradient: "from-blue-500 to-cyan-500", desc: "New car inquiry leads & follow-ups" },
  loans: { label: "Car Loans", icon: CreditCard, gradient: "from-emerald-500 to-teal-500", desc: "Loan eligibility & document follow-ups" },
  insurance: { label: "Insurance", icon: Shield, gradient: "from-purple-500 to-violet-500", desc: "Insurance renewal & new policy leads" },
  rental: { label: "Self-Drive Rental", icon: CalendarDays, gradient: "from-amber-500 to-orange-500", desc: "Rental bookings, extensions & returns" },
  hsrp: { label: "HSRP & FASTag", icon: Wrench, gradient: "from-red-500 to-pink-500", desc: "HSRP application & FASTag follow-ups" },
};

export function CallingDashboard() {
  const { activeVertical } = useVerticalAccess();
  const [activeTab, setActiveTab] = useState("smart-queue");
  const slug = activeVertical?.slug || "sales";
  const normalizedVertical = `${activeVertical?.slug || ""} ${activeVertical?.name || ""}`.toLowerCase();
  const isLoansVertical = normalizedVertical.includes("loan") || normalizedVertical.includes("finance");
  const meta = VERTICAL_META[slug] || (isLoansVertical ? VERTICAL_META.loans : VERTICAL_META.sales);
  const Icon = meta.icon;

  const { data: loanApplications = [] } = useQuery({
    queryKey: ["loan-applications-calling"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_applications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: isLoansVertical,
  });

  if (isLoansVertical) {
    return <LoanCallingWorkspace applications={loanApplications} />;
  }

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border p-5">
        <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-[0.06]`} />
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-lg`}>
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl">Smart Calling</h2>
                <Badge className="bg-primary/10 text-primary border-0 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs gap-1">
                  <Icon className="h-3 w-3" /> {meta.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{meta.desc}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="smart-queue" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Smart Queue
          </TabsTrigger>
          <TabsTrigger value="fresh-leads" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" /> Fresh Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smart-queue" className="mt-4">
          <SmartCallingQueue />
        </TabsContent>

        <TabsContent value="fresh-leads" className="mt-4">
          <FreshLeadsQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}
