import { useMemo } from "react";
import { validateUtilityCompliance, autoClean, type ValidationResult } from "@/lib/wa/utilityValidator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, XCircle, Sparkles, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Props {
  body: string;
  category?: "utility" | "marketing" | "authentication";
  footer?: string;
  buttonTexts?: string[];
  onApplyClean?: (cleaned: string) => void;
  compact?: boolean;
}

/**
 * Live validator card: shows score, verdict, every issue, and a one-click "auto-clean".
 * Drop into template editor / pre-send composer.
 */
export function WAUtilityValidator({
  body,
  category = "utility",
  footer,
  buttonTexts,
  onApplyClean,
  compact,
}: Props) {
  const result: ValidationResult = useMemo(
    () => validateUtilityCompliance({ body, category, footer, buttonTexts }),
    [body, category, footer, buttonTexts?.join("|")],
  );

  const verdictMeta = {
    utility_safe:    { icon: CheckCircle2, label: "Utility-safe — Meta will keep as UTILITY (Rs 0.12)", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    utility_risky:   { icon: AlertTriangle, label: "Risky — Meta may reclassify to MARKETING",        tone: "text-amber-700 bg-amber-50 border-amber-200" },
    marketing_likely:{ icon: XCircle,       label: "Marketing — Will cost Rs 0.78 per send",          tone: "text-red-700 bg-red-50 border-red-200" },
  }[result.verdict];

  const Icon = verdictMeta.icon;

  return (
    <div className={`rounded-lg border ${verdictMeta.tone} p-3 space-y-2`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <div>
            <p className="text-xs font-semibold leading-tight">{verdictMeta.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {result.issues.length} issue{result.issues.length !== 1 ? "s" : ""} ·
              {" "}{result.emojiCount} emoji ·
              {" "}{result.promotionalPhraseCount} promo phrase
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold leading-none">{result.score}</div>
            <div className="text-[9px] uppercase text-muted-foreground tracking-wide">score</div>
          </div>
        </div>
      </div>

      <Progress value={result.score} className="h-1.5" />

      {!compact && result.issues.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {result.issues.slice(0, 8).map((issue, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              {issue.severity === "block" && <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />}
              {issue.severity === "warn"  && <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />}
              {issue.severity === "info"  && <Info className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium">{issue.message}</p>
                {issue.suggestion && (
                  <p className="text-[10px] text-muted-foreground">→ {issue.suggestion}</p>
                )}
              </div>
            </div>
          ))}
          {result.issues.length > 8 && (
            <p className="text-[10px] text-muted-foreground italic">+{result.issues.length - 8} more issues…</p>
          )}
        </div>
      )}

      {onApplyClean && result.issues.length > 0 && result.cleaned && result.cleaned !== body && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs"
          onClick={() => onApplyClean(autoClean(body))}
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          Auto-clean (remove emojis + promo phrases)
        </Button>
      )}

      {result.issues.length === 0 && (
        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">
          ✓ Clean — ready for utility submission
        </Badge>
      )}
    </div>
  );
}
