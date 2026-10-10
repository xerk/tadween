import type { IconName } from '@/components/icons';
import type { ClientAuth, ClientKind } from '@/lib/aiClients';
import type { ChannelGroup } from '@/lib/channels';
import type { FeatureSlug } from '@/lib/routes';
import type { ShotId } from '@/lib/shots';

export type Lang = 'en' | 'ar';

/** Placeholder plan copy and prices; the API (when configured) overrides prices and limits. */
export interface PlanCopy {
  key: string;
  name: string;
  for: string;
  features: string[];
}

export interface CompareRow {
  label: string;
  help: string;
  /** Read the value from the plan (so plans edited in the app show here) instead of `values`. */
  field?: 'channels' | 'teamMembers' | 'aiCredits' | 'webhooks' | 'autoPost';
  /** Values per plan key; true = included, false = not included, string = a value. */
  values?: Record<string, boolean | string>;
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

/** A menu or card entry for a feature page. */
export interface FeatureNav {
  label: string;
  blurb: string;
}

/** One block of a feature page: copy beside a product screenshot. */
export interface Benefit {
  /** Anchor for links into this block (e.g. /features/composer#arabic). */
  id?: string;
  title: string;
  body: string;
  points?: string[];
  shot: ShotId;
}

/** A tool page under /features. Its icon and related pages live in lib/features.ts. */
export interface FeatureCopy {
  nav: FeatureNav;
  meta: PageMeta;
  h1: string;
  sub: string;
  hero: ShotId;
  /** Two short labels pinned to the hero screenshot. */
  callouts?: [string, string];
  benefits: Benefit[];
  steps: { title: string; body: string }[];
  faq: Faq[];
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
  /** The sample post typed into the composer for this network's screenshot (see docs/tadween/demo-data.md). */
  sample: string;
}

export interface ChannelsDict {
  meta: PageMeta;
  index: Head & {
    groups: Record<ChannelGroup, string>;
    more: Head;
  };
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
  intro: string;
  /** What the client is, in a few words, for cards and the menu. */
  blurb: string;
  /** The text of each step of each connection method, in the order lib/aiClients.ts lists them. */
  methods: Partial<Record<ClientAuth, { label: string; how: string; steps: string[] }>>;
  /** The conversation the hero draws inside the client. */
  demo: ChatDemo;
  /** First things to ask, in English and Egyptian Arabic. */
  prompts: { lang: Lang; text: string }[];
  /** Notes that apply to this client only (plans, where the setting lives). */
  notes: string[];
  faq: Faq[];
}

export interface AiClientsDict {
  /** Labels shared by every client page; "{name}" is the client's name. */
  page: {
    eyebrow: string;
    start: string;
    stepsLink: string;
    /** "{n}" is the number of steps. */
    connectTitle: string;
    connectSub: string;
    /** The client window in the hero: its status line and input placeholder. */
    frameOnline: string;
    frameInput: string;
    /** Marks the first of two ways to connect. */
    recommended: string;
    /** Before the links to the vendor's own documentation. */
    docs: string;
    promptsTitle: string;
    promptsSub: string;
    canTitle: string;
    canSub: string;
    channelsTitle: string;
    channelsSub: string;
    securityTitle: string;
    security: { icon: IconName; title: string; body: string }[];
    faqTitle: string;
    relatedTitle: string;
    allClients: string;
    ctaTitle: string;
    ctaBody: string;
    /** Questions every client page answers, before its own. */
    sharedFaq: Faq[];
  };
  /** Group titles of the "Works with" grid on the AI agent page. */
  kinds: Record<ClientKind, string>;
  items: Record<string, AiClientCopy>;
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
    resources: string;
    pricing: string;
    signIn: string;
    startTrial: string;
    home: string;
    switchTo: { label: string; title: string; lang: Lang };
    theme: string;
    menu: string;
    close: string;
    breadcrumb: string;
    allFeatures: string;
    allChannels: string;
    /** The AI clients group in the Resources menu and the phone sheet. */
    aiClients: string;
    /** The featured card in the Features menu. */
    spotlight: { title: string; body: string };
    resourceLinks: { href: string; label: string; body: string; icon: IconName; external?: boolean }[];
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
    sound: string;
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
  product: Head & { calloutA: string; calloutB: string };
  netstrip: { title: string; all: string };
  tour: Head & {
    rows: { href: string; kicker: string; icon: IconName; title: string; body: string; points: string[]; shot: ShotId; link: string }[];
  };
  arabic: Head & { bullets: string[] };
  agentTeaser: Head & { link: string; eyebrow: string };
  allFeatures: Head & { more: string };
  steps: {
    title: string;
    items: { title: string; body: string }[];
  };
  homeFaq: { title: string; items: Faq[] };
  featuresIndex: Head & { agentNav: FeatureNav };
  featurePage: {
    start: string;
    tour: string;
    howTitle: string;
    relatedTitle: string;
    faqTitle: string;
  };
  features: Record<FeatureSlug, FeatureCopy>;
  agentPage: Head & {
    eyebrow: string;
    hero: ChatDemo;
    /** The "Works with" grid; the clients come from lib/aiClients.ts. */
    works: Head & { note: string };
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
    examples: Head & { items: ChatDemo[] };
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
    currencyLabel: string;
    currencies: { EGP: string; SAR: string; USD: string };
    save: string;
    placeholder: string;
    mostPopular: string;
    perMonth: string;
    billedMonthly: string;
    /** "{amount}" is replaced with the formatted yearly total. */
    billedYearly: string;
    perMonthShort: string;
    trial: string;
    note: string;
    noteApi: string;
    compareTitle: string;
    compareLink: string;
    included: string;
    notIncluded: string;
    notListed: string;
    faqTitle: string;
    plans: PlanCopy[];
    compare: CompareRow[];
    faq: Faq[];
    unlimited: string;
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
  channels: ChannelsDict;
  aiClients: AiClientsDict;
  footer: {
    tagline: string;
    channelsTitle: string;
    toolsTitle: string;
    columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[];
    copyright: string;
  };
}
