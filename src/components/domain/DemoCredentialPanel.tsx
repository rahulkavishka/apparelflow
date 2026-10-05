"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Scissors, ShieldCheck, Layers, ArrowRight } from "lucide-react";

interface DemoCredentialPanelProps {
  onFillCredentials: (email: string, pass: string) => void;
  onDirectLogin: (email: string, pass: string) => void;
  isLoading?: boolean;
}

const DEMO_ACCOUNTS = [
  {
    roleTitle: "Cutting supervisor",
    icon: Scissors,
    tag: "Floor Planner",
    description: "Creates batches & sends orders to verification gate.",
    email: "supervisor@apparelflow.demo",
    password: "Supervisor@123",
  },
  {
    roleTitle: "Cutting verifier",
    icon: ShieldCheck,
    tag: "Quality Auditor",
    description: "Counts components, audits tolerances, and approves/rejects.",
    email: "verifier@apparelflow.demo",
    password: "Verifier@123",
  },
  {
    roleTitle: "Sewing supervisor",
    icon: Layers,
    tag: "Assembly Line",
    description: "Receives released batches and starts line assembly.",
    email: "sewing@apparelflow.demo",
    password: "Sewing@123",
  },
];

export function DemoCredentialPanel({
  onFillCredentials,
  onDirectLogin,
  isLoading,
}: DemoCredentialPanelProps) {
  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">
          Quick Demo Access
        </span>
        <span className="text-[11px] text-ink-soft">
          Server-enforced role permissions
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DEMO_ACCOUNTS.map((acc) => {
          const Icon = acc.icon;
          return (
            <div
              key={acc.email}
              className="rounded-sm border border-rule bg-paper p-3.5 flex flex-col justify-between space-y-3 hover:border-vat/40 transition-colors shadow-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-[3px] bg-sheet border border-rule flex items-center justify-center text-vat">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-ink">{acc.roleTitle}</h3>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-sheet border border-rule text-ink-soft font-semibold">
                    {acc.tag}
                  </span>
                </div>

                <p className="text-[11px] text-ink-soft leading-snug min-h-[32px] line-clamp-2">
                  {acc.description}
                </p>

                <div className="bg-sheet/80 p-2 rounded-xs border border-rule/80 text-xs font-mono space-y-0.5 text-ink-soft">
                  <div className="truncate text-ink font-bold">{acc.email}</div>
                  <div className="text-[11px] text-ink-soft font-semibold">Pass: {acc.password}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="flex-1 h-7 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  disabled={isLoading}
                  onClick={() => onDirectLogin(acc.email, acc.password)}
                >
                  <span>Sign in</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs px-2 text-ink-soft hover:text-ink cursor-pointer"
                  disabled={isLoading}
                  onClick={() => onFillCredentials(acc.email, acc.password)}
                  title="Fill credentials into form"
                >
                  Fill
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
