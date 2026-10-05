"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-2 group-[.toaster]:border-slate-300 group-[.toaster]:shadow-lg font-medium",
          description: "group-[.toast]:text-slate-600",
          actionButton:
            "group-[.toast]:bg-blue-700 group-[.toast]:text-white font-semibold",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-700",
          error:
            "group-[.toaster]:bg-rose-50 group-[.toaster]:border-rose-400 group-[.toaster]:text-rose-950",
          success:
            "group-[.toaster]:bg-emerald-50 group-[.toaster]:border-emerald-400 group-[.toaster]:text-emerald-950",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
