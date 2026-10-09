import type { IconName } from '@/components/icons';
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
  /** The sample post the preview shows. */
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
    /** Caption for networks without their own screenshot yet. */
    previewGeneric: string;
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
    learnMore: string;
  };
  features: Record<FeatureSlug, FeatureCopy>;
  agentPage: Head & {
    eyebrow: string;
    hero: ChatDemo;
    works: Head & { items: string[]; note: string };
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
      clients: { name: string; how: string; steps: string[]; codeLabel: string; code: string }[];
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
    currencies: { EGP: string; USD: string };
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
  footer: {
    tagline: string;
    channelsTitle: string;
    toolsTitle: string;
    columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[];
    copyright: string;
  };
}
