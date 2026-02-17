import { classifyRole, confidenceDisplay, confidenceLabel, filterContacts } from "@/lib/lead-utils";
import type { Contact } from "@/lib/types";

const contacts: Contact[] = [
  {
    name: "Eng One",
    title: "Senior Software Engineer",
    linkedin: "https://linkedin.com/in/eng1",
    email: "eng1@example.com",
    email_confidence: "high",
  },
  {
    name: "Mgr One",
    title: "Engineering Manager",
    linkedin: "https://linkedin.com/in/mgr1",
    email: "mgr1@example.com",
    email_confidence: "inferred",
  },
  {
    name: "Rec One",
    title: "Technical Recruiter",
    linkedin: "https://linkedin.com/in/rec1",
    email: "rec1@example.com",
    email_confidence: "unknown",
  },
];

describe("lead-utils", () => {
  it("classifies roles correctly", () => {
    expect(classifyRole(contacts[0])).toBe("engineers");
    expect(classifyRole(contacts[1])).toBe("managers");
    expect(classifyRole(contacts[2])).toBe("recruiters");
  });

  it("maps confidence labels and display values", () => {
    expect(confidenceLabel("high")).toBe("verified");
    expect(confidenceLabel("inferred")).toBe("high");
    expect(confidenceLabel("unknown")).toBe("low");

    expect(confidenceDisplay("high")).toBe("Verified");
    expect(confidenceDisplay("inferred")).toBe("High Confidence");
    expect(confidenceDisplay("unknown")).toBe("Low Confidence");
  });

  it("filters by role and confidence", () => {
    expect(filterContacts(contacts, "engineers", "all")).toHaveLength(1);
    expect(filterContacts(contacts, "all", "verified")).toHaveLength(1);
    expect(filterContacts(contacts, "managers", "high")).toHaveLength(1);
    expect(filterContacts(contacts, "recruiters", "low")).toHaveLength(1);
    expect(filterContacts(contacts, "engineers", "low")).toHaveLength(0);
  });
});
