import { Building2, Globe, Link2, Mail, MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { LeadResponse } from "@/lib/types";

interface CompanySummaryCardProps {
  data: LeadResponse;
}

function prettyName(name: string): string {
  return name || "Unknown Company";
}

export function CompanySummaryCard({ data }: CompanySummaryCardProps) {
  const industry = data.industry || "Industry unavailable";
  const location = data.location || "Location unavailable";

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
            <a className="inline-flex items-center gap-2 text-muted hover:text-foreground" href={data.website} target="_blank" rel="noreferrer">
              <Globe className="h-4 w-4" /> Website
            </a>
            <a className="inline-flex items-center gap-2 text-muted hover:text-foreground" href={data.linkedin_company} target="_blank" rel="noreferrer">
              <Link2 className="h-4 w-4" /> LinkedIn
            </a>
            <p className="inline-flex items-center gap-2 text-muted">
              <Mail className="h-4 w-4" /> Domain: {data.email_domain || "unknown"}
            </p>
            <p className="inline-flex items-center gap-2 text-muted">
              <MapPin className="h-4 w-4" /> {location}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
