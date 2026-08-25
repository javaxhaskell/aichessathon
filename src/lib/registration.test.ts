import { describe, expect, it } from "vitest";

import { QUALIFICATION_DATES } from "./event";
import { MAX_CV_BYTES, RULES_VERSION, registrationSchema } from "./registration";

const base = {
  idempotencyKey: "7ad06b17-02b0-47d7-ab26-6b3bd936d9b8",
  fullName: "Ada Lovelace",
  email: "ADA@example.com",
  organization: "Analytical Engine University",
  roleOrCourse: "Computer Science",
  graduationYear: 2027,
  country: "United Kingdom",
  city: "London",
  githubPortfolioUrl: "https://github.com/ada",
  linkedinUrl: "",
  teamStatus: "looking_for_team" as const,
  teamName: null,
  teammates: [],
  availabilityOnline: true,
  availabilityLondon: true,
  rulesAccepted: true,
  privacyAccepted: true,
  technicalBackground: "Built a chess search agent.",
  accessibilityDietary: "",
  accessibilityConsent: false,
  cv: null,
  cvShareConsent: false,
  website: "",
};

describe("registrationSchema", () => {
  it("accepts and normalizes a valid solo registration", () => {
    const parsed = registrationSchema.parse(base);
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.linkedinUrl).toBeNull();
    expect(parsed.accessibilityDietary).toBeNull();
  });

  it("requires team details when the applicant already has a team", () => {
    const parsed = registrationSchema.safeParse({ ...base, teamStatus: "has_team", teamName: "", teammates: [] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors.teamName).toBeDefined();
  });

  it("accepts an existing team with teammate details", () => {
    const parsed = registrationSchema.safeParse({
      ...base,
      teamStatus: "has_team",
      teamName: "Deep Rooks",
      teammates: [{ fullName: "Grace Hopper", email: "grace@example.com" }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects CV-sharing consent without a CV", () => {
    const parsed = registrationSchema.safeParse({ ...base, cvShareConsent: true });
    expect(parsed.success).toBe(false);
  });

  it("accepts an optional PDF at exactly 10 MB without sharing consent", () => {
    const parsed = registrationSchema.safeParse({
      ...base,
      cv: { name: "ada-cv.pdf", size: MAX_CV_BYTES, type: "application/pdf" },
      cvShareConsent: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("requires explicit consent for participation-support details", () => {
    const parsed = registrationSchema.safeParse({
      ...base,
      accessibilityDietary: "Step-free access",
      accessibilityConsent: false,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-web URL schemes and missing confirmations", () => {
    const parsed = registrationSchema.safeParse({
      ...base,
      githubPortfolioUrl: "javascript:alert(1)",
      availabilityLondon: false,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("published event gates", () => {
  it("uses the confirmed qualifier dates and matching rules version", () => {
    expect(QUALIFICATION_DATES).toBe("7–11 September 2026");
    expect(RULES_VERSION).toBe("2026-08-25.v1");
  });
});
