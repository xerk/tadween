import {
  EMAIL_LANGUAGES,
  EmailLanguage,
  EmailStrings,
  emailStrings,
} from '@gitroom/nestjs-libraries/emails/templates/email.strings';

// Tadween: the branded email layout (Arabic RTL and English) and one builder
// per email. Pure functions with no Nest or database imports, so the preview
// script renders them without booting the app. Email-safe HTML only: tables,
// inline styles, 600px, no flex or grid, no external CSS (the <style> block is
// progressive: dark mode and the phone layout where the client supports it).

export type { EmailLanguage } from '@gitroom/nestjs-libraries/emails/templates/email.strings';

// The first one that is a language the emails speak ("ar-EG" → "ar"), else English
export const emailLanguage = (
  ...candidates: (string | null | undefined)[]
): EmailLanguage => {
  for (const candidate of candidates) {
    const primary = (candidate || '').trim().toLowerCase().split(/[-_]/)[0];
    if ((EMAIL_LANGUAGES as readonly string[]).includes(primary)) {
      return primary as EmailLanguage;
    }
  }
  return 'en';
};

export interface EmailBrand {
  name: string;
  appUrl: string;
  logoUrl: string;
  supportEmail: string;
  company: string;
}

// Rendered documents start with this, so EmailService sends them as they are
// and only wraps older fragments (digest, streak) in the layout
export const RENDERED_EMAIL_MARKER = '<!-- tadween-email -->';
export const isRenderedEmail = (html: string) =>
  (html || '').startsWith(RENDERED_EMAIL_MARKER);

export const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type Category = keyof EmailStrings['footer']['reason'];

type Block =
  | { p: string }
  | { note: string }
  | { list: string[] }
  | { rows: [string, string][] }
  | { quote: string; label: string }
  | { raw: string };

interface EmailContent {
  subject: string;
  preheader: string;
  title: string;
  blocks: Block[];
  button?: { label: string; url: string };
  category: Category;
  // non-transactional: show "Manage notifications"
  manage?: boolean;
}

interface Format {
  money: (cents: number, currency?: string) => string;
  date: (value: Date | string | number) => string;
  num: (value: number) => string;
  percent: (value: number) => string;
  url: (path: string) => string;
  // the plan's name, or the product's when it isn't known
  plan: (name?: string) => string;
}

const formatFor = (t: EmailStrings, brand: EmailBrand): Format => ({
  // Arabic spells the currency out ("39.00 دولار أمريكي"): a symbol next to
  // the number reorders badly in right-to-left text
  money: (cents, currency = 'usd') =>
    new Intl.NumberFormat(t.locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      currencyDisplay: t.dir === 'rtl' ? 'name' : 'narrowSymbol',
    }).format(cents / 100),
  date: (value) =>
    new Intl.DateTimeFormat(t.locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(value)),
  num: (value) =>
    new Intl.NumberFormat(t.locale).format(value),
  percent: (value) =>
    new Intl.NumberFormat(t.locale, { style: 'percent' }).format(value / 100),
  url: (path) => `${brand.appUrl.replace(/\/$/, '')}${path}`,
  plan: (name) => esc(name || brand.name),
});

// ── The emails ────────────────────────────────────────────────────────────────
// Each builder gets the strings of the recipient's language, formatters and
// its data; every value from the data is escaped before it reaches the HTML.
const templates = {
  activateAccount: (t: EmailStrings, f: Format, d: { url: string }): EmailContent => ({
    subject: t.activateAccount.subject,
    preheader: t.activateAccount.preheader,
    title: t.activateAccount.title,
    blocks: [{ p: t.activateAccount.body }, { note: t.activateAccount.note }],
    button: { label: t.activateAccount.button, url: d.url },
    category: 'transactional',
  }),

  resetPassword: (t: EmailStrings, f: Format, d: { url: string }): EmailContent => ({
    subject: t.resetPassword.subject,
    preheader: t.resetPassword.preheader,
    title: t.resetPassword.title,
    blocks: [{ p: t.resetPassword.body }, { note: t.resetPassword.note }],
    button: { label: t.resetPassword.button, url: d.url },
    category: 'transactional',
  }),

  teamInvite: (
    t: EmailStrings,
    f: Format,
    d: { inviter: string; workspace: string; url: string }
  ): EmailContent => ({
    subject: t.teamInvite.subject(d.inviter, d.workspace),
    preheader: t.teamInvite.preheader,
    title: t.teamInvite.title(esc(d.workspace)),
    blocks: [
      { p: t.teamInvite.body(esc(d.inviter), esc(d.workspace)) },
      { note: t.teamInvite.note },
    ],
    button: { label: t.teamInvite.button, url: d.url },
    category: 'invite',
  }),

  postFailed: (
    t: EmailStrings,
    f: Format,
    d: {
      network: string;
      channel?: string;
      reason?: string;
      variant: 'failed' | 'disabled' | 'unconfirmed';
    }
  ): EmailContent => {
    const network = esc(d.network);
    const channel = esc(d.channel || '');
    const unconfirmed = d.variant === 'unconfirmed';
    return {
      subject: unconfirmed
        ? t.postFailed.unconfirmedSubject(d.network)
        : t.postFailed.subject(d.network),
      preheader: t.postFailed.preheader,
      title: unconfirmed
        ? t.postFailed.unconfirmedTitle(network)
        : t.postFailed.title(network),
      blocks: unconfirmed
        ? [{ p: t.postFailed.unconfirmed(channel || network) }]
        : [
            { p: t.postFailed.body(network, channel) },
            ...(d.variant === 'disabled' ? [{ p: t.postFailed.disabled }] : []),
            ...(d.reason
              ? [{ quote: esc(d.reason), label: t.postFailed.reason }]
              : []),
          ],
      button: { label: t.postFailed.button, url: f.url('/launches') },
      category: 'notification',
      manage: true,
    };
  },

  channelReconnect: (
    t: EmailStrings,
    f: Format,
    d: { network: string; channel?: string }
  ): EmailContent => ({
    subject: t.channelReconnect.subject(d.network),
    preheader: t.channelReconnect.preheader,
    title: t.channelReconnect.title(esc(d.network)),
    blocks: [{ p: t.channelReconnect.body(esc(d.network), esc(d.channel || '')) }],
    button: { label: t.channelReconnect.button, url: f.url('/launches') },
    category: 'notification',
    manage: true,
  }),

  digest: (
    t: EmailStrings,
    f: Format,
    d: { items: { html: string; link?: string }[] }
  ): EmailContent => ({
    subject: t.digest.subject,
    preheader: t.digest.preheader,
    title: t.digest.title,
    blocks: [
      { p: t.digest.body },
      {
        list: d.items.map(
          (item) =>
            item.html +
            (item.link
              ? ` <a href="${esc(item.link)}" style="color:#0b7062;text-decoration:underline;" class="link">${t.digest.link}</a>`
              : '')
        ),
      },
    ],
    button: { label: t.digest.button, url: f.url('/launches') },
    category: 'notification',
    manage: true,
  }),

  loginChanged: (t: EmailStrings, f: Format, d: { email: string }): EmailContent => ({
    subject: t.loginChanged.subject,
    preheader: t.loginChanged.preheader,
    title: t.loginChanged.title,
    blocks: [
      { p: t.loginChanged.body(`<strong>${esc(d.email)}</strong>`) },
      { note: t.loginChanged.note },
    ],
    button: { label: t.loginChanged.button, url: f.url('/auth/login') },
    category: 'transactional',
  }),

  subscriptionCancelled: (
    t: EmailStrings,
    f: Format,
    d: { workspace: string; email: string; feedback?: string }
  ): EmailContent => ({
    subject: t.subscriptionCancelled.subject(d.workspace),
    preheader: t.subscriptionCancelled.preheader,
    title: t.subscriptionCancelled.title,
    blocks: [
      { p: t.subscriptionCancelled.body(esc(d.workspace), esc(d.email)) },
      {
        quote: d.feedback?.trim()
          ? esc(d.feedback.trim())
          : t.subscriptionCancelled.noFeedback,
        label: t.subscriptionCancelled.feedback,
      },
    ],
    category: 'internal',
  }),

  partnerApplication: (
    t: EmailStrings,
    f: Format,
    d: { workspace: string; email: string; code: string; audience: string; note?: string }
  ): EmailContent => ({
    subject: t.partnerApplication.subject(d.workspace),
    preheader: t.partnerApplication.preheader,
    title: t.partnerApplication.title,
    blocks: [
      { p: t.partnerApplication.body(esc(d.workspace), esc(d.email)) },
      {
        rows: [
          [t.partnerApplication.code, esc(d.code)],
          [t.partnerApplication.audience, esc(d.audience)],
        ],
      },
      {
        quote: d.note?.trim() ? esc(d.note.trim()) : t.partnerApplication.noNote,
        label: t.partnerApplication.note,
      },
      { note: t.partnerApplication.next },
    ],
    category: 'internal',
  }),

  // Older callers that send their own title and HTML (streak, agencies)
  notification: (
    t: EmailStrings,
    f: Format,
    d: { title: string; html: string }
  ): EmailContent => {
    const legacy = t.notification.legacy[d.title];
    // The inbox preview line: without one, Gmail shows the header ("Tadween") instead
    const preview = d.html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
    return {
      subject: legacy?.subject || d.title,
      preheader: legacy?.body || preview,
      title: esc(legacy?.subject || d.title),
      blocks: [{ raw: legacy ? `<p>${esc(legacy.body)}</p>` : d.html }],
      button: { label: t.notification.button, url: f.url('/launches') },
      category: 'notification',
      manage: true,
    };
  },

  welcome: (
    t: EmailStrings,
    f: Format,
    d: {
      name?: string;
      referral?: { kind: 'REFERRER' | 'AFFILIATE'; credits: number; trialDays?: number };
    }
  ): EmailContent => ({
    subject: t.welcome.subject,
    preheader: t.welcome.preheader,
    title: t.welcome.title(esc(d.name || '')),
    blocks: [
      { p: t.welcome.body },
      { list: t.welcome.steps },
      ...(d.referral
        ? [
            {
              note:
                d.referral.kind === 'AFFILIATE'
                  ? t.welcome.affiliate(
                      f.num(d.referral.credits),
                      f.num(d.referral.trialDays || 14)
                    )
                  : t.welcome.referral(f.num(d.referral.credits)),
            },
          ]
        : []),
    ],
    button: { label: t.welcome.button, url: f.url('/launches') },
    category: 'transactional',
  }),

  // Sent instead of the welcome when the free plan is full
  waitlisted: (
    t: EmailStrings,
    f: Format,
    d: { name?: string; position: number }
  ): EmailContent => ({
    subject: t.waitlisted.subject,
    preheader: t.waitlisted.preheader(f.num(d.position)),
    title: t.waitlisted.title(esc(d.name || '')),
    blocks: [
      { p: t.waitlisted.body },
      { note: t.waitlisted.position(f.num(d.position)) },
      { p: t.waitlisted.next },
    ],
    button: { label: t.waitlisted.button, url: f.url('/launches') },
    category: 'transactional',
  }),

  // A waitlisted workspace was let in: the welcome it didn't get at sign-up
  waitlistAdmitted: (
    t: EmailStrings,
    f: Format,
    d: { name?: string }
  ): EmailContent => ({
    subject: t.waitlistAdmitted.subject,
    preheader: t.waitlistAdmitted.preheader,
    title: t.waitlistAdmitted.title(esc(d.name || '')),
    blocks: [{ p: t.waitlistAdmitted.body }, { list: t.welcome.steps }],
    // straight into onboarding, which the waitlist skipped
    button: {
      label: t.waitlistAdmitted.button,
      url: f.url('/launches?onboarding=true'),
    },
    category: 'transactional',
  }),

  trialEnding: (
    t: EmailStrings,
    f: Format,
    d: { trialEnd: Date | string; plan?: string; hasCard: boolean }
  ): EmailContent => ({
    subject: t.trialEnding.subject,
    preheader: t.trialEnding.preheader(f.date(d.trialEnd)),
    title: t.trialEnding.title,
    blocks: [
      {
        p: (d.hasCard ? t.trialEnding.withCard : t.trialEnding.withoutCard)(
          `<strong>${f.date(d.trialEnd)}</strong>`,
          f.plan(d.plan)
        ),
      },
    ],
    button: {
      label: d.hasCard ? t.trialEnding.buttonCard : t.trialEnding.buttonNoCard,
      url: f.url('/billing'),
    },
    category: 'billing',
  }),

  trialEnded: (t: EmailStrings, f: Format, d: Record<string, never>): EmailContent => ({
    subject: t.trialEnded.subject,
    preheader: t.trialEnded.preheader,
    title: t.trialEnded.title,
    blocks: [{ p: t.trialEnded.body }],
    button: { label: t.trialEnded.button, url: f.url('/billing') },
    category: 'billing',
  }),

  paymentFailed: (
    t: EmailStrings,
    f: Format,
    d: { amountCents: number; currency: string }
  ): EmailContent => ({
    subject: t.paymentFailed.subject,
    preheader: t.paymentFailed.preheader,
    title: t.paymentFailed.title,
    blocks: [
      { p: t.paymentFailed.body(`<strong>${f.money(d.amountCents, d.currency)}</strong>`) },
    ],
    button: { label: t.paymentFailed.button, url: f.url('/billing') },
    category: 'billing',
  }),

  paymentReceipt: (
    t: EmailStrings,
    f: Format,
    d: {
      amountCents: number;
      currency: string;
      plan?: string;
      paidAt: Date | string;
      started: boolean;
    }
  ): EmailContent => {
    const amount = f.money(d.amountCents, d.currency);
    const plan = esc(d.plan || '');
    const started = d.started && !!plan;
    return {
      subject: started
        ? t.paymentReceipt.startedSubject(d.plan || '')
        : t.paymentReceipt.subject,
      preheader: t.paymentReceipt.preheader(amount),
      title: started ? t.paymentReceipt.startedTitle(plan) : t.paymentReceipt.title,
      blocks: [
        { p: t.paymentReceipt.body(amount) },
        ...(started ? [{ p: t.paymentReceipt.started }] : []),
        {
          rows: [
            [t.paymentReceipt.amount, amount],
            ...(plan ? [[t.paymentReceipt.plan, plan] as [string, string]] : []),
            [t.paymentReceipt.date, f.date(d.paidAt)],
          ],
        },
      ],
      button: { label: t.paymentReceipt.button, url: f.url('/billing') },
      category: 'billing',
    };
  },

  referralSignedUp: (t: EmailStrings, f: Format, d: { credits: number }): EmailContent => ({
    subject: t.referralSignedUp.subject,
    preheader: t.referralSignedUp.preheader,
    title: t.referralSignedUp.title,
    blocks: [{ p: t.referralSignedUp.body(f.num(d.credits)) }],
    button: { label: t.referralSignedUp.button, url: f.url('/partners') },
    category: 'partners',
    manage: true,
  }),

  referralFirstPayment: (
    t: EmailStrings,
    f: Format,
    d: { countsFrom: Date | string }
  ): EmailContent => ({
    subject: t.referralFirstPayment.subject,
    preheader: t.referralFirstPayment.preheader(f.date(d.countsFrom)),
    title: t.referralFirstPayment.title,
    blocks: [
      { p: t.referralFirstPayment.body(`<strong>${f.date(d.countsFrom)}</strong>`) },
    ],
    button: { label: t.referralFirstPayment.button, url: f.url('/partners') },
    category: 'partners',
  }),

  referralRewardEarned: (
    t: EmailStrings,
    f: Format,
    d: {
      step: number;
      reward: 'credits' | 'free_month' | 'next_plan_year' | 'founder_for_life';
      credits?: number;
      ambassador?: boolean;
    }
  ): EmailContent => {
    const r = t.referralRewardEarned;
    const reward =
      d.reward === 'credits'
        ? r.credits(f.num(d.credits || 0))
        : d.reward === 'free_month'
        ? r.freeMonth
        : d.reward === 'next_plan_year'
        ? r.nextPlan
        : r.founder;
    return {
      subject: r.subject,
      preheader: r.preheader,
      title: r.title,
      blocks: [
        { p: r.body(f.num(d.step)) },
        { list: [reward, ...(d.ambassador ? [r.ambassador] : [])] },
        ...(d.reward === 'credits' ? [{ note: r.note }] : []),
      ],
      button: { label: r.button, url: f.url('/partners') },
      category: 'partners',
    };
  },

  referralReversed: (
    t: EmailStrings,
    f: Format,
    d: { reason: 'refund' | 'dispute' | 'rejected' }
  ): EmailContent => ({
    subject: t.referralReversed.subject,
    preheader: t.referralReversed.preheader,
    title: t.referralReversed.title,
    blocks: [{ p: t.referralReversed[d.reason] }],
    button: { label: t.referralReversed.button, url: f.url('/partners') },
    category: 'partners',
  }),

  referralWelcome: (t: EmailStrings, f: Format, d: { credits: number }): EmailContent => ({
    subject: t.referralWelcome.subject,
    preheader: t.referralWelcome.preheader,
    title: t.referralWelcome.title,
    blocks: [{ p: t.referralWelcome.body(f.num(d.credits)) }],
    button: { label: t.referralWelcome.button, url: f.url('/billing') },
    category: 'partners',
  }),

  affiliateApproved: (t: EmailStrings, f: Format, d: { rate: number }): EmailContent => ({
    subject: t.affiliateApproved.subject,
    preheader: t.affiliateApproved.preheader,
    title: t.affiliateApproved.title,
    blocks: [
      { p: t.affiliateApproved.body(`<strong>${f.percent(d.rate)}</strong>`) },
      { list: [t.affiliateApproved.audience, t.affiliateApproved.payout] },
    ],
    button: { label: t.affiliateApproved.button, url: f.url('/partners') },
    category: 'partners',
  }),

  affiliateCommissionPending: (
    t: EmailStrings,
    f: Format,
    d: { amountCents: number; rate: number; availableAt: Date | string }
  ): EmailContent => {
    const amount = f.money(d.amountCents);
    return {
      subject: t.affiliateCommissionPending.subject(amount),
      preheader: t.affiliateCommissionPending.preheader(f.date(d.availableAt)),
      title: t.affiliateCommissionPending.title,
      blocks: [
        {
          p: t.affiliateCommissionPending.body(
            `<strong>${amount}</strong>`,
            f.percent(d.rate)
          ),
        },
        { note: t.affiliateCommissionPending.hold(f.date(d.availableAt)) },
      ],
      button: { label: t.affiliateCommissionPending.button, url: f.url('/partners') },
      category: 'partners',
    };
  },

  affiliateCommissionCleared: (
    t: EmailStrings,
    f: Format,
    d: { amountCents: number }
  ): EmailContent => {
    const amount = f.money(d.amountCents);
    return {
      subject: t.affiliateCommissionCleared.subject(amount),
      preheader: t.affiliateCommissionCleared.preheader,
      title: t.affiliateCommissionCleared.title,
      blocks: [{ p: t.affiliateCommissionCleared.body(`<strong>${amount}</strong>`) }],
      button: { label: t.affiliateCommissionCleared.button, url: f.url('/partners') },
      category: 'partners',
    };
  },

  affiliatePayoutSent: (
    t: EmailStrings,
    f: Format,
    d: {
      amountCents: number;
      method: 'balance' | 'cash';
      creditCents?: number;
      reference?: string | null;
    }
  ): EmailContent => {
    const amount = f.money(d.amountCents);
    const p = t.affiliatePayoutSent;
    return {
      subject: p.subject(amount),
      preheader: p.preheader,
      title: p.title,
      blocks: [
        {
          p:
            d.method === 'balance'
              ? p.balance(amount, `<strong>${f.money(d.creditCents || 0)}</strong>`)
              : p.cash(`<strong>${amount}</strong>`),
        },
        ...(d.reference ? [{ rows: [[p.reference, esc(d.reference)]] as [string, string][] }] : []),
      ],
      button: { label: p.button, url: f.url('/partners') },
      category: 'partners',
    };
  },

  affiliateTierUp: (
    t: EmailStrings,
    f: Format,
    d: { rate: number; paying: number }
  ): EmailContent => ({
    subject: t.affiliateTierUp.subject(f.percent(d.rate)),
    preheader: t.affiliateTierUp.preheader,
    title: t.affiliateTierUp.title(f.percent(d.rate)),
    blocks: [
      {
        p: t.affiliateTierUp.body(
          f.num(d.paying),
          `<strong>${f.percent(d.rate)}</strong>`
        ),
      },
    ],
    button: { label: t.affiliateTierUp.button, url: f.url('/partners') },
    category: 'partners',
  }),

  affiliateCommissionReversed: (
    t: EmailStrings,
    f: Format,
    d: {
      amountCents: number;
      reason: 'refund' | 'dispute' | 'rejected';
      alreadyPaid: boolean;
    }
  ): EmailContent => {
    const r = t.affiliateCommissionReversed;
    return {
      subject: r.subject,
      preheader: r.preheader,
      title: r.title,
      blocks: [
        { p: r[d.reason](`<strong>${f.money(d.amountCents)}</strong>`) },
        ...(d.alreadyPaid ? [{ note: r.paid }] : []),
      ],
      button: { label: r.button, url: f.url('/partners') },
      category: 'partners',
    };
  },
};

export type EmailTemplates = typeof templates;
export type EmailTemplate = keyof EmailTemplates;
export type EmailTemplateData<T extends EmailTemplate> = Parameters<
  EmailTemplates[T]
>[2];
export const EMAIL_TEMPLATES = Object.keys(templates) as EmailTemplate[];

// ── The layout ────────────────────────────────────────────────────────────────
// Design system tokens (light / dark): background, card, foreground,
// muted-foreground, border, primary, primary-foreground.
const C = {
  page: '#f5f5f7',
  card: '#ffffff',
  fg: '#1d1d1f',
  muted: '#68686e',
  border: '#e2e2e7',
  soft: '#f5f5f7',
  primary: '#0b7062',
  onPrimary: '#ffffff',
};
const FONT =
  "Tajawal, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Roboto, Helvetica, Arial, sans-serif";

const block = (b: Block, t: EmailStrings, align: string) => {
  const text = `font-family:${FONT};color:${C.fg};text-align:${align};`;
  if ('p' in b) {
    return `<p class="fg" style="margin:0 0 16px;${text}font-size:16px;line-height:26px;">${b.p}</p>`;
  }
  if ('note' in b) {
    return `<p class="muted" style="margin:0 0 16px;${text}color:${C.muted};font-size:14px;line-height:22px;">${b.note}</p>`;
  }
  if ('raw' in b) {
    return `<div class="fg" style="margin:0 0 16px;${text}font-size:16px;line-height:26px;">${b.raw}</div>`;
  }
  if ('list' in b) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${t.dir}" style="margin:0 0 16px;">${b.list
      .map(
        (item) =>
          `<tr><td width="20" valign="top" class="primary" style="font-family:${FONT};color:${C.primary};font-size:16px;line-height:26px;text-align:${align};">&#8226;</td><td class="fg" style="${text}font-size:16px;line-height:26px;padding-bottom:6px;">${item}</td></tr>`
      )
      .join('')}</table>`;
  }
  if ('rows' in b) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${t.dir}" class="soft" style="margin:0 0 16px;background:${C.soft};border-radius:10px;">${b.rows
      .map(
        ([label, value]) =>
          `<tr><td class="muted" style="font-family:${FONT};color:${C.muted};font-size:14px;line-height:20px;padding:10px 16px;text-align:${align};">${label}</td><td class="fg" style="font-family:${FONT};color:${C.fg};font-size:14px;line-height:20px;font-weight:600;padding:10px 16px;text-align:${align === 'left' ? 'right' : 'left'};">${value}</td></tr>`
      )
      .join('')}</table>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${t.dir}" class="soft" style="margin:0 0 16px;background:${C.soft};border-radius:10px;"><tr><td style="padding:12px 16px;text-align:${align};"><p class="muted" style="margin:0 0 4px;font-family:${FONT};color:${C.muted};font-size:13px;line-height:18px;">${b.label}</p><p class="fg" dir="auto" style="margin:0;font-family:${FONT};color:${C.fg};font-size:15px;line-height:24px;white-space:pre-wrap;word-break:break-word;">${b.quote}</p></td></tr></table>`;
};

const button = (label: string, url: string) => {
  const href = esc(url);
  // VML for Outlook on Windows, a padded link everywhere else
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td>
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="22%" stroke="f" fillcolor="${C.primary}"><w:anchorlock/><center style="color:${C.onPrimary};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${href}" class="btn" style="display:inline-block;background:${C.primary};color:${C.onPrimary};font-family:${FONT};font-size:16px;font-weight:700;line-height:22px;text-decoration:none;padding:12px 24px;border-radius:10px;mso-hide:all;">${label}</a><!--<![endif]-->
</td></tr></table>`;
};

const layout = (
  lang: EmailLanguage,
  t: EmailStrings,
  brand: EmailBrand,
  c: EmailContent
) => {
  const align = t.dir === 'rtl' ? 'right' : 'left';
  const manageUrl = `${brand.appUrl.replace(/\/$/, '')}/settings?tab=notifications`;
  const footer = [
    t.footer.reason[c.category],
    ...(c.manage
      ? [
          `<a href="${esc(manageUrl)}" class="muted" style="color:${C.muted};text-decoration:underline;">${t.footer.manage}</a>`,
        ]
      : []),
    ...(brand.supportEmail && c.category !== 'internal'
      ? [
          t.footer.help(
            `<a href="mailto:${esc(brand.supportEmail)}" class="muted" style="color:${C.muted};text-decoration:underline;">${esc(brand.supportEmail)}</a>`
          ),
        ]
      : []),
    `${esc(brand.name)} · ${esc(brand.company)}`,
  ];

  return `${RENDERED_EMAIL_MARKER}
<!DOCTYPE html>
<html lang="${lang}" dir="${t.dir}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<title>${esc(c.subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
  a { color:${C.primary}; }
  @media (max-width: 620px) {
    .container { width:100% !important; }
    .pad { padding-left:20px !important; padding-right:20px !important; }
    .card-pad { padding:24px 20px !important; }
    .title { font-size:22px !important; line-height:30px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .page { background:#0b0b0c !important; }
    .card { background:#161618 !important; border-color:#2a2a2e !important; }
    .soft { background:#232326 !important; }
    .fg, .fg p, .fg td, .fg strong { color:#f5f5f7 !important; }
    .muted, .muted a { color:#a0a0a7 !important; }
    .primary, .link { color:#3fcfb4 !important; }
    .btn { background:#3fcfb4 !important; color:#03231d !important; }
    .rule { border-color:#2a2a2e !important; }
  }
  [data-ogsc] .page { background:#0b0b0c !important; }
  [data-ogsc] .card { background:#161618 !important; }
  [data-ogsc] .fg { color:#f5f5f7 !important; }
  [data-ogsc] .muted { color:#a0a0a7 !important; }
</style>
</head>
<body class="page" dir="${t.dir}" style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};opacity:0;">${esc(c.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${t.dir}" class="page" style="background:${C.page};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="${t.dir}" class="container" style="width:600px;max-width:600px;">
<tr><td class="pad" style="padding:0 8px 20px;text-align:${align};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="${t.dir}" align="${align}"><tr>
<td style="vertical-align:middle;"><a href="${esc(brand.appUrl)}" style="text-decoration:none;"><img src="${esc(brand.logoUrl)}" width="36" height="36" alt="" style="display:block;border:0;border-radius:8px;width:36px;height:36px;"></a></td>
<td class="fg" style="vertical-align:middle;padding:0 10px;font-family:${FONT};font-size:19px;font-weight:700;letter-spacing:-0.3px;color:${C.fg};">${esc(brand.name)}</td>
</tr></table>
</td></tr>
<tr><td class="card card-pad" style="background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:36px 40px;text-align:${align};">
<h1 class="fg title" style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:32px;font-weight:700;color:${C.fg};text-align:${align};">${c.title}</h1>
${c.blocks.map((b) => block(b, t, align)).join('\n')}
${c.button ? button(c.button.label, c.button.url) : ''}
${
  c.button
    ? `<p class="muted" style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};text-align:${align};">${t.footer.buttonFallback}<br><a href="${esc(c.button.url)}" class="muted" style="color:${C.muted};word-break:break-all;" dir="ltr">${esc(c.button.url)}</a></p>`
    : ''
}
</td></tr>
<tr><td class="pad" style="padding:24px 8px 0;text-align:${align};">
${footer
  .map(
    (line) =>
      `<p class="muted" style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted};text-align:${align};">${line}</p>`
  )
  .join('\n')}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
};

export const renderEmail = <T extends EmailTemplate>(
  template: T,
  lang: EmailLanguage,
  brand: EmailBrand,
  data: EmailTemplateData<T>
) => {
  const t = emailStrings[lang];
  const builder = templates[template] as (
    t: EmailStrings,
    f: Format,
    d: EmailTemplateData<T>
  ) => EmailContent;
  const content = builder(t, formatFor(t, brand), data);
  return { subject: content.subject, html: layout(lang, t, brand, content) };
};
