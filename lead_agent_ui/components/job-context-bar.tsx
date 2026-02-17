import { Briefcase, FileText, Pencil, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { JobDescriptionContext } from "@/lib/types";

interface JobContextBarProps {
  activeJob: JobDescriptionContext | null;
  onOpen: () => void;
  onClear: () => void;
}

export function JobContextBar({ activeJob, onOpen, onClear }: JobContextBarProps) {
  return (
    <Card className="rounded-2xl border-border/80 bg-card/95 p-4 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted">Current Job Context</p>
          {activeJob ? (
            <div className="mt-2 space-y-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {activeJob.title || "Untitled role"}
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-muted">
                <Briefcase className="h-3.5 w-3.5" />
                {activeJob.company || "Company not set"}
              </p>
              <p className="inline-flex items-center gap-1 text-xs text-muted">
                <FileText className="h-3.5 w-3.5" />
                JD ready
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">No active JD. Set one to send personalized emails in one click.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpen}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            {activeJob ? "Edit JD" : "Set JD"}
          </button>
          {activeJob ? (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
