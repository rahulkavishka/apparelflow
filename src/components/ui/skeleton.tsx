import { cn } from "@/lib/utils";

/** Static placeholder block (DESIGN §9.7: no shimmer, uses `sheet`/`rule` tokens). */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xs bg-rule/60", className)}
      {...props}
    />
  );
}

export { Skeleton };
