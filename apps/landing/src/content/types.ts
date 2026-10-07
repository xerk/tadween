import type { IconName } from '@/components/icons';

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
  /** Values per plan key; true = included, false = not included, string = a value. */
  values: Record<string, boolean | string>;
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
  };
  features: {
    title: string;
    sub: string;
    items: { icon: IconName; title: string; body: string; smart?: boolean }[];
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
    faq: { title: string; content: string }[];
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
  footer: {
    tagline: string;
    columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[];
    copyright: string;
  };
}
