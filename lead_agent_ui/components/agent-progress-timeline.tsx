import { CheckCircle2, Clock3, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";

interface AgentProgressTimelineProps {
  messages: string[];
  isRunning: boolean;
  totalLeads: number;
}

type StepStatus = "pending" | "in_progress" | "completed";

const STEPS = [
  { key: "company", label: "Company identified" },
  { key: "contacts", label: "Contacts discovered" },
  { key: "emails", label: "Emails generated" },
  { key: "grouped", label: "Leads grouped by role" }
] as const;

function isStepComplete(stepKey: string, haystack: string): boolean {
  if (stepKey === "company") return /extracted domain|resolved company|company identified|request accepted/.test(haystack);
  if (stepKey === "contacts") return /collected .*candidate|received .*contacts|contacts discovered/.test(haystack);
  if (stepKey === "emails") return /hunter returned|inferred|email|built .*contact/.test(haystack);
  return /segregated contacts|grouped by role/.test(haystack);
}

function stepStatuses(messages: string[], isRunning: boolean): StepStatus[] {
  const haystack = messages.join(" ").toLowerCase();
  const statuses: StepStatus[] = STEPS.map((step) => (isStepComplete(step.key, haystack) ? "completed" : "pending"));

  if (isRunning) {
    const firstPending = statuses.findIndex((s) => s === "pending");
    if (firstPending >= 0) statuses[firstPending] = "in_progress";
  }

  return statuses;
}

function statusIcon(status: StepStatus) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "in_progress") return <Loader2 className="h-4 w-4 animate-spin text-blue-300" />;
  return <Clock3 className="h-4 w-4 text-zinc-500" />;
}

export function AgentProgressTimeline({ messages, isRunning, totalLeads }: AgentProgressTimelineProps) {
  const statuses = stepStatuses(messages, isRunning);
  const completedCount = statuses.filter((s) => s === "completed").length;
  const percent = Math.round((completedCount / STEPS.length) * 100);

  return (
    <Card className="rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Agent Progress</h3>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">{isRunning ? "Running" : "Idle"}</span>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Progress: {totalLeads} leads found</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-black/50">
          <div className="h-2 rounded-full bg-gradient-to-r from-accent to-violet-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, idx) => (
          <div key={step.key} className="flex items-start gap-3">
            <div className="mt-0.5">{statusIcon(statuses[idx])}</div>
            <p className={`text-sm ${statuses[idx] === "pending" ? "text-muted" : "text-foreground"}`}>{step.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
