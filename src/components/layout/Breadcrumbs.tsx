"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return [];

    const items: BreadcrumbItem[] = [];

    const formatIdLabel = (rawId: string, fallback: string) => {
      if (rawId.startsWith("CUT-")) return rawId;
      return fallback;
    };

    if (segments[0] === "supervisor") {
      items.push({ label: "Cutting orders", href: "/supervisor/orders" });
      if (segments[1] === "orders" && segments[2]) {
        items.push({ label: formatIdLabel(segments[2], "Order details") });
      } else if (segments[1] === "recipes") {
        items.push({ label: "Recipes", href: "/supervisor/recipes" });
      }
    } else if (segments[0] === "verifier") {
      if (segments[1] === "queue") {
        items.push({ label: "Verification queue", href: "/verifier/queue" });
      } else if (segments[1] === "history") {
        items.push({ label: "Verification history", href: "/verifier/history" });
      } else if (segments[1] === "orders" && segments[2]) {
        items.push({ label: "Verification queue", href: "/verifier/queue" });
        items.push({ label: formatIdLabel(segments[2], "Inspection terminal") });
      } else if (segments[1] === "recipes") {
        items.push({ label: "Recipes", href: "/verifier/recipes" });
      }
    } else if (segments[0] === "sewing") {
      items.push({ label: "Sewing queue", href: "/sewing/queue" });
      if (segments[1] === "orders" && segments[2]) {
        items.push({ label: formatIdLabel(segments[2], "Batch traveler") });
      }
    }

    return items;
  };

  const crumbs = getBreadcrumbs();
  const isDetailPage = crumbs.length > 1;

  if (crumbs.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
      {isDetailPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="h-7 px-2 text-xs font-bold text-ink-soft hover:text-ink hover:bg-sheet flex items-center gap-1"
          aria-label="Go back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back</span>
        </Button>
      )}

      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <React.Fragment key={crumb.label}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-rule shrink-0" />}
              {isLast || !crumb.href ? (
                <span className="font-bold text-ink truncate max-w-22.5 sm:max-w-35 md:max-w-50" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-ink hover:underline truncate max-w-20 sm:max-w-30"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}
