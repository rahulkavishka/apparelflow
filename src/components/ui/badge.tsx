import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-blue-300 bg-blue-100 text-blue-900",
        secondary:
          "border border-slate-300 bg-slate-100 text-slate-800",
        destructive:
          "border border-red-300 bg-red-100 text-red-900",
        outline:
          "border-2 border-slate-400 text-slate-800 bg-white",
        // Domain specific traffic-light statuses:
        green:
          "border-2 border-emerald-500 bg-emerald-50 text-emerald-900",
        yellow:
          "border-2 border-amber-500 bg-amber-50 text-amber-950",
        red:
          "border-2 border-rose-500 bg-rose-50 text-rose-950",
        pending:
          "border-2 border-indigo-400 bg-indigo-50 text-indigo-950",
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
