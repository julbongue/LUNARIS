// LUNARIS — Badge (tons de cores da paleta lunar).
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background",
        outline: "border-border bg-background text-foreground",
        real: "border-transparent bg-[#172B40] text-[#8FAFC7]",
        mock: "border-transparent bg-[#D5D2C9] text-[#85847F]",
        unavailable: "border-transparent bg-[#101820] text-[#85847F]",
        synthetic: "border-transparent bg-[#E89A55] text-white",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant = "outline", ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
