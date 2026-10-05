import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-chalk px-6 py-16">
      <div className="max-w-140 space-y-3">
        <h1 className="font-display text-3xl font-semibold text-ink">Page not found</h1>
        <p className="text-base text-ink-soft">
          This address does not exist, or your role cannot open it.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button variant="primary">Go to my home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
