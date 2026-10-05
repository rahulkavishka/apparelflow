import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[96px] w-full rounded-[4px] border border-control-edge bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-faint focus-visible:border-vat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vat disabled:bg-disabled-bg disabled:text-ink-soft aria-[invalid=true]:border-2 aria-[invalid=true]:border-short-edge transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
