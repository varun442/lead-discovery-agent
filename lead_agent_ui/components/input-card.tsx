import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface InputCardProps {
  website: string;
  linkedin: string;
  isLoading: boolean;
  onWebsiteChange: (value: string) => void;
  onLinkedinChange: (value: string) => void;
  onSubmit: () => void;
}

export function InputCard({
  website,
  linkedin,
  isLoading,
  onWebsiteChange,
  onLinkedinChange,
  onSubmit
}: InputCardProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">Website URL</label>
          <Input
            value={website}
            onChange={(event) => onWebsiteChange(event.target.value)}
            placeholder="https://stripe.com"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">LinkedIn Company URL</label>
          <Input
            value={linkedin}
            onChange={(event) => onLinkedinChange(event.target.value)}
            placeholder="https://linkedin.com/company/stripe"
          />
        </div>
        <Button onClick={onSubmit} isLoading={isLoading} className="w-full gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {isLoading ? "Discovering contacts..." : "Discover Leads"}
        </Button>
      </div>
    </Card>
  );
}
