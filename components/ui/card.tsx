// LUNARIS — Card de assinatura (misto com glass, sem excesso).
import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps {
  className?: string;
  children: React.ReactNode;
  border?: boolean;
  ghost?: boolean;
  hover?: boolean;
}

export function Card({
  className,
  children,
  border = true,
  ghost = false,
  hover = false,
}: CardProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border bg-card/70 text-card-foreground shadow-sm ring-1 ring-border/40 transition-shadow duration-200",
        border && "border-border",
        ghost && "border-transparent ring-0",
        hover && "hover:shadow-md hover:ring-border/60",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col gap-1.5 p-4", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        typeof children === "string" && "leading-snug",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex-1 p-4", className)}>{children}</div>;
}
