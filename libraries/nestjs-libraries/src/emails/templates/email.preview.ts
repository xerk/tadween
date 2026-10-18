/* eslint-disable no-console */
// Dev only: renders every email with sample data, in Arabic and English.
//
//   pnpm run emails:preview -- --out /tmp/emails [--screenshots]
//     writes <name>.<lang>.html, an index.html gallery and, with
//     --screenshots, PNGs at 600px and 375px in light and dark (Playwright).
//
//   pnpm run emails:preview -- --send --to you@example.com [--only a,b]
//     sends one "[Preview] " email per sample (Arabic above English)
//     through Resend: RESEND_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME.
//     With --dry-run (and --out <dir>) it writes those emails instead.
//
// Nothing here runs in the app.
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  EmailBrand,
  EmailLanguage,
  EmailTemplate,
  EmailTemplateData,
  emailLanguage,
  renderEmail,
} from '@gitroom/nestjs-libraries/emails/templates/email.templates';

type Sample<T extends EmailTemplate = EmailTemplate> = {
  name: string;
  template: T;
  data: EmailTemplateData<T>;
};
const sample = <T extends EmailTemplate>(
  name: string,
  template: T,
  data: EmailTemplateData<T>
): Sample => ({ name, template, data } as Sample);

const app = 'https://studio.tadween.app';
const in3days = new Date(Date.UTC(2026, 9, 16));
const today = new Date(Date.UTC(2026, 9, 13));
const in30days = new Date(Date.UTC(2026, 10, 12));

const SAMPLES: Sample[] = [
  sample('activateAccount', 'activateAccount', { url: `${app}/auth/activate/eyJhbGciOi…` }),
  sample('resetPassword', 'resetPassword', { url: `${app}/auth/forgot/eyJhbGciOi…` }),
  sample('teamInvite', 'teamInvite', {
    inviter: 'Mona Adel (mona@nilestudio.co)',
    workspace: 'Nile Studio',
    url: `${app}/?org=eyJhbGciOi…`,
  }),
  sample('postFailed', 'postFailed', {
    network: 'LinkedIn',
    channel: 'Nile Studio',
    reason: 'The image is larger than 5 MB. Upload a smaller image and try again.',
    variant: 'failed',
  }),
  sample('postFailed-disabled', 'postFailed', {
    network: 'Instagram',
    channel: 'nilestudio',
    variant: 'disabled',
  }),
  sample('postFailed-unconfirmed', 'postFailed', {
    network: 'Threads',
    channel: 'nilestudio',
    variant: 'unconfirmed',
  }),
  sample('channelReconnect', 'channelReconnect', { network: 'Facebook', channel: 'Nile Studio' }),
  sample('digest', 'digest', {
    items: [
      { html: 'Your post has been published on Linkedin', link: 'https://www.linkedin.com/feed/update/urn:li:share:1' },
      { html: 'Your post has been published on Instagram', link: 'https://www.instagram.com/p/C1/' },
      { html: 'Your post has been published on Threads' },
    ],
  }),
  sample('loginChanged', 'loginChanged', { email: 'mona@nilestudio.co' }),
  sample('subscriptionCancelled', 'subscriptionCancelled', {
    workspace: 'Nile Studio',
    email: 'mona@nilestudio.co',
    feedback: 'We only post on LinkedIn for now. Will come back when we hire a social media manager.',
  }),
  sample('partnerApplication', 'partnerApplication', {
    workspace: 'Nile Studio',
    email: 'mona@nilestudio.co',
    code: 'K7M2QX9P',
    audience: 'linkedin.com/in/mona · 12k followers',
    note: 'I teach social media for small businesses in Cairo.',
  }),
  sample('notification', 'notification', {
    title: 'Streak Ended',
    html: "<p>Your streak has ended! You didn't post anything in the last 24 hours. Schedule a post now to start a new streak!</p>",
  }),
  sample('welcome', 'welcome', { name: 'Mona' }),
  sample('welcome-referral', 'welcome', { name: 'Mona', referral: { kind: 'REFERRER', credits: 300 } }),
  sample('welcome-affiliate', 'welcome', {
    name: 'Mona',
    referral: { kind: 'AFFILIATE', credits: 500, trialDays: 14 },
  }),
  sample('waitlisted', 'waitlisted', { name: 'Mona', position: 12 }),
  sample('waitlistAdmitted', 'waitlistAdmitted', { name: 'Mona' }),
  sample('trialEnding', 'trialEnding', { trialEnd: in3days, plan: 'Creator', hasCard: false }),
  sample('trialEnding-card', 'trialEnding', { trialEnd: in3days, plan: 'Creator', hasCard: true }),
  sample('trialEnded', 'trialEnded', {}),
  sample('paymentFailed', 'paymentFailed', { amountCents: 3900, currency: 'usd' }),
  sample('paymentReceipt-started', 'paymentReceipt', {
    amountCents: 3900,
    currency: 'usd',
    plan: 'Creator',
    paidAt: today,
    started: true,
  }),
  sample('paymentReceipt', 'paymentReceipt', {
    amountCents: 3900,
    currency: 'usd',
    plan: 'Creator',
    paidAt: today,
    started: false,
  }),
  sample('referralSignedUp', 'referralSignedUp', { credits: 300 }),
  sample('referralFirstPayment', 'referralFirstPayment', { countsFrom: in30days }),
  sample('referralRewardEarned', 'referralRewardEarned', { step: 1, reward: 'credits', credits: 500 }),
  sample('referralRewardEarned-free-month', 'referralRewardEarned', { step: 3, reward: 'free_month' }),
  sample('referralRewardEarned-ambassador', 'referralRewardEarned', {
    step: 5,
    reward: 'credits',
    credits: 1000,
    ambassador: true,
  }),
  sample('referralRewardEarned-next-plan', 'referralRewardEarned', { step: 10, reward: 'next_plan_year' }),
  sample('referralRewardEarned-founder', 'referralRewardEarned', { step: 25, reward: 'founder_for_life' }),
  sample('referralReversed', 'referralReversed', { reason: 'refund' }),
  sample('referralWelcome', 'referralWelcome', { credits: 300 }),
  sample('affiliateApproved', 'affiliateApproved', { rate: 30 }),
  sample('affiliateCommissionPending', 'affiliateCommissionPending', {
    amountCents: 1170,
    rate: 30,
    availableAt: in30days,
  }),
  sample('affiliateCommissionCleared', 'affiliateCommissionCleared', { amountCents: 8190 }),
  sample('affiliatePayoutSent', 'affiliatePayoutSent', {
    amountCents: 8190,
    method: 'balance',
    creditCents: 12285,
  }),
  sample('affiliatePayoutSent-cash', 'affiliatePayoutSent', {
    amountCents: 8190,
    method: 'cash',
    reference: 'WISE-2026-10-0042',
  }),
  sample('affiliateTierUp', 'affiliateTierUp', { rate: 35, paying: 10 }),
  sample('affiliateCommissionReversed', 'affiliateCommissionReversed', {
    amountCents: 1170,
    reason: 'refund',
    alreadyPaid: true,
  }),
];

const LANGS: EmailLanguage[] = ['ar', 'en'];

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const brand = (logoUrl: string): EmailBrand => ({
  name: 'Tadween',
  appUrl: app,
  logoUrl,
  supportEmail: 'support@tadween.app',
  company: 'Xerk LLC, 30 N Gould St Ste R, Sheridan, WY 82801, United States',
});

// The language rule EmailService uses: user, then the instance default, then English
const checkLanguageRule = () => {
  const cases: [Parameters<typeof emailLanguage>, EmailLanguage][] = [
    [['ar', 'en'], 'ar'],
    [['ar-EG'], 'ar'],
    [[null, 'ar'], 'ar'],
    [['fr', 'ar'], 'ar'],
    [['fr', 'de'], 'en'],
    [[undefined, undefined], 'en'],
    [['EN_us', 'ar'], 'en'],
  ];
  for (const [input, expected] of cases) {
    const got = emailLanguage(...input);
    if (got !== expected) {
      throw new Error(`emailLanguage(${JSON.stringify(input)}) = ${got}, expected ${expected}`);
    }
  }
  // every template renders in both languages, with no unescaped sample data
  for (const s of SAMPLES) {
    for (const lang of LANGS) {
      const { subject, html } = renderEmail(s.template, lang, brand('x.png'), s.data as never);
      if (!subject || !html.includes(`dir="${lang === 'ar' ? 'rtl' : 'ltr'}"`)) {
        throw new Error(`${s.name}.${lang} rendered without a subject or direction`);
      }
    }
  }
  console.log(`Language rule and ${SAMPLES.length * LANGS.length} renders OK`);
};

const writeAll = async (out: string, screenshots: boolean) => {
  mkdirSync(out, { recursive: true });
  const files: { name: string; lang: EmailLanguage; subject: string }[] = [];
  for (const s of SAMPLES) {
    for (const lang of LANGS) {
      const { subject, html } = renderEmail(
        s.template,
        lang,
        brand(arg('logo-url') || `${app}/favicon.png`),
        s.data as never
      );
      writeFileSync(join(out, `${s.name}.${lang}.html`), html);
      files.push({ name: s.name, lang, subject });
    }
  }

  const shots = [
    { w: 600, scheme: 'light' },
    { w: 600, scheme: 'dark' },
    { w: 375, scheme: 'light' },
    { w: 375, scheme: 'dark' },
  ] as const;
  if (screenshots) {
    mkdirSync(join(out, 'shots'), { recursive: true });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { chromium } = require('playwright');
    // CHROMIUM_PATH: a Chromium already on the machine, when Playwright's own isn't installed
    const browser = await chromium.launch(
      process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
    );
    for (const shot of shots) {
      const page = await browser.newPage({
        viewport: { width: shot.w, height: 800 },
        colorScheme: shot.scheme,
        deviceScaleFactor: 2,
      });
      for (const file of files) {
        await page.goto(`file://${join(out, `${file.name}.${file.lang}.html`)}`);
        await page.waitForTimeout(50);
        await page.screenshot({
          path: join(out, 'shots', `${file.name}.${file.lang}.${shot.w}.${shot.scheme}.png`),
          fullPage: true,
        });
      }
      await page.close();
    }
    await browser.close();
  }

  const escHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const index = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tadween emails</title>
<style>
:root{--bg:#f5f5f7;--card:#fff;--fg:#1d1d1f;--muted:#68686e;--border:#e2e2e7;--primary:#0b7062}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0c;--card:#161618;--fg:#f5f5f7;--muted:#a0a0a7;--border:#2a2a2e;--primary:#3fcfb4}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px 16px}
h1{font-size:24px;margin:0 0 4px}p.lead{color:var(--muted);margin:0 0 24px}
section{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;margin:0 0 20px}
h2{font-size:17px;margin:0 0 4px}.subj{color:var(--muted);font-size:13px;margin:0 0 12px}
.row{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px}
figure{margin:0;flex:none}figcaption{font-size:12px;color:var(--muted);margin-bottom:4px}
img{display:block;border:1px solid var(--border);border-radius:8px;height:auto}
.w600 img{width:300px}.w375 img{width:188px}
a{color:var(--primary)}
</style></head><body>
<h1>Tadween emails</h1>
<p class="lead">${SAMPLES.length} emails × Arabic and English. Screenshots at 600px and 375px, light and dark. Open an HTML file to see it full size.</p>
${SAMPLES.map((s) => {
  const subjects = files.filter((f) => f.name === s.name);
  return `<section><h2>${s.name}</h2><p class="subj">${subjects
    .map((f) => `${f.lang.toUpperCase()}: ${escHtml(f.subject)} · <a href="${s.name}.${f.lang}.html">html</a>`)
    .join('<br>')}</p>${
    screenshots
      ? `<div class="row">${LANGS.flatMap((lang) =>
          shots.map(
            (shot) =>
              `<figure class="w${shot.w}"><figcaption>${lang.toUpperCase()} · ${shot.w}px · ${shot.scheme}</figcaption><a href="shots/${s.name}.${lang}.${shot.w}.${shot.scheme}.png"><img loading="lazy" src="shots/${s.name}.${lang}.${shot.w}.${shot.scheme}.png" alt=""></a></figure>`
          )
        ).join('')}</div>`
      : ''
  }</section>`;
}).join('\n')}
</body></html>`;
  writeFileSync(join(out, 'index.html'), index);
  console.log(`Wrote ${files.length} emails to ${out}`);
};

// One email per sample: the Arabic version above the English one
const combined = (s: Sample) => {
  const [ar, en] = LANGS.map((lang) =>
    renderEmail(s.template, lang, brand(arg('logo-url') || `${app}/favicon.png`), s.data as never)
  );
  const body = (html: string) =>
    html
      .slice(html.indexOf('<body'), html.indexOf('</body>') + 7)
      .replace(/^<body/, '<div')
      .replace(/<\/body>$/, '</div>');
  return {
    subject: `[Preview] ${s.name}: ${en.subject} · ${ar.subject}`,
    html:
      en.html.slice(0, en.html.indexOf('<body')) +
      '<body style="margin:0;padding:0;">' +
      body(ar.html) +
      body(en.html) +
      '</body></html>',
  };
};

const sendAll = async (to: string, dryRun: boolean) => {
  const only = arg('only')?.split(',');
  const samples = SAMPLES.filter((s) => !only || only.includes(s.name));
  if (dryRun) {
    const out = arg('out') || join(process.cwd(), 'emails-preview');
    mkdirSync(join(out, 'send'), { recursive: true });
    for (const s of samples) {
      const { subject, html } = combined(s);
      writeFileSync(join(out, 'send', `${s.name}.html`), html);
      console.log(`would send to ${to}: ${subject}`);
    }
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM_ADDRESS) {
    throw new Error('RESEND_API_KEY and EMAIL_FROM_ADDRESS are required');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `${process.env.EMAIL_FROM_NAME || 'Tadween'} <${process.env.EMAIL_FROM_ADDRESS}>`;
  for (const s of samples) {
    const { subject, html } = combined(s);
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      reply_to: process.env.EMAIL_REPLY_TO || 'support@tadween.app',
    });
    console.log(error ? `FAILED ${s.name}: ${error.message}` : `sent ${s.name}`);
    await new Promise((r) => setTimeout(r, 700));
  }
};

const main = async () => {
  checkLanguageRule();
  if (flag('send')) {
    const to = arg('to');
    if (!to) {
      throw new Error('--send needs --to <address>');
    }
    await sendAll(to, flag('dry-run'));
    return;
  }
  await writeAll(arg('out') || join(process.cwd(), 'emails-preview'), flag('screenshots'));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
