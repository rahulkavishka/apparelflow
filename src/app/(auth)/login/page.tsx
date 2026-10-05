"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Factory, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DemoCredentialPanel } from "@/components/domain/DemoCredentialPanel";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to authenticate");
      }

      toast.success(`Welcome back, ${json.data.fullName}!`);

      // Route by role
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
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoCredential = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);

    // Auto trigger login for swift evaluator experience
    setIsLoading(true);
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: demoEmail, password: demoPass }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Login failed");
        toast.success(`Signed in as ${json.data.fullName} (${json.data.role})`);
        if (json.data.role === "cutting_verifier") {
          router.push("/verifier/queue");
        } else if (json.data.role === "sewing_supervisor") {
          router.push("/sewing/queue");
        } else {
          router.push("/supervisor/orders");
        }
        router.refresh();
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Login failed";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl px-4">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-700 text-white rounded-xl shadow-md mb-3">
            <Factory className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            ApparelFlow ERP
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Cutting Operations & Gatekeeper Verification Terminal
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-full">
            <span>Server-Enforced RBAC & Hard-Stop Quality Gate</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Login Card */}
          <div className="max-w-md mx-auto w-full">
            <Card className="border-2 border-slate-300 shadow-lg bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900">
                  Terminal Authentication
                </CardTitle>
                <CardDescription className="text-sm font-medium text-slate-600">
                  Enter your factory credentials or use the evaluator panel below.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Authentication Failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="supervisor@apparelflow.demo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 text-slate-900 font-semibold"
                        required
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 text-slate-900 font-semibold"
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button
                    type="submit"
                    className="w-full text-base font-bold h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? "Authenticating..." : "Sign In to Terminal"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Evaluator Demo Credential Panel */}
          <div className="bg-white p-6 rounded-xl border-2 border-slate-300 shadow-md">
            <DemoCredentialPanel
              onSelectCredential={handleSelectDemoCredential}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
