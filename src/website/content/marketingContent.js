/** All marketing copy and CTA ids — edit here for content / SEO tweaks. */

export const MARKETING_META = {
  title: 'RE:Scope Surveys — Survey building for fieldwork agencies',
  description:
    'Survey building for fieldwork agencies — exclusion lists, logic, and piping without the setup overhead.',
}

export const MARKETING_NAV = {
  links: [
    { label: 'Features', hash: '#features' },
    { label: 'How it works', hash: '#how' },
    { label: 'Pricing', hash: '#pricing' },
  ],
  primaryCta: { label: 'Start free trial', ctaId: 'freeTrial' },
  signedInPrimaryCta: { label: 'Go to dashboard', ctaId: 'dashboard' },
  signInCta: { label: 'Log in', ctaId: 'signIn' },
}

export const MARKETING_HERO = {
  eyebrow: 'Survey building for fieldwork agencies',
  title: "All the survey logic you need. None of the setup time you don't.",
  lede:
    'RE:Scope gives you the question types, logic, and piping of Alchemer or SurveyMonkey — plus per-survey exclusion lists, built specifically for fieldwork recruitment.',
  primaryCta: { label: 'Start free trial', ctaId: 'freeTrial' },
  secondaryCta: { label: 'Talk to us', ctaId: 'contact' },
  fine: "No card required. Upgrade when you're ready — just contact us.",
  canvas: {
    label: 'Untitled Survey — Screener',
    blocks: [
      {
        qtype: 'Single select',
        qtext: 'Which of the following best describes your role?',
        opts: ['Decision maker', 'Influencer', 'Not involved'],
      },
      {
        qtype: 'Exclusion list',
        qtext: "Auto-screen respondents against this survey's exclusion list",
        opts: ['1,204 records loaded', 'Active'],
        variant: 'excl',
      },
      {
        qtype: 'Piped text',
        qtext: 'How likely are you to recommend {{Q1_answer}} to a colleague?',
        pipeLine: { from: 'Q1 → Q7', note: 'logic applied' },
      },
    ],
  },
}

export const MARKETING_COMPARE = {
  eyebrow: 'The problem with general-purpose tools',
  eyebrowColor: '#7FD8C9',
  title: 'Fieldwork agencies build the same workarounds into every project.',
  subtitle: "General survey platforms weren't built for recruitment and fieldwork. RE:Scope was.",
  generic: {
    title: 'Generic survey tools',
    items: [
      'Exclusion and DNC lists managed outside the platform, per project',
      'Complex logic buried in settings menus built for general use cases',
      'Screen-out and termination logic bolted on, not native',
      'Steep setup time for every new survey',
    ],
  },
  rescope: {
    title: 'RE:Scope',
    items: [
      'Exclusion lists live per survey, applied automatically at screening',
      'Logic, piping, and question types built for fieldwork from day one',
      'Termination and screen-out logic as a first-class feature',
      'A simplified builder that gets a survey live faster',
    ],
  },
}

export const MARKETING_FEATURES = {
  id: 'features',
  eyebrow: 'Features',
  title: "Everything a fieldwork survey needs, nothing it doesn't.",
  items: [
    {
      tag: 'Differentiator',
      highlight: true,
      title: 'Per-survey exclusion lists',
      body: 'Upload and manage exclusion or DNC lists at the survey level, with automatic screening built into the flow — not a separate spreadsheet process.',
    },
    {
      tag: 'Question types',
      title: 'A full library, simplified',
      body: "The range of question types you'd expect from Alchemer or SurveyMonkey, presented in a builder that takes minutes to learn.",
    },
    {
      tag: 'Logic',
      title: 'Termination & screen-out logic',
      body: 'Set qualifying and disqualifying paths without wiring together conditional rules by hand.',
    },
    {
      tag: 'Piping',
      title: 'Text and option piping',
      body: 'Carry answers and choices forward into later questions automatically, for a survey that reads naturally.',
    },
    {
      tag: 'Data quality',
      title: 'Digital fingerprinting',
      body: 'Flag duplicate or suspicious respondents automatically, protecting fieldwork sample quality.',
    },
    {
      tag: 'Export',
      title: 'Filtered CSV export',
      body: 'Export exactly the data your client needs, filtered and formatted, without a manual cleanup pass.',
    },
  ],
}

export const MARKETING_STEPS = {
  id: 'how',
  dimBackground: true,
  eyebrow: 'How it works',
  title: 'From blank canvas to live fieldwork survey.',
  steps: [
    {
      num: '01',
      title: 'Build your survey',
      body: 'Add question types, logic, and piping in a builder designed to be handed to anyone on your team — not just the technical lead.',
    },
    {
      num: '02',
      title: 'Load your exclusion list',
      body: 'Attach a DNC or exclusion list to this specific survey. Respondents on it are screened out automatically.',
    },
    {
      num: '03',
      title: 'Launch and export',
      body: 'Send it live, monitor fingerprinting flags as responses come in, then export exactly the fields your client asked for.',
    },
  ],
}

export const MARKETING_FINAL_CTA = {
  id: 'trial',
  title: 'Get your first survey live this week.',
  body: "Start free. Upgrade by talking to us when you're ready — no forced credit card, no forced tiers.",
  cta: { label: 'Start free trial', ctaId: 'freeTrial' },
}

export const MARKETING_FOOTER = {
  id: 'contact',
  note: '© 2026 RE:Scope Surveys. Built for fieldwork market research agencies.',
  links: [
    { label: 'hello@rescopesurveys.com', href: 'mailto:hello@rescopesurveys.com' },
    { label: 'Pricing', hash: '#pricing' },
    { label: 'Features', hash: '#features' },
  ],
}

/** Shown once until dismissed — remove when the public site is launch-ready. */
export const MARKETING_DEMO_NOTICE = {
  storageKey: 'rescope.mktDemoNoticeDismissed',
  title: 'Demo preview',
  body:
    'This website is under active development. Some content, pricing, and layout details are placeholders and may change. Thanks for your understanding.',
  dismissLabel: 'Close notice',
}
