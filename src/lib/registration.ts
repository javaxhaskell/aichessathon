import { z } from "zod";

import { QUALIFICATION_DATES } from "./event";

export const SITE_URL = "https://aichessathon.com";
export const CONTACT_EMAIL = "events@aichessathon.com";
export const REGISTRATION_COUNTRY = "United Kingdom";
export const CV_BUCKET = "registration-cvs";
export const MAX_CV_BYTES = 10 * 1024 * 1024;
export const PRIVACY_NOTICE_VERSION = "2026-08-26.v2";
export const RULES_VERSION = "2026-08-25.v1";
export const CV_CONSENT_VERSION = "2026-08-26.v1";
export const ACCESSIBILITY_CONSENT_VERSION = "2026-08-24.v1";

export const PRIVACY_CONSENT_TEXT = "I have read the privacy notice.";
export const CV_CONSENT_TEXT =
  "I would like AI Chessathon to contact me if I qualify for the London final so that I can choose whether to share my CV with Optiver for recruitment-related opportunities. This is optional and will not affect my eligibility, ranking, judging, selection, attendance, or prizes.";
export const CV_SHARING_PUBLIC_COPY =
  "CV upload is optional. If you qualify for the London final, you may choose whether to share your CV with Optiver for recruitment-related opportunities. This choice does not affect eligibility, ranking, judging, selection, attendance, or prizes.";
export const ACCESSIBILITY_CONSENT_TEXT =
  "I explicitly consent to AI Chessathon using the accessibility or dietary information I provide only to support my participation.";

const optionalText = (maximum: number) =>
  z.union([z.string().trim().max(maximum), z.null()]).transform((value) => value || null);

const safeUrl = (label: string, optional = false) => {
  const schema = z.string().trim().max(500).refine((value) => {
    if (optional && value === "") return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, `${label} must be a valid web address.`);
  return optional ? schema.transform((value) => value || null) : schema;
};

const teammateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your teammate’s name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid teammate email.").max(254),
}).strict();

const cvSchema = z.object({
  name: z.string().trim().min(1).max(255).refine((name) => name.toLowerCase().endsWith(".pdf"), "CV must use a .pdf filename."),
  size: z.number().int().positive().max(MAX_CV_BYTES, "CV must be 10 MB or smaller."),
  type: z.literal("application/pdf", { error: "CV must be a PDF." }),
}).strict();

export const registrationSchema = z.object({
  idempotencyKey: z.string().uuid(),
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  organization: z.string().trim().min(2, "Enter your university or organisation.").max(160),
  roleOrCourse: z.string().trim().min(2, "Enter your course, degree, or current role.").max(160),
  graduationYear: z.number().int().min(1950).max(2040).nullable(),
  country: z.literal(REGISTRATION_COUNTRY, { error: "Registration is for the United Kingdom only." }),
  city: z.string().trim().min(2, "Enter your city.").max(100),
  githubPortfolioUrl: safeUrl("GitHub or portfolio link"),
  linkedinUrl: safeUrl("LinkedIn link", true),
  teamStatus: z.enum(["solo", "looking_for_team", "has_team"]),
  teamName: optionalText(120),
  teammates: z.array(teammateSchema).max(8),
  availabilityOnline: z.literal(true, { error: `Confirm your availability for the online qualification, ${QUALIFICATION_DATES}.` }),
  availabilityLondon: z.literal(true, { error: "Confirm your availability for the London final." }),
  rulesAccepted: z.literal(true, { error: "Accept the competition rules and code of conduct." }),
  privacyAccepted: z.literal(true, { error: "Confirm you have read the privacy notice." }),
  technicalBackground: optionalText(2000),
  accessibilityDietary: optionalText(1000),
  accessibilityConsent: z.boolean(),
  cv: z.union([cvSchema, z.null()]),
  cvShareConsent: z.boolean(),
  website: z.string().max(0).optional().default(""),
}).strict().superRefine((value, context) => {
  if (value.teamStatus === "has_team") {
    if (!value.teamName) context.addIssue({ code: "custom", path: ["teamName"], message: "Enter your team name." });
  } else if (value.teamName || value.teammates.length) {
    context.addIssue({ code: "custom", path: ["teamStatus"], message: "Team details are only accepted for existing teams." });
  }
  if (value.cvShareConsent && !value.cv) {
    context.addIssue({ code: "custom", path: ["cvShareConsent"], message: "CV sharing consent requires a CV upload." });
  }
  if (value.accessibilityDietary && !value.accessibilityConsent) {
    context.addIssue({ code: "custom", path: ["accessibilityConsent"], message: "Confirm consent to use the information provided for participation support." });
  }
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export type StartRegistrationResponse =
  | { state: "complete"; reference: string; emailStatus: "sent" | "not_configured" | "failed"; receipt: string }
  | {
      state: "upload_required";
      registrationId: string;
      reference: string;
      path: string;
      token: string;
      claimToken: string;
      bucket: string;
      uploadPresent: boolean;
    };
