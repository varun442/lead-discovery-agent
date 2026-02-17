import type { ReactNode } from "react";
import { Briefcase, Code2, Users, UserRound } from "lucide-react";

import { ContactCard } from "@/components/contact-card";
import type { Contact } from "@/lib/types";

interface Group {
  key: string;
  label: string;
  icon: ReactNode;
  contacts: Contact[];
}

function classify(contact: Contact): string {
  const title = (contact.title || "").toLowerCase();
  if (/(recruit|hiring|talent|acquisition)/.test(title)) return "hiring";
  if (/(manager|director|head|lead|vp|chief|cto)/.test(title)) return "managers";
  if (/(software|engineer|developer|engineering|tech)/.test(title)) return "engineers";
  return "other";
}

function buildGroups(contacts: Contact[]): Group[] {
  const grouped: Record<string, Contact[]> = {
    managers: [],
    engineers: [],
    hiring: [],
    other: []
  };

  for (const contact of contacts) {
    grouped[classify(contact)].push(contact);
  }

  return [
    { key: "managers", label: "Managers & Leaders", icon: <Briefcase className="h-4 w-4" />, contacts: grouped.managers },
    { key: "engineers", label: "Software Engineers", icon: <Code2 className="h-4 w-4" />, contacts: grouped.engineers },
    { key: "hiring", label: "Hiring & Talent", icon: <Users className="h-4 w-4" />, contacts: grouped.hiring },
    { key: "other", label: "Other Roles", icon: <UserRound className="h-4 w-4" />, contacts: grouped.other }
  ].filter((group) => group.contacts.length > 0);
}

interface GroupedContactsProps {
  contacts: Contact[];
}

export function GroupedContacts({ contacts }: GroupedContactsProps) {
  const groups = buildGroups(contacts);
  let globalIndex = 0;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-muted">{group.icon}</span>
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{group.contacts.length}</span>
          </div>
          <div className="space-y-3">
            {group.contacts.map((contact) => {
              globalIndex += 1;
              return <ContactCard key={`${group.key}-${contact.linkedin}-${globalIndex}`} contact={contact} index={globalIndex} />;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
