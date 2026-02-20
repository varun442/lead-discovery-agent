import { describe, expect, it } from "vitest";

import { normalizeDomainValue, resolveSearchDomain, shouldResetOnCompanyChange } from "@/lib/search-context";

describe("search-context", () => {
  it("should reset when company domain changes", () => {
    expect(shouldResetOnCompanyChange("stripe.com", "shopify.com")).toBe(true);
  });

  it("should not reset on same company rerun", () => {
    expect(shouldResetOnCompanyChange("stripe.com", "stripe.com")).toBe(false);
    expect(shouldResetOnCompanyChange("Stripe.com", " stripe.com ")).toBe(false);
  });

  it("normalizes domains safely", () => {
    expect(normalizeDomainValue("  EXAMPLE.COM ")).toBe("example.com");
    expect(normalizeDomainValue(null)).toBe("");
  });

  it("resolves domain from explicit search domain first", () => {
    const domain = resolveSearchDomain({
      searchDomain: "HealthStream.com",
      result: {
        company: "HealthStream",
        website: "https://www.healthstream.com",
        email_domain: "ignored.com",
        linkedin_company: "https://linkedin.com/company/healthstream",
        contacts: []
      }
    });
    expect(domain).toBe("healthstream.com");
  });

  it("falls back to result email_domain and website parsing", () => {
    const fromResultDomain = resolveSearchDomain({
      result: {
        company: "Nutanix",
        website: "https://www.nutanix.com",
        email_domain: "nutanix.com",
        linkedin_company: "https://linkedin.com/company/nutanix",
        contacts: []
      }
    });
    expect(fromResultDomain).toBe("nutanix.com");

    const fromWebsite = resolveSearchDomain({
      website: "healthstream.com/careers"
    });
    expect(fromWebsite).toBe("healthstream.com");
  });
});
