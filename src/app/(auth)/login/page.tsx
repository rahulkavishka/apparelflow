"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoCredentialPanel } from "@/components/domain/DemoCredentialPanel";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      toast.success("Signed in successfully.");

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
    <div className="min-h-screen bg-chalk flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 select-none">
      <div className="w-full max-w-4xl flex flex-col items-center space-y-6">
        {/* Brand Header: Logo without background + ApparelFlow Name */}
        <div className="flex flex-col items-center text-center space-y-2 mt-10">
          <Image
            src="/logo.png"
            alt="ApparelFlow Logo"
            width={56}
            height={56}
            className="w-14 h-14 object-contain"
            priority
          />
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">
              ApparelFlow
            </h1>
            <p className="text-sm text-ink-soft mt-0.5">
              Garment Manufacturing Quality & Flow Control
            </p>
          </div>
        </div>

        {/* Center Sign In Box */}
        <div className="w-full max-w-md rounded-sm border border-rule bg-paper p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-rule pb-3.5">
            <h2 className="text-xl sm:text-2xl font-bold text-ink">Sign in</h2>
            <p className="text-sm text-ink-soft mt-1">
              Enter your factory account credentials to access your terminal.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-sm border-l-4 border-l-short-edge border border-rule bg-short-bg p-3.5 text-sm font-medium text-short-fg"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4.5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-bold text-ink">
                Email address
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
                className="h-11 text-sm sm:text-base px-3.5"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-bold text-ink">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                  className="h-11 text-sm sm:text-base px-3.5 pr-11"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink p-1 rounded transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-paper" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Three Compact Demo Account Cards in a Row */}
        <div className="w-full max-w-4xl pt-1">
          <DemoCredentialPanel
            onFillCredentials={handleFillCredentials}
            onDirectLogin={performLogin}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
