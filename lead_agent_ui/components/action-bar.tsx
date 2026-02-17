import { Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { Contact } from "@/lib/types";

interface ActionBarProps {
  contacts: Contact[];
  unlockedCount: number;
  isGenerating: boolean;
}

export function ActionBar({ contacts, unlockedCount, isGenerating }: ActionBarProps) {
  return (
    <Card className="sticky top-20 z-10 rounded-2xl border-border/80 bg-card/95 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{contacts.length} Leads Found</p>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{unlockedCount} emails unlocked via in-app outreach</span>
          {isGenerating ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Generating draft...
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
