import { Briefcase, Code2, Users } from "lucide-react";

import { LeadCard } from "@/components/lead-card";
import { classifyRole, roleDisplay } from "@/lib/lead-utils";
import type { Contact } from "@/lib/types";

interface LeadListProps {
  contacts: Contact[];
  sendStates: Record<string, "idle" | "sending" | "sent" | "error">;
  onSendEmail: (contact: Contact) => void;
  activeSendKey: string | null;
  unlockedEmails: Record<string, true>;
}

function contactKey(contact: Contact): string {
  return contact.linkedin || contact.email || contact.name;
}

export function LeadList({ contacts, sendStates, onSendEmail, activeSendKey, unlockedEmails }: LeadListProps) {
  const grouped = {
    managers: contacts.filter((c) => classifyRole(c) === "managers"),
    engineers: contacts.filter((c) => classifyRole(c) === "engineers"),
    recruiters: contacts.filter((c) => classifyRole(c) === "recruiters")
  };

  const sections = [
    { key: "managers", icon: <Briefcase className="h-4 w-4" />, items: grouped.managers },
    { key: "engineers", icon: <Code2 className="h-4 w-4" />, items: grouped.engineers },
    { key: "recruiters", icon: <Users className="h-4 w-4" />, items: grouped.recruiters }
  ] as const;

  let index = 0;

  return (
    <div className="space-y-6">
      {sections.map((section) =>
        section.items.length ? (
          <section key={section.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-muted">{section.icon}</span>
              <h3 className="text-xl font-semibold text-foreground">{roleDisplay(section.key)}</h3>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{section.items.length}</span>
            </div>
            <div className="space-y-3">
              {section.items.map((contact) => {
                index += 1;
                return (
                  <LeadCard
                    key={`${section.key}-${contact.linkedin}-${index}`}
                    contact={contact}
                    index={index}
                    onSendEmail={onSendEmail}
                    sendState={sendStates[contactKey(contact)] || "idle"}
                    disableSend={Boolean(activeSendKey && activeSendKey !== contactKey(contact))}
                    isEmailUnlocked={Boolean(unlockedEmails[contactKey(contact)])}
                  />
                );
              })}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
