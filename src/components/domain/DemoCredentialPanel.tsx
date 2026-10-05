"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface DemoCredentialPanelProps {
  onFillCredentials: (email: string, pass: string) => void;
  onDirectLogin: (email: string, pass: string) => void;
  isLoading?: boolean;
}

const DEMO_ACCOUNTS = [
  {
    roleTitle: "Cutting supervisor",
    description: "Creates cutting orders, sets batch quantities, and sends orders to verification.",
    restriction: "Cannot verify batches. Cannot view the Sewing Queue.",
    email: "supervisor@apparelflow.demo",
    password: "Supervisor@123",
  },
  {
    roleTitle: "Cutting verifier",
    description: "Quality gatekeeper. Counts physical cut components per recipe, triggers traffic lights, approves or rejects batches.",
    restriction: "Cannot create orders or edit recipes. Cannot view the Sewing Queue.",
    email: "verifier@apparelflow.demo",
    password: "Verifier@123",
  },
  {
    roleTitle: "Sewing supervisor",
    description: "Receives verified batches on the assembly floor, reviews verifier audit notes, and starts sewing assembly.",
    restriction: "Strictly blocked from seeing unverified, pending, or rejected cutting orders.",
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
    <div className="rounded-[4px] border border-rule bg-paper p-5">
      <div className="border-b border-rule pb-3">
        <h2 className="text-lg font-bold text-ink">Demo accounts</h2>
        <p className="text-sm text-ink-soft">
          Each role is enforced by the server.
        </p>
      </div>

      <div className="divide-y divide-rule">
        {DEMO_ACCOUNTS.map((acc) => (
          <div key={acc.email} className="py-4 first:pt-4 last:pb-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <h3 className="text-base font-bold text-ink">{acc.roleTitle}</h3>
              <span className="font-mono text-xs text-ink-soft">{acc.email}</span>
            </div>
            <p className="text-sm text-ink-soft leading-normal">{acc.description}</p>
            <p className="text-xs text-short-fg font-medium">{acc.restriction}</p>

            <div className="bg-sheet p-2 rounded-[4px] border border-rule flex items-center justify-between text-xs text-ink">
              <span>Password: <strong className="font-mono">{acc.password}</strong></span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-sm"
                disabled={isLoading}
                onClick={() => onFillCredentials(acc.email, acc.password)}
              >
                Use these credentials
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="text-sm"
                disabled={isLoading}
                onClick={() => onDirectLogin(acc.email, acc.password)}
              >
                Sign in as this role
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
