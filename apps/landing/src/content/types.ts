import type { IconName } from '@/components/icons';
import type { ClientAuth, ClientKind, McpTool } from '@/lib/aiClients';
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
  /** The sample post typed into the composer for this network's screenshot (see docs/tadween/demo-data.md). */
  sample: string;
}

export interface ChannelsDict {
  meta: PageMeta;
  index: Head & {
    groups: Record<ChannelGroup, string>;
    more: Head;
  };
  /** Networks listed on the overview without a page (lib/channels.ts OTHER_CHANNELS). */
  others: Record<string, { name?: string; note: string }>;
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
  /** Four example requests, LinkedIn first; `nets` are channel slugs for the icons. */
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
    columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[];
    copyright: string;
  };
}
