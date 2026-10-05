/**
 * Role metadata shared by the login page, root redirect, app shell and command palette.
 * Pure data: safe to import from both server and client code. Never a security boundary.
 */
export type RoleKey = "cutting_supervisor" | "cutting_verifier" | "sewing_supervisor";

export const ROLE_HOME: Record<RoleKey, string> = {
  cutting_supervisor: "/supervisor/orders",
  cutting_verifier: "/verifier/queue",
  sewing_supervisor: "/sewing/queue",
};

export const ROLE_TITLE: Record<RoleKey, string> = {
  cutting_supervisor: "Cutting supervisor",
  cutting_verifier: "Cutting verifier",
  sewing_supervisor: "Sewing supervisor",
};

export function roleHome(role: string): string {
  return ROLE_HOME[role as RoleKey] ?? "/login";
}

export function roleTitle(role: string): string {
  return ROLE_TITLE[role as RoleKey] ?? role;
}

export interface DemoAccount {
  role: RoleKey;
  label: string;
  email: string;
  password: string;
}

/** Public demo accounts (documented in the README). */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "cutting_supervisor", label: "Cutting supervisor (Nimali)", email: "supervisor@apparelflow.demo", password: "Supervisor@123" },
  { role: "cutting_verifier", label: "Cutting verifier (Kasun)", email: "verifier@apparelflow.demo", password: "Verifier@123" },
  { role: "sewing_supervisor", label: "Sewing supervisor (Dilani)", email: "sewing@apparelflow.demo", password: "Sewing@123" },
];
