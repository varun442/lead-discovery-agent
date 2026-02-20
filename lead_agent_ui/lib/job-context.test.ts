import { describe, expect, it } from "vitest";

import { isJobContextComplete, isValidHttpUrl, validateJobContextDraft } from "@/lib/job-context";

describe("job-context", () => {
  it("requires title, company, and job URL", () => {
    expect(validateJobContextDraft({ title: "", company: "A", source_url: "https://a.com", text: "x".repeat(50) }).ok).toBe(false);
    expect(validateJobContextDraft({ title: "Engineer", company: "", source_url: "https://a.com", text: "x".repeat(50) }).ok).toBe(false);
    expect(validateJobContextDraft({ title: "Engineer", company: "A", source_url: "", text: "x".repeat(50) }).ok).toBe(false);
  });

  it("validates URL format", () => {
    expect(isValidHttpUrl("https://careers.example.com/job/1")).toBe(true);
    expect(isValidHttpUrl("http://example.com")).toBe(true);
    expect(isValidHttpUrl("example.com/job")).toBe(false);
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
  });

  it("requires sufficiently long job description", () => {
    const short = validateJobContextDraft({
      title: "Engineer",
      company: "Example",
      source_url: "https://example.com/job",
      text: "too short"
    });
    expect(short.ok).toBe(false);
    expect(short.error).toContain("at least 40 characters");
  });

  it("normalizes whitespace and passes valid values", () => {
    const valid = validateJobContextDraft({
      title: "  Frontend Engineer  ",
      company: "  Nutanix ",
      source_url: " https://careers.nutanix.com/job/123 ",
      text: ` ${"x".repeat(45)} `
    });
    expect(valid.ok).toBe(true);
    expect(valid.value.title).toBe("Frontend Engineer");
    expect(valid.value.company).toBe("Nutanix");
    expect(valid.value.source_url).toBe("https://careers.nutanix.com/job/123");
  });

  it("reports complete context correctly", () => {
    expect(
      isJobContextComplete({
        id: "1",
        title: "Frontend Engineer",
        company: "Nutanix",
        source_url: "https://careers.nutanix.com/job/123",
        text: "x".repeat(50),
        updated_at: new Date().toISOString()
      })
    ).toBe(true);

    expect(
      isJobContextComplete({
        id: "1",
        title: "Frontend Engineer",
        company: "Nutanix",
        text: "x".repeat(50),
        updated_at: new Date().toISOString()
      })
    ).toBe(false);
  });
});
