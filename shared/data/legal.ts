export interface LegalSection {
  id: string
  title: string
  paragraphs: string[]
}
export interface LegalDocument {
  title: string
  description: string
  updated: string
  sections: LegalSection[]
}

export const privacyPolicy: LegalDocument = {
  title: 'Privacy policy',
  description: 'What we collect, why we need it, and the choices you have.',
  updated: 'October 7, 2026',
  sections: [
    {
      id: 'scope',
      title: 'Our approach',
      paragraphs: [
        'Matrix Fellows operates this website and its member dashboard. This policy covers information we receive through the site, membership forms, accounts, research tools, and connected services. Matrix Fellows serves people with varied backgrounds and ages; individual programs can have their own eligibility requirements.',
        'We use information to run the society and support members’ work, not to sell personal information or target advertising. External sites and services have their own privacy policies.',
      ],
    },
    {
      id: 'information',
      title: 'Information you provide',
      paragraphs: [
        'Accounts contain your email address, authentication identity, and information you choose to add. Google or Microsoft sign-in supplies basic identity information such as your name and email; signing in does not give us access to your inbox.',
        'The dashboard can store interests, skills, availability, location or travel preferences, work samples, profile claims, saved opportunities, applications, activities, tasks, schedules, contributions, and artifacts. Research tools can store target evidence, proposals, drafts, relationship records, and sending status. Include only information you are authorized to share.',
        'The school membership form is a separate workflow. It requests name, student email, grade, student ID, interests, experience, goals, parent or guardian name and email, and a confirmation of parent permission; optional feedback may also be collected. That confirmation is a member’s attestation, not an independently verified parent signature.',
      ],
    },
    {
      id: 'technical',
      title: 'Cookies and technical information',
      paragraphs: [
        'Essential cookies support secure sessions and sign-in or mailbox authorization flows. Browser storage can retain saved opportunity identifiers and form preferences or drafts. These are functional features, not advertising cookies. Clearing browser storage may remove device-only saves or sign you out.',
        'Our hosting and security services may process IP addresses, browser information, request timestamps, and diagnostic logs to deliver the site and prevent abuse. The membership-form rate limiter uses short-lived hashed identifiers rather than storing raw IP addresses in its rate-limit records.',
      ],
    },
    {
      id: 'use',
      title: 'How information is used',
      paragraphs: [
        'We use information to authenticate accounts, manage participation, personalize research and opportunity work, maintain plans and evidence, save drafts, carry out actions you review, and respond to support or privacy requests. We also use necessary operational information to investigate errors, protect accounts, and meet applicable legal obligations.',
        'A saved opportunity does not authorize an application or an inquiry. Sharing a relationship record does not authorize sharing someone’s private profile, draft, or mailbox content.',
      ],
    },
    {
      id: 'sharing',
      title: 'Visibility and service providers',
      paragraphs: [
        'Account-linked dashboard records are private unless a feature or your explicit action shares them. Assigned research targets and permitted coordination information may be visible to relevant members or officers. Membership-form responses are available to authorized organizers and may be synchronized to a restricted organizer Google Sheet. Sponsor summaries exclude individual responses and sensitive membership fields.',
        'We use Supabase for authentication and data storage and Cloudflare for hosting and delivery. Google or Microsoft may process identity information when you choose their login. A configured Google Sheets integration processes organizer membership records. Other connected services process the information required for the actions you authorize; their policies govern their own processing.',
        'We may disclose information when required by law or reasonably necessary to address fraud, security, or safety. We do not make your private records public merely because you join the society.',
      ],
    },
    {
      id: 'mail',
      title: 'Optional mailbox connections',
      paragraphs: [
        'Connecting a mailbox is separate from signing in. The connection screen identifies the permissions requested. When you review and authorize sending, the selected provider receives the sender, recipient, subject, message, and any supported attachments needed for that action. Connection credentials are held encrypted on the server, not exposed to other members.',
        'Sending permission does not imply permission to read replies or your entire inbox. Reply synchronization is not currently active. Disconnecting removes the stored mailbox authorization; it does not erase messages already submitted to the provider or all application sending-history records. You can also revoke consent through the provider.',
      ],
    },
    {
      id: 'ai',
      title: 'AI-assisted research',
      paragraphs: [
        'AI features are intended exclusively for authorized adult officers, not high-school members or ordinary member accounts. When enabled, the current research-analysis flow may send explicitly reviewed public research excerpts to the configured model provider. Member profiles, school membership responses, private drafts, and mailbox content are not inputs to that public-excerpt analysis flow.',
        'A feature using a different kind of information must disclose that use before it is enabled. Provider processing and retention depend on the configured service and agreement; we do not promise that all external providers have identical retention or training practices. AI suggestions require human review and do not become verified facts automatically.',
      ],
    },
    {
      id: 'retention',
      title: 'Retention, security, and your choices',
      paragraphs: [
        'We retain information as needed for active accounts, society operations, records of member work, security, and applicable obligations. Different records have different purposes; there is no single automatic deletion period for all data. Historical records and backups may remain after an interface item is removed.',
        'You can edit available profile fields, change sharing choices, and disconnect optional services. Contact us to request access, correction, account closure, or deletion. We may need to verify identity and explain records that must be retained or cannot immediately be removed from backups. No online system can guarantee absolute security.',
      ],
    },
    {
      id: 'young-members',
      title: 'Younger participants',
      paragraphs: [
        'This service is not intended for children under 13. Younger participants should involve a parent or guardian where required, and follow school, institution, and program rules. Parents or guardians can contact us about a participant’s information. If you believe a child under 13 has supplied personal information, tell us so we can investigate and address it.',
        'Participation in a physical lab or research program requires its own supervision, safety, and consent arrangements. Website registration does not establish those arrangements.',
      ],
    },
    {
      id: 'contact',
      title: 'Questions and policy changes',
      paragraphs: [
        'For privacy questions or requests, email contact@matrixfellows.com. Please describe the request without including passwords, OAuth secrets, sensitive identity documents, or unnecessary personal information.',
        'We will update the date on this page when the policy changes and provide additional notice for material changes when appropriate. This page describes Matrix Fellows’ practices; it is not a promise about unrelated websites.',
      ],
    },
  ],
}

export const termsOfService: LegalDocument = {
  title: 'Terms of service',
  description: 'Clear expectations for using Matrix Fellows and its member tools.',
  updated: 'October 7, 2026',
  sections: [
    {
      id: 'agreement',
      title: 'Using the website',
      paragraphs: [
        'These terms apply to the Matrix Fellows website and member dashboard. By creating an account or using member tools, you agree to these terms. If you do not agree, do not use those tools. Questions can be sent to contact@matrixfellows.com.',
        'Matrix Fellows is a research society serving a broad community. Account access does not guarantee society participation, officer privileges, a research placement, admission, funding, publication, coauthorship, or access to a laboratory. The service is not intended for children under 13; minors must obtain consent where required by law, their school, or a program.',
      ],
    },
    {
      id: 'accounts',
      title: 'Accounts and permissions',
      paragraphs: [
        'Provide accurate account information, protect your credentials, and use only an account or mailbox you are authorized to control. Tell us if you suspect unauthorized access. Google or Microsoft login establishes identity, not society authority.',
        'Permissions depend on your assigned role and the relevant record. Ordinary members may send personal research inquiries through the integration only to contacts officers have assigned to them. Society outreach and discovery require officer authorization. AI features are reserved for authorized adult officers; being a member or signing in does not grant AI access.',
      ],
    },
    {
      id: 'conduct',
      title: 'Responsible use',
      paragraphs: [
        'Do not impersonate others, fabricate achievements, harass people, send spam, bypass access controls, upload malicious content, or use the service for unlawful activity. Respect contact instructions, opt-outs, confidentiality, intellectual property, and institutional policies.',
        'Do not upload sensitive research, patient information, protected student records, passwords, or confidential material unless a specifically approved workflow permits it. Do not use the tools to evade application restrictions, consent, safety training, or supervision requirements.',
      ],
    },
    {
      id: 'your-work',
      title: 'Your work and shared materials',
      paragraphs: [
        'You retain ownership of content you create, subject to any rights held by collaborators or other owners. You give Matrix Fellows the limited permission needed to store, display to authorized users, process, and transmit that content to operate the features you choose. This does not grant blanket permission to publish your private work or use it in marketing.',
        'Share only materials you have permission to use. Keep contribution and achievement descriptions accurate, distinguish planned work from completed work, and obtain collaborators’ permission before sharing their private information. Site branding and third-party materials remain subject to their owners’ rights and applicable licenses.',
      ],
    },
    {
      id: 'research',
      title: 'Evidence, recommendations, and AI',
      paragraphs: [
        'Catalog entries, source extracts, eligibility checks, plans, and suggestions may be incomplete, out of date, or incorrect. Verify important requirements and dates with the official organizer or research contact. An institution’s reputation, an old program page, or a suggested fit does not establish current availability or acceptance.',
        'AI output is a starting point for review, not professional advice or verified evidence. Authorized adult officers remain responsible for checking claims, using the correct person’s evidence, respecting privacy, and approving any communication. Do not present an automatically generated suggestion as a researcher’s invitation or a member’s accomplishment.',
      ],
    },
    {
      id: 'actions',
      title: 'Applications, messages, and connected services',
      paragraphs: [
        'You are responsible for reviewing the sender, recipients, final content, and supported attachments before authorizing a send. Provider acceptance is not proof of delivery, a reply, or a successful relationship. If a submission result is uncertain, check the provider before retrying. No system can promise universal exactly-once delivery or recall after submission.',
        'Marking an application Submitted records your confirmation; it does not submit an external form. Internal calendar export is not two-way synchronization. Optional mailbox or other integrations require separate consent and are also governed by their provider’s terms.',
        'Research access, experiments, travel, equipment, and supervision are arrangements between participants and the relevant institution. Obtain the necessary permission and safety guidance before beginning physical research. Do not offer labor in exchange for guaranteed authorship or claim commitments others have not made.',
      ],
    },
    {
      id: 'availability',
      title: 'Availability and limits',
      paragraphs: [
        'We aim to provide useful, reliable tools, but features can be interrupted, changed, or unavailable. Keep independent copies of important work and verify hard deadlines outside the dashboard. We do not guarantee any particular academic, career, or research result.',
        'To the extent permitted by applicable law, the service is provided as available without warranties of uninterrupted operation or error-free information. Nothing in these terms excludes rights or liability that applicable law does not allow us to exclude. These terms do not replace a program agreement or institutional safety policy.',
      ],
    },
    {
      id: 'ending',
      title: 'Ending access and changes',
      paragraphs: [
        'You may stop using the service or contact us about account closure. We may limit or suspend access for misuse, a security concern, or loss of authorization. Where appropriate, we will explain the issue and provide a way to contact us; urgent security or safety situations may require immediate action.',
        'Data handling and requests are described in the Privacy policy. We will update the date on this page when terms change and provide notice of material changes when appropriate. Contact contact@matrixfellows.com with questions or concerns before continuing to use affected features.',
      ],
    },
  ],
}
