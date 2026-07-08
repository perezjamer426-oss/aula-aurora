import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "warn" | "danger";
  onClick?: () => void;
}

const tones: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-muted text-foreground",
  primary: "bg-primary-soft text-primary",
  warn: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

/** Widget numérico premium para dashboards. */
export function StatCard({ label, value, hint, icon, tone = "default", onClick }: StatCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-xs transition-all",
        onClick && "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-glow)]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", tones[tone])}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </Comp>
  );
}
