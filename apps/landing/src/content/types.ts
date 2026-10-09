import type { IconName } from '@/components/icons';
import type { ChannelGroup } from '@/lib/channels';

export type Lang = 'en' | 'ar';

export interface PostAuthor {
  name: string;
  headline: string;
  initials: string;
}

export interface LinkedInLabels {
  you: string;
  now: string;
  visibleToAnyone: string;
  comments: string;
  reposts: string;
  actions: [string, string, string, string];
}

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

export type ArtKind = 'linkedin' | 'calendar' | 'team' | 'analytics' | 'media' | 'agent' | 'arabic' | 'automation';

export interface FeatureDetail {
  /** Anchor on /features. */
  id: string;
  icon: IconName;
  title: string;
  body: string;
  art: ArtKind;
  points: string[];
  smart?: boolean;
}

export interface CodeSample {
  label: string;
  code: string;
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
    open: string;
  };
  page: {
    eyebrow: string;
    start: string;
    factsTitle: string;
    limit: string;
    characters: string;
    editor: string;
    editors: Record<'normal' | 'markdown' | 'html', string>;
    comments: string;
    commentsValue: { yes: string; text: string; no: string };
    formatsTitle: string;
    mediaTitle: string;
    featuresTitle: string;
    shared: { icon: IconName; title: string; body: string }[];
    previewTitle: string;
    previewNote: string;
    previewAuthor: PostAuthor;
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
    developers: PageMeta;
  };
  skip: string;
  nav: {
    label: string;
    links: { href: string; label: string }[];
    signIn: string;
    startTrial: string;
    home: string;
    switchTo: { label: string; title: string; lang: Lang };
    theme: string;
    menu: string;
    breadcrumb: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    sub: string;
    primary: string;
    secondary: string;
    fine: string;
    tagBest: string;
    tagScheduled: string;
    scroll: string;
  };
  linkedin: LinkedInLabels;
  flow: {
    title: string;
    steps: { title: string; body: string; icon: IconName }[];
    author: PostAuthor;
    text: string;
    chipWhen: string;
    chipWhere: string;
    published: string;
    publishedWhere: string;
    /** Short sample posts for the per-network preview step, keyed by preview kind. */
    xText: string;
    threadsText: string;
    week: string[];
  };
  proof: {
    title: string;
    placeholder: string;
    logo: string;
    quote: string;
    quoteBy: string;
  };
  /** The home page's feature grid; its cards are featuresPage.sections. */
  features: Head & { more: string };
  channelsSection: Head & { all: string; more: string };
  agentTeaser: Head & {
    prompt: string;
    calls: { tool: string; label: string }[];
    done: string;
    link: string;
  };
  homeFaq: { title: string; items: Faq[] };
  featuresPage: Head & {
    jump: string;
    sections: FeatureDetail[];
  };
  agentPage: Head & {
    eyebrow: string;
    can: Head & { items: { icon: IconName; title: string; body: string }[] };
    cannot: string;
    connect: Head & {
      steps: { title: string; body: string }[];
      endpointLabel: string;
      keyLabel: string;
      clientsNote: string;
    };
    prompts: Head & { items: { lang: Lang; text: string }[] };
    inApp: Head & { points: string[] };
    connectors: Head & { badge: string; items: { icon: IconName; title: string; body: string }[]; planNote: string };
    faq: Faq[];
  };
  developersPage: Head & {
    eyebrow: string;
    api: Head & { authNote: string; groups: { title: string; endpoints: [string, string, string][] }[] };
    mcp: Head & { samples: CodeSample[] };
    webhooks: Head & { points: string[] };
    automate: Head & { points: string[] };
    limits: Head & { points: string[] };
  };
  steps: {
    title: string;
    items: { icon: IconName; title: string; body: string }[];
  };
  arabic: {
    title: string;
    sub: string;
    bullets: string[];
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
    columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[];
    copyright: string;
  };
}
