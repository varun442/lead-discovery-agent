import { SearchX } from "lucide-react";

import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  mode?: "initial" | "no_results";
}

export function EmptyState({ mode = "no_results" }: EmptyStateProps) {
  return (
    <Card className="rounded-2xl p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-black/50 text-muted">
        <SearchX className="h-5 w-5" />
      </div>
      {mode === "initial" ? (
        <>
          <h3 className="text-base font-medium text-foreground">No leads discovered yet.</h3>
          <p className="mt-1 text-sm text-muted">Enter a company website and click “Discover Leads.”</p>
        </>
      ) : (
        <>
          <h3 className="text-base font-medium text-foreground">No leads found.</h3>
          <p className="mt-1 text-sm text-muted">Try another company or check the URLs.</p>
        </>
      )}
    </Card>
  );
}
