"use client";

import { Shield, CheckCircle, Scissors, CheckCheck, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DemoCredentialPanelProps {
  onSelectCredential: (email: string, pass: string) => void;
  isLoading?: boolean;
}

const DEMO_PERSONAS = [
  {
    role: "cutting_supervisor",
    roleTitle: "Cutting Supervisor",
    name: "Nimali Perera",
    email: "supervisor@apparelflow.demo",
    password: "Supervisor@123",
    icon: Scissors,
    color: "blue",
    badgeVariant: "default" as const,
    duties: "Creates cutting orders from recipes, sets batch quantities, logs fabric yards.",
    restriction: "Cannot verify batches (separation of duties). Cannot access Sewing Queue.",
  },
  {
    role: "cutting_verifier",
    roleTitle: "Cutting Verifier",
    name: "Kasun Fernando",
    email: "verifier@apparelflow.demo",
    password: "Verifier@123",
    icon: CheckCheck,
    color: "emerald",
    badgeVariant: "green" as const,
    duties: "Quality gatekeeper. Counts physical parts per recipe, triggers traffic lights, approves/rejects batches.",
    restriction: "Cannot create orders or edit recipes. Cannot access Sewing Queue.",
  },
  {
    role: "sewing_supervisor",
    roleTitle: "Sewing Supervisor",
    name: "Dilani Silva",
    email: "sewing@apparelflow.demo",
    password: "Sewing@123",
    icon: Shirt,
    color: "purple",
    badgeVariant: "pending" as const,
    duties: "Receives verified batches on assembly floor, reviews verifier audit notes, starts sewing.",
    restriction: "Strictly blocked from seeing unverified, pending, or rejected cutting orders.",
  },
];

export function DemoCredentialPanel({
  onSelectCredential,
  isLoading,
}: DemoCredentialPanelProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <Shield className="h-5 w-5 text-blue-700" />
        <div>
          <h4 className="text-base font-bold text-slate-900">
            Evaluator Demo Credential Panel (RBAC)
          </h4>
          <p className="text-xs text-slate-600 font-medium">
            Click any persona to autofill credentials and sign in instantly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DEMO_PERSONAS.map((p) => {
          const Icon = p.icon;
          return (
            <Card
              key={p.role}
              className="border-2 border-slate-200 hover:border-blue-600 transition-all shadow-xs flex flex-col justify-between"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-4 w-4 text-slate-800" />
                    <span className="font-bold text-sm text-slate-900">{p.roleTitle}</span>
                  </div>
                  <Badge variant={p.badgeVariant} className="text-[10px] px-2 py-0">
                    {p.role}
                  </Badge>
                </div>
                <CardTitle className="text-sm text-slate-800 font-semibold">{p.name}</CardTitle>
                <CardDescription className="text-xs text-slate-600 font-mono">
                  {p.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="text-[11px] space-y-1.5 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                  <p className="text-slate-800 leading-tight">
                    <strong className="text-slate-900">Scope:</strong> {p.duties}
                  </p>
                  <p className="text-rose-900 font-medium leading-tight">
                    <strong>Guard:</strong> {p.restriction}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold border-slate-400 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-600"
                  disabled={isLoading}
                  onClick={() => onSelectCredential(p.email, p.password)}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1 text-blue-700" />
                  Sign In as {p.roleTitle.split(" ")[0]}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
