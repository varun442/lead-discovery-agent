import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface CompanyInputCardProps {
  website: string;
  linkedin: string;
  autoDetectLinkedin: boolean;
  isLoading: boolean;
  onWebsiteChange: (value: string) => void;
  onLinkedinChange: (value: string) => void;
  onAutoDetectChange: (value: boolean) => void;
  onSubmit: () => void;
}

export function CompanyInputCard({
  website,
  linkedin,
  autoDetectLinkedin,
  isLoading,
  onWebsiteChange,
  onLinkedinChange,
  onAutoDetectChange,
  onSubmit
}: CompanyInputCardProps) {
  return (
    <Card className="rounded-2xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">Step 1: Enter Company Details</h2>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">Website URL</label>
          <Input value={website} onChange={(event) => onWebsiteChange(event.target.value)} placeholder="https://company.com" />
          <p className="mt-1 text-xs text-muted">Company homepage URL</p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">LinkedIn Company URL</label>
          <Input
            value={linkedin}
            onChange={(event) => onLinkedinChange(event.target.value)}
            placeholder="https://linkedin.com/company/company-name"
          />
          <p className="mt-1 text-xs text-muted">Official company LinkedIn page</p>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={autoDetectLinkedin}
            onChange={(event) => onAutoDetectChange(event.target.checked)}
            className="h-4 w-4 rounded border-border bg-black/50"
          />
          Auto-detect LinkedIn from website
        </label>

        <Button onClick={onSubmit} isLoading={isLoading} className="w-full gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {isLoading ? "Discovering contacts..." : "Discover Leads"}
        </Button>
      </div>
    </Card>
  );
}
