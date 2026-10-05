import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { roleHome } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * Already signed in? Skip the login screen. A stale or forged cookie simply fails
 * verification here and the login page renders, so there is no redirect loop.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(roleHome(user.role));
  return <>{children}</>;
}
