"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-8 max-w-[640px]">
      <ErrorState
        title="This page couldn't load."
        description="Something went wrong on our side. Try again. If it keeps happening, go back to your queue."
        action={
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={reset}>
              Try again
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.history.back()}>
              Go back
            </Button>
          </div>
        }
      />
    </div>
  );
}
