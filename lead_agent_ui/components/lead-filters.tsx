import type { ConfidenceFilter, RoleFilter } from "@/lib/lead-utils";

interface LeadFiltersProps {
  roleFilter: RoleFilter;
  confidenceFilter: ConfidenceFilter;
  roleCounts: Record<RoleFilter, number>;
  onRoleChange: (value: RoleFilter) => void;
  onConfidenceChange: (value: ConfidenceFilter) => void;
}

function Pill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active ? "border-accent bg-accent/20 text-foreground" : "border-border text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function LeadFilters({ roleFilter, confidenceFilter, roleCounts, onRoleChange, onConfidenceChange }: LeadFiltersProps) {
  const roleTabs: Array<{ key: RoleFilter; label: string }> = [
    { key: "managers", label: "Managers" },
    { key: "engineers", label: "Engineers" },
    { key: "recruiters", label: "Recruiters" }
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Contact roles</p>
          <div className="flex flex-wrap gap-2">
            {roleTabs.map((tab) => (
              <Pill
                key={tab.key}
                active={roleFilter === tab.key}
                label={`${tab.label} (${roleCounts[tab.key]})`}
                onClick={() => onRoleChange(tab.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Email confidence</p>
          <div className="flex flex-wrap gap-2">
            <Pill active={confidenceFilter === "all"} label="All" onClick={() => onConfidenceChange("all")} />
            <Pill active={confidenceFilter === "verified"} label="Verified" onClick={() => onConfidenceChange("verified")} />
            <Pill active={confidenceFilter === "high"} label="High" onClick={() => onConfidenceChange("high")} />
            <Pill active={confidenceFilter === "low"} label="Low" onClick={() => onConfidenceChange("low")} />
          </div>
        </div>
      </div>
    </div>
  );
}
