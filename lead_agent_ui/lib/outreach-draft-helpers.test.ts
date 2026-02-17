import {
  OPENING_LINE_CANDIDATES,
  extractDraftText,
  isMissingRelationError,
  parseDraft,
  pickOpeningLine,
  personalizeTemplate,
  toNumber,
} from "@/lib/outreach-draft-helpers";

describe("outreach-draft-helpers", () => {
  it("extractDraftText uses output_text when present", () => {
    const text = extractDraftText({ output_text: " hello world " });
    expect(text).toBe("hello world");
  });

  it("extractDraftText reads output content chunks when output_text is absent", () => {
    const text = extractDraftText({
      output: [
        {
          content: [
            { type: "output_text", text: "line one" },
            { type: "output_text", text: "line two" },
          ],
        },
      ],
    });
    expect(text).toBe("line one\nline two");
  });

  it("parseDraft splits subject and body", () => {
    const parsed = parseDraft("Subject: Hello there\n\nBody line", "Fallback");
    expect(parsed.subject).toBe("Hello there");
    expect(parsed.body).toBe("Body line");
  });

  it("parseDraft falls back when subject line not present", () => {
    const parsed = parseDraft("No explicit subject body", "Fallback Subject");
    expect(parsed.subject).toBe("Fallback Subject");
    expect(parsed.body).toBe("No explicit subject body");
  });

  it("pickOpeningLine is deterministic for same seed", () => {
    const first = pickOpeningLine("seed-123");
    const second = pickOpeningLine("seed-123");
    expect(first).toBe(second);
    expect(OPENING_LINE_CANDIDATES).toContain(first);
  });

  it("personalizeTemplate replaces placeholders and legacy opening line", () => {
    const out = personalizeTemplate({
      subjectTemplate: "Skilled [JOB_ROLE] eager to join [COMPANY_NAME]",
      bodyTemplate:
        "Hey [Recruiter's Name],\n\nI know you're busy with your important work, so I'll get straight to the point without wasting your time.\n\nRole: [JOB_ROLE] @ [COMPANY_NAME]",
      contactName: "Amitesh M.",
      contactTitle: "Director Engineering",
      companyName: "Nutanix",
      jobRole: "Frontend Engineer",
      openingLine: "I'll keep this short because I know your time is valuable.",
    });

    expect(out.subject).toContain("Frontend Engineer");
    expect(out.subject).toContain("Nutanix");
    expect(out.body).toContain("Hey Amitesh M.");
    expect(out.body).toContain("I'll keep this short because I know your time is valuable.");
    expect(out.body).not.toContain("I know you're busy with your important work");
  });

  it("toNumber handles number, string and null", () => {
    expect(toNumber(3)).toBe(3);
    expect(toNumber("2.5")).toBe(2.5);
    expect(toNumber(null)).toBe(0);
  });

  it("isMissingRelationError matches relation-not-exist style errors", () => {
    expect(isMissingRelationError('relation "public.foo" does not exist')).toBe(true);
    expect(isMissingRelationError("random failure")).toBe(false);
  });
});
