import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, Actor } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/layout/AppHeader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect("/login");
  }

  // Load fresh user from database
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const actor: Actor = user;

  return (
    <div className="min-h-screen bg-chalk flex flex-col">
      <AppHeader actor={actor} />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
