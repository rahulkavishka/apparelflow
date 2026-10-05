import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface DecimalInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | string | null | undefined;
  onChange: (val: string) => void;
  maxDecimals?: number;
  allowNegative?: boolean;
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

export const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(
  (
    {
      value,
      onChange,
      maxDecimals = 2,
      allowNegative = false,
      className,
      onKeyDown,
      onPaste,
      ...props
    },
    ref
  ) => {
    const stringValue =
      value === null || value === undefined ? "" : String(value);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow shortcut keys like Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
      if (e.ctrlKey || e.metaKey || e.altKey) {
        onKeyDown?.(e);
        return;
      }

      // Allow navigation and editing keys
      if (ALLOWED_CONTROL_KEYS.has(e.key)) {
        onKeyDown?.(e);
        return;
      }

      // Handle minus sign
      if (e.key === "-" && allowNegative) {
        const input = e.currentTarget;
        const currentVal = input.value;
        if (input.selectionStart === 0 && !currentVal.includes("-")) {
          onKeyDown?.(e);
          return;
        }
      }

      // Handle decimal point
      if (e.key === "." || e.key === ",") {
        const input = e.currentTarget;
        const currentVal = input.value;
        const selStart = input.selectionStart ?? 0;
        const selEnd = input.selectionEnd ?? 0;
        const selectedPart = currentVal.slice(selStart, selEnd);

        // Allow dot if there isn't one already or if the existing dot is being replaced
        if (!currentVal.includes(".") || selectedPart.includes(".")) {
          onKeyDown?.(e);
          return;
        }
        e.preventDefault();
        return;
      }

      // Block all non-numeric characters (letters, symbols, whitespace)
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        return;
      }

      onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      // Sanitize pasted text: only keep digits and first decimal point
      let clean = text.replace(/[^0-9.]/g, "");
      const parts = clean.split(".");
      if (parts.length > 2) {
        clean = parts[0] + "." + parts.slice(1).join("");
      }
      if (maxDecimals !== undefined && clean.includes(".")) {
        const [intPart, decPart] = clean.split(".");
        clean = `${intPart}.${decPart.slice(0, maxDecimals)}`;
      }
      onChange(clean);
      onPaste?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/,/g, ".");
      // Strip any non-digit/non-dot characters
      val = val.replace(/[^0-9.]/g, "");
      // Allow only one decimal point
      const parts = val.split(".");
      if (parts.length > 2) {
        val = parts[0] + "." + parts.slice(1).join("");
      }
      if (maxDecimals !== undefined && val.includes(".")) {
        const [intPart, decPart] = val.split(".");
        val = `${intPart}.${decPart.slice(0, maxDecimals)}`;
      }
      onChange(val);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={stringValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          "flex h-9 w-full rounded-[3px] border border-control-edge bg-paper px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-ink-faint focus-visible:border-vat focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-vat disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-ink-soft",
          className
        )}
        {...props}
      />
    );
  }
);

DecimalInput.displayName = "DecimalInput";
