// LUNARIS — Select controlado (input nativo, estilizado).
// O Select do @base-ui/react não expõe uma raiz JSX no bundle instalado, pelo
// que usamos o <select> nativo com caret e acessibilidade nativa.
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

export function Select({
  value,
  onChange,
  children,
  placeholder = "Selecionar...",
  className,
  "aria-label": ariaLabel,
}: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-full min-w-0 appearance-none rounded-xl border border-border bg-background px-3 pr-8 text-sm transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50",
          className,
        )}
      >
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70"
        aria-hidden="true"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 3l4 4 4-4" />
        </svg>
      </span>
    </div>
  );
}
