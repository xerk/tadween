import type { IconName } from '@/components/icons';
import type { ClientAuth, ClientKind, McpTool } from '@/lib/aiClients';
import type { FeatureKey } from '@/lib/plans';
import type { FeatureSlug } from '@/lib/routes';
import type { ShotId } from '@/lib/shots';

export type Lang = 'en' | 'ar';

/** Which refund wording the Refund Policy shows: a refund window on the first payment, or no
    refunds except where the law requires (NEXT_PUBLIC_REFUND_DAYS=0). See lib/config.ts. */
export type RefundMode = 'window' | 'none';

/** A paragraph or a bulleted list of a legal document. `{token}` marks a company value or a
    link (lib/config.ts); `when` keeps the block only for one refund wording. */
export type LegalBlock = string | { text: string; when?: RefundMode } | { list: string[]; when?: RefundMode };

export interface LegalSection {
  /** The anchor, the same in both languages. */
  id: string;
  title: string;
  body: LegalBlock[];
}

export interface LegalDoc {
  metaTitle: string;
  metaDescription: string;
  title: string;
  sub: string;
  sections: LegalSection[];
}

/** The company values the legal pages read from NEXT_PUBLIC_LEGAL_* (lib/config.ts). */
export type LegalValueKey = 'company' | 'state' | 'address' | 'email' | 'law' | 'venue' | 'refundDays' | 'aiProviders' | 'emailProvider' | 'hostingProvider' | 'analytics';
/** Links a legal text can name: the legal pages themselves and the platform policies. */
export type LegalLinkKey =
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'contact'
  | 'deleteAccount'
  | 'youtubeTerms'
  | 'googlePrivacy'
  | 'googleUserData'
  | 'googlePermissions'
  | 'linkedinTerms'
  | 'metaTerms'
  | 'stripePrivacy';

export interface LegalCopy {
  crumb: string;
  /** "{date}" is the last-updated date. */
  updated: string;
  toc: string;
  /** Arabic only: the English version prevails. */
  prevails?: string;
  /** Shown, marked, where a company value isn't set yet. */
  placeholders: Record<LegalValueKey, string>;
  links: Record<LegalLinkKey, string>;
  /** Under the pricing table: "{terms}" and "{refund}" become links. */
  pricingAgree: string;
  terms: LegalDoc;
  privacy: LegalDoc;
  refund: LegalDoc;
  contact: LegalDoc;
  /** /delete-account: how to delete an account (Google Play needs a public URL for this). */
  deleteAccount: LegalDoc;
}

export interface Faq {
  title: string;
  content: string;
}

/** A page's own title and description, for <title>, the meta description and Open Graph. */
export interface PageMeta {
  title: string;
  description: string;
}

/** A section heading with its supporting line. */
export interface Head {
  title: string;
  sub: string;
}

/** A card or link entry for a tool. */
export interface FeatureNav {
  label: string;
  blurb: string;
}

/** A tool's section on /features (anchor #<slug>). Its icon and screenshot, if any, live in
    lib/features.ts. */
export interface FeatureCopy {
  nav: FeatureNav;
  title: string;
  body: string;
  points: string[];
  /** The tool's question for the page's FAQ. */
  faq: Faq;
}

/** One conversation with the agent, the way the chat shows it. */
export interface ChatDemo {
  lang: Lang;
  prompt: string;
  tools: { tool: string; label: string }[];
  reply: string;
  /** The posts it scheduled: channel icon slug, channel name, first words, time. */
  posts: { net: string; name: string; text: string; when: string }[];
}

/** One network's page. Limits and flags come from lib/channels.ts; this is only the words. */
export interface ChannelCopy {
  /** The network's name in this language, when it differs from the brand spelling. */
  name?: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** What you can schedule there: post types and per-network settings the app offers. */
  formats: string[];
  /** The network's media rules, in plain words (from the provider's @Rules). */
  media: string;
  /** Variants of the character limit, when there are any. */
  limitNote?: string;
  features: { title: string; body: string }[];
  faq: Faq[];
  /** The sample post typed into the composer for this network's screenshot (see
      docs/tadween/demo-data.md); only networks with a screenshot have one. */
  sample?: string;
}

export interface ChannelsDict {
  meta: PageMeta;
  index: Head & {
    /** The networks with a page (lib/channels.ts CHANNELS). */
    focus: Head;
    /** Everything else, as a compact list (OTHER_CHANNELS and MORE_CHANNELS). */
    more: Head;
  };
  /** Local spellings of networks without a page (lib/channels.ts OTHER_CHANNELS), where this
      language doesn't use the brand name. */
  others: Record<string, { name: string }>;
  page: {
    start: string;
    factsTitle: string;
    limit: string;
    editor: string;
    editors: Record<'normal' | 'markdown' | 'html', string>;
    comments: string;
    commentsValue: { yes: string; text: string; no: string };
    formatsTitle: string;
    mediaTitle: string;
    featuresTitle: string;
    shared: { icon: IconName; title: string; body: string }[];
    /** Caption under the composer screenshot; "{name}" is the network. */
    previewTitle: string;
    previewSub: string;
    faqTitle: string;
    relatedTitle: string;
    /** "{name}" is replaced with the network's name. */
    ctaTitle: string;
    ctaBody: string;
    limitQ: string;
    limitA: string;
    scheduleQ: string;
    scheduleA: string;
  };
  items: Record<string, ChannelCopy>;
}

/** One AI client's page, in one language. Steps, codes and docs links live in
    lib/aiClients.ts; this is only the words. */
export interface AiClientCopy {
  title: string;
  description: string;
  h1: string;
  /** Three short lines under the H1. */
  bullets: string[];
  /** What the client is, in a few words, for cards and the menu. */
  blurb: string;
  /** The text of each step of each connection method, in the order lib/aiClients.ts lists them.
      The first method's steps are the numbered row under the Connect card. */
  methods: Partial<Record<ClientAuth, { label: string; how: string; steps: string[] }>>;
  /** The Connect card: what to do with the snippet it shows. */
  connect: { title: string; body: string };
  /** The conversation the hero draws inside the client. */
  demo: ChatDemo;
  /** The short exchange in the Ask card, and the channel slugs it went to. */
  ask: { prompt: string; reply: string; nets: string[] };
  /** "Also try" chips under the Ask card. */
  alsoTry: string[];
  /** The comparison table: `head` names the columns, the first being the row labels. */
  compare: { title: string; sub: string; head: string[]; rows: string[][]; note: string };
  /** Four example requests across the focus networks; `nets` are channel slugs for the icons. */
  prompts: { tag: string; nets: string[]; title: string; text: string; lang: Lang }[];
  /** This client beside its siblings. `href` is 'self', 'agent' (the AI agent page) or another
      client's slug. */
  versus: { title: string; sub: string; items: { name: string; body: string; href: string }[] };
  /** Notes that apply to this client only (plans, where the setting lives). */
  notes: string[];
  /** The "Something not working?" checks. */
  trouble: string[];
  faq: Faq[];
}

export interface AiClientsDict {
  /** Labels shared by every client page; "{name}" is the client's name, "{n}" the number of steps. */
  page: {
    /** "{name} + Tadween": the hero chip, and the eyebrow on the Open Graph card. */
    eyebrow: string;
    start: string;
    stepsLink: string;
    /** The small print under the hero buttons, then the link to the AI agent page. */
    smallPrint: string;
    smallPrintLink: string;
    connectTitle: string;
    connectSub: string;
    /** The client window in the hero: its status line and input placeholder. */
    frameOnline: string;
    frameInput: string;
    connectLabel: string;
    connectTime: string;
    askLabel: string;
    askLive: string;
    askTitle: string;
    askBody: string;
    /** Under the reply in the Ask card, before the channel icons. */
    via: string;
    alsoTry: string;
    /** Before the links to the vendor's own documentation. */
    docs: string;
    /** Above a second way to connect, under the comparison table. */
    otherMethod: string;
    orbitTitle: string;
    orbitSub: string;
    canTitle: string;
    canSub: string;
    mcpTitle: string;
    mcpSub: string;
    mcpCardTitle: string;
    mcpCardBody: string;
    mcpPoints: string[];
    mcpCodeLabel: string;
    /** What each MCP tool does, by tool name (lib/aiClients.ts MCP_TOOLS), for the code window. */
    mcpTools: Record<McpTool, string>;
    promptsTitle: string;
    promptsSub: string;
    channelsTitle: string;
    channelsSub: string;
    channelsNote: string;
    /** Marks this page's card in the "versus" section. */
    thisPage: string;
    helpTitle: string;
    costTitle: string;
    costBody: string;
    costLink: string;
    securityTitle: string;
    securityBody: string;
    troubleTitle: string;
    faqTitle: string;
    relatedTitle: string;
    allClients: string;
    /** The related line: its label, and when the steps were last checked. */
    relatedLabel: string;
    updated: string;
    ctaTitle: string;
    ctaBody: string;
    /** Questions every client page answers, after its own. */
    sharedFaq: Faq[];
  };
  /** Group titles of the "Works with" grid on the AI agent page. */
  kinds: Record<ClientKind, string>;
  items: Record<string, AiClientCopy>;
}

/** The words of the home page's calendar demo (components/CalendarDemo.tsx). The demo week is
    fixed (Monday 12 to Friday 16 October 2026, "now" on Wednesday at 11:20) so the server and
    the browser draw the same thing. */
export interface CalendarDemoCopy {
  /** The demo's accessible name, and how to move a post with the keyboard. */
  label: string;
  keyboardHint: string;
  range: string;
  month: string;
  views: { label: string; week: string; month: string; board: string };
  filtersLabel: string;
  /** The five days of the week view, short ("Mon 12") and long ("Monday, Oct 12"). */
  days: { short: string; long: string }[];
  /** Monday to Sunday, for the month view's header. */
  weekdays: string[];
  today: string;
  now: string;
  status: { draft: string; scheduled: string; published: string };
  upNext: string;
  actions: { edit: string; duplicate: string; preview: string; delete: string };
  /** "+{n} more" under a full day in the month view. */
  more: string;
  /** What the drag callout says after a move: "{when}" is the new day and time. */
  moved: string;
  refusedPast: string;
  refusedPublished: string;
}

/** Invite & earn (lib/config.ts REFERRAL_PROGRAM): the home page section, the /referral page
    and the links to it. No dollar amounts: the page's FAQ feeds FAQPage data. */
export interface ReferralCopy {
  /** The program's name, for the eyebrow, the footer link and the breadcrumb. */
  name: string;
  meta: PageMeta;
  /** The home page section. */
  title: string;
  sub: string;
  more: string;
  /** The ladder: `n` paying friends earn `reward`; `unit` is "paying friends" in the right
      plural form for `n`. */
  ladderLabel: string;
  rungs: { n: number; unit: string; reward: string }[];
  /** What the invited friend gets. */
  friend: string;
  /** Under the pricing table. */
  pricingLink: string;
  page: {
    title: string;
    sub: string;
    signUp: string;
    openInvite: string;
    stepsTitle: string;
    steps: { title: string; body: string }[];
    ladderTitle: string;
    ladderSub: string;
    rulesTitle: string;
    rules: string[];
    faqTitle: string;
    faq: Faq[];
    ctaTitle: string;
    ctaBody: string;
  };
}

export interface Dict {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  /** Base path of this language: '' for English, '/ar' for Arabic. */
  base: string;
  numberLocale: string;
  meta: {
    title: string;
    description: string;
    pricingTitle: string;
    pricingDescription: string;
    ogLocale: string;
    features: PageMeta;
    agent: PageMeta;
  };
  skip: string;
  nav: {
    label: string;
    features: string;
    channels: string;
    agent: string;
    pricing: string;
    signIn: string;
    startTrial: string;
    home: string;
    switchTo: { label: string; title: string; lang: Lang };
    theme: string;
    menu: string;
    close: string;
    breadcrumb: string;
    allChannels: string;
    /** The AI tools column of the footer. */
    aiClients: string;
  };
  /** Feed chrome and status chips of the hero showcase cards. */
  showcase: {
    like: string;
    comment: string;
    repost: string;
    send: string;
    share: string;
    followers: string;
    now: string;
    yesterday: string;
    location: string;
    /** Under a YouTube video; "{n}" is the count. */
    views: string;
    commentsShares: string;
    status: Record<string, string>;
  };
  /** Alt text of every product screenshot, in this language. */
  shots: Record<ShotId, string>;
  /** The address bar text on framed screenshots. */
  shotUrl: string;
  hero: {
    eyebrow: string;
    title: string;
    sub: string;
    primary: string;
    secondary: string;
    fine: string;
    nets: string;
  };
  product: Head & { calloutA: string; calloutB: string; demo: CalendarDemoCopy };
  netstrip: { title: string; all: string };
  arabic: Head & { bullets: string[] };
  agentTeaser: Head & { link: string; eyebrow: string; worksWith: string };
  allFeatures: Head & { more: string };
  steps: {
    title: string;
    items: { title: string; body: string }[];
  };
  homeFaq: { title: string; items: Faq[] };
  featuresIndex: Head & { agentNav: FeatureNav };
  featurePage: {
    start: string;
    faqTitle: string;
    /** The AI agent's section on /features links to its own page. */
    agentLink: string;
  };
  features: Record<FeatureSlug, FeatureCopy>;
  agentPage: Head & {
    eyebrow: string;
    hero: ChatDemo;
    /** The "Works with" grid; the clients come from lib/aiClients.ts. */
    works: Head & {
      note: string;
      /** Clients without a page, named as text (lib/aiClients.ts MORE_AI_CLIENTS). */
      also: string;
      alsoNote: string;
      alsoLink: string;
    };
    /** Connect and ask: the address to copy, a first question, four short steps, then a
        card per client. "{api}" in code is replaced with the API address. */
    connect: Head & {
      connectTitle: string;
      connectBody: string;
      linkLabel: string;
      copy: string;
      copied: string;
      askTitle: string;
      askBody: string;
      ask: ChatDemo;
      alsoTry: string;
      suggestions: string[];
      steps: { title: string; body: string }[];
      clientsTitle: string;
      clientsSub: string;
      /** `guides` are the slugs in lib/aiClients.ts whose pages have the full steps. */
      clients: { name: string; how: string; steps: string[]; codeLabel: string; code: string; guides: string[] }[];
      guide: string;
      keyNote: string;
    };
    can: Head & { items: { icon: IconName; title: string; body: string }[] };
    cannot: string;
    inApp: Head & { points: string[] };
    connectors: Head & { badge: string; items: { icon: IconName; title: string; body: string }[]; planNote: string };
    chat: { title: string; online: string; input: string };
    faqTitle: string;
    faq: Faq[];
  };
  pricing: {
    sectionTitle: string;
    sectionSub: string;
    pageTitle: string;
    pageSub: string;
    periodLabel: string;
    monthly: string;
    yearly: string;
    /** On the Yearly option; "{pct}" is the yearly discount from the API. Hidden at 0. */
    save: string;
    mostPopular: string;
    /** After the price: "/month". */
    perMonth: string;
    billedMonthly: string;
    /** "{amount}" is the yearly total ("$470"). */
    billedYearly: string;
    /** Under a founder price: the price stays while the workspace stays subscribed. */
    founderLocked: string;
    /** Under a founder price, the regular price that follows the offer: "{price}" is the
        regular monthly (or yearly) price, "{cap}" the number of founder spots. */
    regularMonthly: string;
    regularYearly: string;
    /** The founder spots left, by plural form like `days`; "{n}" is the number. */
    spotsLeft: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
    /** The plan CTA; "{days}" is the plan's trial length from `days`. */
    trial: string;
    /** The trial length by plural form (Intl.PluralRules); "{n}" is the number. `other`
        covers any form left out. */
    days: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
    /** The plan CTA when a plan has no trial. */
    subscribe: string;
    /** The home page's link to the pricing page. */
    seeAll: string;
    /** The strip under the cards with what every plan has. */
    includedTitle: string;
    included: string;
    /** A feature line one plan has and another doesn't. */
    notIncluded: string;
    unlimited: string;
    /** The team row of a plan for one person (0 team members). */
    justYou: string;
    /** Under the cards; "{amount}" is the smallest AI credit pack's price. */
    creditPacks: string;
    /** The label of each generated feature line (lib/plans.ts FEATURE_KEYS), the value the
        plan's own number; the app's tdw_plan_feature_* strings in the same words. */
    features: Record<FeatureKey, string>;
    /** Translations of the app's default plan descriptions (Admin → Plans text is English);
        a description the admin changed shows as written. */
    descriptions: Record<string, string>;
    /** Short reassurances under the cards. */
    trust: { icon: IconName; label: string }[];
    faqTitle: string;
    faq: Faq[];
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
  referral: ReferralCopy;
  channels: ChannelsDict;
  aiClients: AiClientsDict;
  legal: LegalCopy;
  footer: {
    tagline: string;
    channelsTitle: string;
    columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[];
    copyright: string;
  };
}
