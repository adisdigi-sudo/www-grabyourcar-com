import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const SectionCard = ({ title, description, icon: Icon, action, children, className }: SectionCardProps) => {
  return (
    <section className={cn("rounded-xl border bg-white shadow-sm overflow-hidden", className)}>
      <header className="flex items-start justify-between gap-4 px-5 py-4 border-b bg-slate-50/50">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-serif font-semibold text-slate-900 text-base leading-tight">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
};
