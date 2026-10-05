import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { roleHome } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * Entry point. Sends a signed-in user to their role's home and everyone else to /login.
 * Convenience only: every page and API still enforces access itself.
 */
export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(roleHome(user.role));
}
