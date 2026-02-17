import { cn } from "@/lib/utils";
import type { EmailConfidence } from "@/lib/types";

interface BadgeProps {
  confidence: EmailConfidence;
}

const mapping: Record<EmailConfidence, string> = {
  high: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  inferred: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  unknown: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
};

export function ConfidenceBadge({ confidence }: BadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs capitalize", mapping[confidence])}>
      {confidence}
    </span>
  );
}
