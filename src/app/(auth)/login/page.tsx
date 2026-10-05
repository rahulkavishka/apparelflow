"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoCredentialPanel } from "@/components/domain/DemoCredentialPanel";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Email or password is incorrect.");
      }

      toast.success("Signed in.");

      const role = json.data.role;
      if (role === "cutting_verifier") {
        router.push("/verifier/queue");
      } else if (role === "sewing_supervisor") {
        router.push("/sewing/queue");
      } else {
        router.push("/supervisor/orders");
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Email or password is incorrect.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter both email and password.");
      return;
    }
    performLogin(email, password);
  };

  const handleFillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-chalk flex flex-col">
      {/* 56px vat-deep band header */}
      <header className="h-14 bg-vat-deep px-6 flex items-center shrink-0">
        <div className="max-w-[1200px] w-full mx-auto flex items-baseline gap-3">
          <span className="font-display text-2xl font-semibold text-paper tracking-normal">
            ApparelFlow
          </span>
          <span className="text-sm text-vat-tint font-normal">
            Cutting gate
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Sign In Form */}
          <div className="rounded-[4px] border border-rule bg-paper p-6 space-y-6">
            <div className="border-b border-rule pb-3">
              <h1 className="text-xl font-bold text-ink">Sign in</h1>
              <p className="text-sm text-ink-soft mt-1">
                Enter your factory account credentials to access your terminal.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-[4px] border-l-4 border-l-short-edge border border-rule bg-short-bg p-3 text-sm text-short-fg"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-base font-bold text-ink">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="supervisor@apparelflow.demo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-base font-bold text-ink">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-base font-bold"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </div>

          {/* Demo Credential Panel */}
          <div>
            <DemoCredentialPanel
              onFillCredentials={handleFillCredentials}
              onDirectLogin={performLogin}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
