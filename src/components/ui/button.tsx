import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-base font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vat disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-0 disabled:bg-disabled-bg disabled:text-ink-soft cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "h-12 bg-vat px-5 text-paper hover:bg-vat-deep active:bg-vat-deep",
        primary:
          "h-12 bg-vat px-5 text-paper hover:bg-vat-deep active:bg-vat-deep",
        secondary:
          "h-11 border border-control-edge bg-paper px-4 text-ink hover:bg-row-hover",
        outline:
          "h-11 border border-control-edge bg-paper px-4 text-ink hover:bg-row-hover",
        reject:
          "h-11 border-[1.5px] border-short-edge bg-paper px-4 text-short-fg hover:bg-short-bg",
        destructive:
          "h-11 border-[1.5px] border-short-edge bg-paper px-4 text-short-fg hover:bg-short-bg",
        quiet:
          "h-auto p-0 text-vat font-bold hover:underline",
        ghost:
          "h-10 px-3 text-ink hover:bg-row-hover",
        link:
          "h-auto p-0 text-vat font-bold hover:underline",
      },
      size: {
        default: "h-12 px-5 py-2",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-8 text-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
