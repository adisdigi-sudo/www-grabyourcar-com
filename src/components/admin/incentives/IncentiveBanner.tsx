import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, Target, Star, Zap, Gift } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface IncentiveBannerProps {
  userId?: string;
  verticalName?: string;
  compact?: boolean;
}

const IncentiveBanner = ({ userId, verticalName, compact = false }: IncentiveBannerProps) => {
  const currentMonth = format(new Date(), "yyyy-MM");

  const { data: summary } = useQuery({
    queryKey: ["my-incentive-summary", userId, verticalName, currentMonth],
    queryFn: async () => {
      if (!userId) return null;
      let q = (supabase.from("incentive_monthly_summary") as any).select("*").eq("user_id", userId).eq("month_year", currentMonth);
      if (verticalName) q = q.eq("vertical_name", verticalName);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: rules } = useQuery({
    queryKey: ["incentive-rules-active", verticalName],
    queryFn: async () => {
      let q = (supabase.from("incentive_rules") as any).select("*").eq("is_active", true);
      if (verticalName) q = q.eq("vertical_name", verticalName);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: target } = useQuery({
    queryKey: ["my-target", userId, verticalName, currentMonth],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await (supabase.from("incentive_targets") as any)
        .select("*").eq("user_id", userId).eq("month_year", currentMonth).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const totalIncentive = (summary || []).reduce((s: number, e: any) => s + Number(e.total_incentive || 0), 0);
  const totalDeals = (summary || []).reduce((s: number, e: any) => s + Number(e.total_deals || 0), 0);
  const targetCount = target?.target_count || 0;
  const progressPct = targetCount > 0 ? Math.min(100, Math.round((totalDeals / targetCount) * 100)) : 0;

  // Calculate next slab info
  const slabRules = (rules || []).filter((r: any) => r.rule_type === "slab" && r.role_applicable !== "manager");
  let nextSlabMsg = "";
  if (slabRules.length > 0) {
    const slabs = slabRules[0].slab_config || [];
    for (const slab of slabs) {
      if (totalDeals < slab.min) {
        const dealsNeeded = slab.min - totalDeals;
        nextSlabMsg = `🔥 ${dealsNeeded} more deal${dealsNeeded > 1 ? "s" : ""} to unlock ₹${slab.amount.toLocaleString()} per deal!`;
        break;
      }
    }
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5 flex items-center gap-3"
      >
        <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            This Month: ₹{totalIncentive.toLocaleString()}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-foreground">{totalDeals} deals closed</span>
          {nextSlabMsg && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-orange-600 dark:text-orange-400 font-medium">{nextSlabMsg}</span>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 border border-amber-500/20 rounded-xl p-5 mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-6 w-6 text-amber-500" />
        <h3 className="font-bold text-lg text-foreground">Your Incentive Dashboard — {format(new Date(), "MMMM yyyy")}</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-background/60 rounded-lg p-3 text-center border">
          <Zap className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">₹{totalIncentive.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Earned This Month</p>
        </div>
        <div className="bg-background/60 rounded-lg p-3 text-center border">
          <Star className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalDeals}</p>
          <p className="text-xs text-muted-foreground">Deals Closed</p>
        </div>
        <div className="bg-background/60 rounded-lg p-3 text-center border">
          <Target className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{progressPct}%</p>
          <p className="text-xs text-muted-foreground">Target Progress</p>
        </div>
        <div className="bg-background/60 rounded-lg p-3 text-center border">
          <Gift className="h-5 w-5 text-purple-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{(summary || []).length}</p>
          <p className="text-xs text-muted-foreground">Verticals Active</p>
        </div>
      </div>

      {/* Progress Bar */}
      {targetCount > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress: {totalDeals}/{targetCount} deals</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Next milestone */}
      <AnimatePresence>
        {nextSlabMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4 text-orange-500 shrink-0" />
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">{nextSlabMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default IncentiveBanner;
