// LUNARIS — Estatística simples (valor + sub + status).
import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  status?: "good" | "warning" | "bad" | "neutral";
  grouper?: boolean;
}

export function Stat({ label, value, sub, status = "neutral", grouper = true }: StatProps) {
  const statusClasses = {
    good: "text-[#E89A55]",
    warning: "text-[#F59E0B]",
    bad: "text-[#EF4444]",
    neutral: "text-[#8FAFC7]",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border border-transparent bg-background/70 p-3",
        grouper && "border-border/60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-xs font-medium", statusClasses[status])} />
      </div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
