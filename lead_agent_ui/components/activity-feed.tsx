import { Activity, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { Card } from "@/components/ui/card";

export type ActivityKind = "info" | "success" | "error";

export interface ActivityItem {
  id: number;
  message: string;
  kind: ActivityKind;
  timestamp: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  isRunning: boolean;
}

function iconFor(kind: ActivityKind) {
  if (kind === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (kind === "error") return <XCircle className="h-4 w-4 text-red-400" />;
  return <Clock3 className="h-4 w-4 text-blue-300" />;
}

export function ActivityFeed({ items, isRunning }: ActivityFeedProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Agent Activity</h3>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">
          {isRunning ? "Running" : "Idle"}
        </span>
      </div>

      <div className="max-h-72 space-y-3 overflow-auto pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted">Run a search to see step-by-step agent activity.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 border-l border-border/80 pl-3">
              <div className="mt-0.5 -ml-[18px] rounded-full bg-card p-[1px]">{iconFor(item.kind)}</div>
              <div className="min-w-0">
                <p className="text-sm text-foreground">{item.message}</p>
                <p className="text-xs text-muted">{item.timestamp}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
