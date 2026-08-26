import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CV_SHARING_PUBLIC_COPY } from "./registration";
import { getPrivacyNotice, privacyNoticeSnapshot } from "./privacy-notice";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

const publicCopyPaths = [
  "src/app/page.tsx",
  "src/components/how-it-works.tsx",
  "src/components/faq.tsx",
  "src/lib/privacy-notice.ts",
  "src/app/privacy/page.tsx",
  "src/app/register/page.tsx",
  "src/components/registration-form.tsx",
  "src/app/register/confirmation/page.tsx",
  "src/lib/confirmation-email.ts",
];

const automaticSharingClaims = [
  /Their CVs are shared with Optiver/i,
  /CVs? are shared with Optiver/i,
  /Optiver receives CVs of the top 50/i,
  /automatically shared with Optiver/i,
  /top[- ]50 finalist.?s CV is automatically/i,
];

describe("public CV-sharing copy", () => {
  it("does not say or imply that top-50 CVs are automatically shared with Optiver", () => {
    const renderedNotice = privacyNoticeSnapshot();
    for (const path of publicCopyPaths) {
      const source = read(path);
      for (const pattern of automaticSharingClaims) {
        expect(source, `${path} matched ${pattern}`).not.toMatch(pattern);
      }
    }
    for (const pattern of automaticSharingClaims) {
      expect(renderedNotice, `privacy snapshot matched ${pattern}`).not.toMatch(pattern);
    }
  });

  it("includes the replacement CV-choice sentence on homepage format, FAQ, privacy, and register copy", () => {
    expect(read("src/components/how-it-works.tsx")).toContain("CV_SHARING_PUBLIC_COPY");
    expect(read("src/components/faq.tsx")).toContain("CV_SHARING_PUBLIC_COPY");
    expect(read("src/components/registration-form.tsx")).toContain("CV_SHARING_PUBLIC_COPY");
    expect(privacyNoticeSnapshot()).toContain(CV_SHARING_PUBLIC_COPY);
  });
});

describe("registration CV-interest checkbox", () => {
  it("is optional, unchecked by default, and not required in the form", () => {
    const form = read("src/components/registration-form.tsx");
    expect(form).toContain("const [cvConsent, setCvConsent] = useState(false)");
    expect(form).toContain("checked={cvConsent}");
    expect(form).toContain("{CV_CONSENT_TEXT}");
    expect(form).not.toMatch(/id="cvShareConsent"[^>]*\srequired/);
    expect(form).not.toMatch(/name="cvShareConsent"[^>]*\srequired/);
  });
});

describe("privacy page", () => {
  it("renders the privacy notice in server HTML rather than only behind a client expand", () => {
    const page = read("src/app/privacy/page.tsx");
    expect(page).not.toMatch(/^["']use client["']/m);
    expect(page).toContain("getPrivacyNotice");
    expect(page).toContain("<article");
    expect(page).toContain("<section");
    expect(page).toContain("<p>");
    expect(page).not.toContain("hidden=");
    expect(getPrivacyNotice().length).toBeGreaterThan(0);
    for (const section of getPrivacyNotice()) {
      expect(privacyNoticeSnapshot()).toContain(section.title);
      for (const paragraph of section.paragraphs) {
        expect(privacyNoticeSnapshot()).toContain(paragraph);
      }
    }
  });

  it("identifies finalist-stage reconfirmation before any Optiver CV transfer", () => {
    const notice = privacyNoticeSnapshot();
    expect(notice).toMatch(/finalist-stage reconfirmation/i);
    expect(notice).toMatch(/before any Optiver CV transfer/i);
    expect(notice).toMatch(/does not automatically authorise sharing your CV with Optiver/i);
  });
});

describe("future platform data contract", () => {
  it("exists and is linked from README", () => {
    const contract = read("docs/future-platform-data-contract.md");
    const readme = read("README.md");
    expect(contract).toMatch(/does \*\*not\*\* automatically authorise/i);
    expect(contract).toMatch(/separate, explicit, recorded confirmation/i);
    expect(readme).toContain("docs/future-platform-data-contract.md");
  });
});
