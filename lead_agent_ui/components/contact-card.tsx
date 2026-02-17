import { Linkedin, Mail } from "lucide-react";
import { motion } from "framer-motion";

import { ConfidenceBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Contact } from "@/lib/types";

interface ContactCardProps {
  contact: Contact;
  index: number;
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function ContactCard({ contact, index }: ContactCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <Card className="group p-4 transition hover:-translate-y-0.5 hover:border-zinc-600">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-black/60 text-xs font-semibold text-foreground">
              {initials(contact.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{contact.name}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{contact.title}</p>
              <a
                href={contact.linkedin}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
              >
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
            </div>
          </div>
          <div className="text-right">
            <p className="inline-flex items-center gap-1 text-xs text-foreground">
              <Mail className="h-3.5 w-3.5" />
              {contact.email || "No email found"}
            </p>
            <div className="mt-2 flex justify-end">
              <ConfidenceBadge confidence={contact.email_confidence} />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
