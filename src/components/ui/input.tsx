import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "h-10 w-full rounded-[3px] border border-control-edge bg-paper px-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-vat focus:ring-1 focus:ring-vat focus-visible:outline-none focus-visible:border-vat focus-visible:ring-1 focus-visible:ring-vat disabled:bg-disabled-bg disabled:text-ink-soft aria-invalid:border-2 aria-invalid:border-short-edge transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
