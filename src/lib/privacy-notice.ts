import { CONTACT_EMAIL, CV_SHARING_PUBLIC_COPY, PRIVACY_NOTICE_VERSION } from "@/lib/registration";

export const PRIVACY_NOTICE_EFFECTIVE_DATE = "26 August 2026";

export type PrivacyNoticeSection = {
  id: string;
  navLabel: string;
  title: string;
  paragraphs: string[];
};

export function getPrivacyNotice(): PrivacyNoticeSection[] {
  return [
    {
      id: "controller",
      navLabel: "Who is responsible",
      title: "1. Who is responsible",
      paragraphs: [
        `The organisers of AI Chessathon are responsible for the personal information used to organise the event. Contact ${CONTACT_EMAIL} for privacy questions or requests.`,
      ],
    },
    {
      id: "collection",
      navLabel: "What we collect",
      title: "2. What we collect",
      paragraphs: [
        "We collect the registration details you provide: identity and contact details, education or work information, location, professional links, team information, availability confirmations, and optional technical background. If you list teammates, you confirm you may provide their names and emails. Listing someone does not register them.",
        "Accessibility or dietary information is optional and may reveal health, disability, or belief information. Share only the information needed to support attendance. We require separate explicit consent and use it only to support attendance. A CV is also optional and stored privately.",
        "For abuse prevention, we create a short-lived identifier from the network address used to submit the form. We do not store the raw address. The identifier is normally deleted within 48 hours.",
      ],
    },
    {
      id: "use",
      navLabel: "How we use it",
      title: "3. How and why we use information",
      paragraphs: [
        "We use core registration information to administer the competition, communicate with applicants, form teams where requested, assess registrations, maintain event security, and operate the online qualification and London final. Our lawful bases are taking steps at your request, administering the competition under its terms, and our legitimate interests in running a fair and secure event.",
        `Optional accessibility or dietary information is used only with your explicit consent, and only to support attendance. ${CV_SHARING_PUBLIC_COPY} An optional registration checkbox records only whether you want to be contacted if you qualify, so you can make that later choice.`,
      ],
    },
    {
      id: "sharing",
      navLabel: "Who receives it",
      title: "4. Who receives information",
      paragraphs: [
        "Access is limited to authorised AI Chessathon organisers and the service providers that host the website, database, private file storage, and confirmation email. Those providers process information under their own security and data-processing terms.",
        "Reaching the top 50 or qualifying for the London final does not automatically authorise sharing your CV with Optiver. A future finalist-stage reconfirmation is required from the named participant before any Optiver CV transfer. Optiver has no routine access to the registration database, file storage, or any admin dashboard. If a CV is shared after that confirmation, Optiver may process it independently for recruitment and should provide its own privacy information.",
        "Some service providers may process information outside the United Kingdom. Where transfer rules apply, we require an appropriate legal mechanism and safeguards.",
      ],
    },
    {
      id: "security",
      navLabel: "Security",
      title: "5. Security",
      paragraphs: [
        "Registration records are not publicly readable. CVs are held in private storage with short-lived, single-path upload permission and no public file URL. Participation-support information is kept separate from routine reviewer data. No internet service can be guaranteed completely secure. We use access controls and data minimisation to reduce risk.",
      ],
    },
    {
      id: "retention",
      navLabel: "Retention",
      title: "6. How long we keep information",
      paragraphs: [
        "We plan to delete routine registration data and CVs no later than 12 months after the London final, unless a shorter period is requested or a longer period is required to resolve a dispute or meet a legal obligation. Participation-support information is deleted no later than 90 days after the final. Incomplete CV-upload sessions and their application data are deleted automatically when the upload window expires. A minimal factual event record may be retained in the public archive. It will not include private application data without permission.",
      ],
    },
    {
      id: "rights",
      navLabel: "Your rights",
      title: "7. Your choices and rights",
      paragraphs: [
        `You may request access, correction, deletion, restriction, or portability, or object to certain uses, subject to applicable law. To withdraw optional CV-contact interest, support-information consent, or a later finalist-stage CV-sharing confirmation, email ${CONTACT_EMAIL}. Withdrawal does not affect earlier lawful use, eligibility, ranking, judging, selection, attendance, or prizes.`,
        "You may also raise a concern with the UK Information Commissioner’s Office. Contact us first so we can try to resolve it.",
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

export function privacyNoticeSnapshot() {
  const heading = [
    "AI Chessathon privacy notice",
    `Version ${PRIVACY_NOTICE_VERSION}`,
    `Effective ${PRIVACY_NOTICE_EFFECTIVE_DATE}`,
    "This notice applies to AI Chessathon registration and participation.",
  ];
  const sections = getPrivacyNotice().flatMap((section) => [section.title, ...section.paragraphs]);
  return [...heading, ...sections].join("\n\n");
}
