import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-zinc-700/40 text-zinc-400",
        success: "bg-emerald-500/15 text-emerald-400",
        warning: "bg-amber-500/15 text-amber-400",
        danger: "bg-red-500/15 text-red-400",
        info: "bg-sky-500/15 text-sky-400",
        accent: "bg-emerald-500/15 text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
