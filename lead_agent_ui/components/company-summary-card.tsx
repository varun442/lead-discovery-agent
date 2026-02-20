import { Building2, Globe, Link2, MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { LeadResponse } from "@/lib/types";

interface CompanySummaryCardProps {
  data: LeadResponse;
}

function prettyName(name: string): string {
  return name || "Unknown Company";
}

function cleanLocation(raw?: string): string {
  const value = (raw || "").trim();
  if (!value) return "Location unavailable";
  const withoutEllipsis = value.split("...")[0]?.split("…")[0] || value;
  const withoutTrail = withoutEllipsis.split(" - ")[0]?.split(" | ")[0] || withoutEllipsis;
  const cleaned = withoutTrail.trim().replace(/,\s*$/, "");
  return cleaned || "Location unavailable";
}

export function CompanySummaryCard({ data }: CompanySummaryCardProps) {
  const industry = data.industry || "Industry unavailable";
  const location = cleanLocation(data.location);

  return (
    <Card className="rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-black/40 text-muted">
          {data.company_logo ? (
            <img src={data.company_logo} alt={`${prettyName(data.company)} logo`} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{prettyName(data.company)}</h2>
          <p className="text-sm text-muted">{industry} • {location}</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <a
              className="inline-flex min-w-0 items-center gap-2 text-muted hover:text-foreground"
              href={data.website}
              target="_blank"
              rel="noreferrer"
              title={data.website}
            >
              <Globe className="h-4 w-4 shrink-0" /> <span className="truncate">{data.website}</span>
            </a>
            <a
              className="inline-flex min-w-0 items-center gap-2 text-muted hover:text-foreground"
              href={data.linkedin_company}
              target="_blank"
              rel="noreferrer"
              title={data.linkedin_company}
            >
              <Link2 className="h-4 w-4 shrink-0" /> <span className="truncate">{data.linkedin_company}</span>
            </a>
            <p className="inline-flex items-center gap-2 text-muted">
              <MapPin className="h-4 w-4" /> {location}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
