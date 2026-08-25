import { CONTACT_EMAIL, PRIVACY_NOTICE_VERSION } from "@/lib/registration";

export const PRIVACY_NOTICE_EFFECTIVE_DATE = "24 August 2026";

export type PrivacyNoticeSection = {
  id: string;
  navLabel: string;
  title: string;
  paragraphs: string[];
};

export function getPrivacyNotice(controller: string): PrivacyNoticeSection[] {
  return [
    {
      id: "controller",
      navLabel: "Who is responsible",
      title: "1. Who is responsible",
      paragraphs: [
        `${controller} is responsible for the personal information used to organise AI Chessathon. Contact us at ${CONTACT_EMAIL} for privacy questions or requests.`,
      ],
    },
    {
      id: "collection",
      navLabel: "What we collect",
      title: "2. What we collect",
      paragraphs: [
        "We collect the registration details you provide: identity and contact details, education or work information, location, professional links, team information, availability confirmations, and optional technical background. If you list teammates, you confirm that you may provide their names and emails; listing someone does not register them.",
        "Accessibility or dietary information is optional and may reveal health, disability, or belief information. We ask for separate explicit consent and restrict it to participation support. A CV is also optional and stored privately.",
        "For abuse prevention, we derive a pseudonymous, HMAC-protected identifier from the network address used to submit the form. We do not store the raw address in the registration database, and the scheduled cleanup normally deletes the identifier within 48 hours.",
      ],
    },
    {
      id: "use",
      navLabel: "How we use it",
      title: "3. How and why we use information",
      paragraphs: [
        "We use core registration information to administer the competition, communicate with applicants, form teams where requested, assess registrations, maintain event security, and operate the online qualification and London final. Our lawful bases are taking steps at your request, administering the competition under its terms, and our legitimate interests in running a fair and secure event.",
        "We use optional accessibility or dietary information only with your explicit consent to support participation. We share a CV with Optiver for recruitment-related opportunities only when you select the separate, optional CV consent. Refusing or withdrawing that CV consent does not affect eligibility or judging.",
      ],
    },
    {
      id: "sharing",
      navLabel: "Who receives it",
      title: "4. Who receives information",
      paragraphs: [
        "Access is limited to authorised AI Chessathon organisers and service providers that host the website, database, private file storage, and confirmation email. Those providers process information under their own security and data-processing terms.",
        "Optiver receives your CV only if you give the separate explicit opt-in. Optiver receives no routine access to the registration database or private storage. If a CV is shared, Optiver may process it independently for recruitment and should provide its own privacy information.",
        "Some service providers may process information outside the United Kingdom. Where transfer rules apply, we require an appropriate legal mechanism and safeguards.",
      ],
    },
    {
      id: "security",
      navLabel: "Security",
      title: "5. Security",
      paragraphs: [
        "Registration records are not publicly readable. CVs are held in a private storage bucket with short-lived, single-path upload permission and no public file URL. We separate participation-support information from routine reviewer data. No internet service can be guaranteed completely secure, but we use access controls and data minimisation to reduce risk.",
      ],
    },
    {
      id: "retention",
      navLabel: "Retention",
      title: "6. How long we keep information",
      paragraphs: [
        "We plan to delete routine registration data and CVs no later than 12 months after the London final, unless a shorter period is requested or a longer period is required to resolve a dispute or meet a legal obligation. Participation-support information is deleted no later than 90 days after the final. Incomplete CV-upload sessions and their application data are deleted automatically after the short upload window expires. A minimal factual event record may be retained in the public archive, but it will not include private application data without permission.",
      ],
    },
    {
      id: "rights",
      navLabel: "Your rights",
      title: "7. Your choices and rights",
      paragraphs: [
        `You may ask for access, correction, deletion, restriction, portability, or object to certain uses, subject to applicable law. You can withdraw optional CV-sharing or support-information consent at any time by emailing ${CONTACT_EMAIL}. Withdrawal does not affect earlier lawful use, and it does not affect eligibility or judging.`,
        "You may also raise a concern with the UK Information Commissioner’s Office. We encourage you to contact us first so we can try to resolve it.",
      ],
    },
    {
      id: "changes",
      navLabel: "Changes",
      title: "8. Changes",
      paragraphs: [
        "We may update this notice when event operations or service providers change. Material changes will receive a new version and, where appropriate, be communicated to registered participants.",
      ],
    },
  ];
}

export function privacyNoticeSnapshot(controller: string) {
  const heading = [
    "AI Chessathon privacy notice",
    `Version ${PRIVACY_NOTICE_VERSION}`,
    `Effective ${PRIVACY_NOTICE_EFFECTIVE_DATE}`,
    "This notice applies to AI Chessathon registration and participation.",
  ];
  const sections = getPrivacyNotice(controller).flatMap((section) => [section.title, ...section.paragraphs]);
  return [...heading, ...sections].join("\n\n");
}
