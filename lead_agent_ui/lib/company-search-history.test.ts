import { extractSearchDomain, formatHistoryTimestamp, normalizeHistoryPayload, normalizeResultSnapshot } from "@/lib/company-search-history";

describe("company-search-history helpers", () => {
  it("extractSearchDomain parses valid URL host", () => {
    expect(extractSearchDomain("https://www.Stripe.com/company")).toBe("stripe.com");
  });

  it("extractSearchDomain supports missing protocol", () => {
    expect(extractSearchDomain("linkedin.com/company/stripe")).toBe("linkedin.com");
  });

  it("extractSearchDomain falls back for malformed input", () => {
    expect(extractSearchDomain("not a valid url/path")).toBe("not a valid url");
  });

  it("normalizeHistoryPayload sanitizes status, counts, and optional fields", () => {
    const payload = normalizeHistoryPayload({
      website_url: " https://www.nutanix.com/jobs ",
      linkedin_url: "   ",
      company_name: "  Nutanix  ",
      contacts_count: 17.9,
      status: "error",
      error_message: "  timeout  ",
      result_snapshot: {
        company: "Nutanix",
        website: "https://www.nutanix.com/jobs",
        email_domain: "nutanix.com",
        linkedin_company: "https://linkedin.com/company/nutanix",
        contacts: []
      }
    });

    expect(payload.search_domain).toBe("nutanix.com");
    expect(payload.website_url).toBe("https://www.nutanix.com/jobs");
    expect(payload.linkedin_url).toBeNull();
    expect(payload.company_name).toBe("Nutanix");
    expect(payload.contacts_count).toBe(17);
    expect(payload.status).toBe("error");
    expect(payload.error_message).toBe("timeout");
    expect(payload.result_snapshot?.company).toBe("Nutanix");
  });

  it("normalizeResultSnapshot returns null for unsupported input", () => {
    expect(normalizeResultSnapshot(null)).toBeNull();
    expect(normalizeResultSnapshot("bad")).toBeNull();
    expect(normalizeResultSnapshot(10)).toBeNull();
  });

  it("formatHistoryTimestamp returns fallback for invalid timestamps", () => {
    expect(formatHistoryTimestamp("invalid-date")).toBe("Unknown");
  });
});
