import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface IntegerInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | string | null | undefined;
  onChange: (val: number | null) => void;
  tall?: boolean; // 56px for Verification Terminal
}

const ALLOWED_CONTROL_KEYS = new Set([
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "Home",
  "End",
  "Enter",
  "Escape",
]);

export const IntegerInput = forwardRef<HTMLInputElement, IntegerInputProps>(
  ({ value, onChange, tall = false, className, onKeyDown, onPaste, ...props }, ref) => {
    const stringValue =
      value === null || value === undefined || value === "" ? "" : String(value);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow shortcuts like Ctrl+A, Ctrl+C, Ctrl+V, etc.
      if (e.ctrlKey || e.metaKey || e.altKey) {
        onKeyDown?.(e);
        return;
      }

      // Allow navigation and editing control keys
      if (ALLOWED_CONTROL_KEYS.has(e.key)) {
        onKeyDown?.(e);
        return;
      }

      // Block all non-digit keys (letters, symbols, punctuation, spaces)
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        return;
      }

      onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      const clean = text.replace(/[^0-9]/g, "");
      if (clean) {
        const num = parseInt(clean, 10);
        onChange(Number.isNaN(num) ? null : num);
      } else {
        onChange(null);
      }
      onPaste?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "") {
        onChange(null);
        return;
      }
      const clean = val.replace(/[^0-9]/g, "");
      const num = parseInt(clean, 10);
      onChange(Number.isNaN(num) ? null : num);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={stringValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          "w-full rounded-[4px] border border-control-edge bg-paper px-3 text-right font-display text-2xl font-semibold tabular-nums text-ink placeholder:text-ink-faint focus-visible:border-vat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vat disabled:bg-disabled-bg disabled:text-ink-soft aria-[invalid=true]:border-2 aria-[invalid=true]:border-short-edge transition-colors",
          tall ? "h-14" : "h-12",
          className
        )}
        {...props}
      />
    );
  }
);

IntegerInput.displayName = "IntegerInput";
