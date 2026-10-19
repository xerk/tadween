'use client';

// ReferralLinkCard: the workspace's invite link and code, copy buttons and
// share shortcuts (WhatsApp, LinkedIn, X, and the phone's own share sheet).
// The link points at the website when Branding has one (it keeps the code in
// a cookie for 60 days), else at the app's sign-up page. Styles:
// app/tadween/referral.scss. Documented in docs/tadween/partners.md.
// While payments are off (`prelaunch`) nothing is promised that needs a
// payment: the friend skips the waitlist instead of getting credits.
// The link, share text and share targets are hooks of their own, also used
// by Invite & earn's minimal card (invite.earn.tsx).
import React, { FC, useEffect, useMemo, useState } from 'react';
import copy from 'copy-to-clipboard';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useBrandLinks } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { Button, cx, Icon } from '@gitroom/frontend/components/tadween/ui';

export const useInviteLink = (code: string) => {
  const { websiteUrl } = useBrandLinks();
  const [origin, setOrigin] = useState('');
  const [arabic, setArabic] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    setArabic(document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl');
  }, []);
  return useMemo(() => {
    const ref = encodeURIComponent(code);
    if (websiteUrl) {
      return `${websiteUrl.replace(/\/+$/, '')}${arabic ? '/ar' : '/'}?ref=${ref}`;
    }
    return origin ? `${origin}/auth?ref=${ref}` : '';
  }, [websiteUrl, origin, arabic, code]);
};

// The phone's own share sheet, where the browser has one
export const useCanShare = () => {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);
  return canShare;
};

// What the share shortcuts say before the link. While payments are off
// (`prelaunch`) the friend skips the waitlist instead of getting credits.
export const useShareMessage = ({
  friendCredits,
  trialDays,
  prelaunch,
}: {
  friendCredits: number;
  trialDays?: number | null;
  prelaunch?: boolean;
}) => {
  const t = useT();
  return prelaunch
    ? t(
        'tdw_ref_share_text_prelaunch',
        'I plan and schedule my social posts with Tadween. Join with my link to skip the waitlist:'
      )
    : trialDays
    ? t(
        'tdw_ref_share_text_trial',
        'I plan and schedule my social posts with Tadween. Start a {{days}}-day free trial with my link and get {{n}} AI credits when you subscribe:',
        { n: friendCredits.toLocaleString(), days: trialDays }
      )
    : t(
        'tdw_ref_share_text',
        'I plan and schedule my social posts with Tadween. Sign up with my link and get {{n}} AI credits when you subscribe:',
        { n: friendCredits.toLocaleString() }
      );
};

// The networks' share pages, prefilled with the message and the link
export const shareTargets = (message: string, link: string) => [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    href: `https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
  },
  {
    key: 'x',
    label: 'X',
    href: `https://x.com/intent/post?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`,
  },
];

// The networks' marks (Simple Icons, CC0) in currentColor, for the icon-only
// share buttons on Invite & earn
const shareMarks: Record<string, string> = {
  whatsapp:
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
};

export const ShareMark: FC<{ network: string; size?: number }> = ({ network, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={shareMarks[network]} />
  </svg>
);

export const ReferralLinkCard: FC<{
  code: string;
  // what the friend gets on their first payment
  friendCredits: number;
  // affiliates: the longer trial their audience gets
  trialDays?: number | null;
  // payments are off: no credits or trial to promise yet
  prelaunch?: boolean;
  className?: string;
}> = ({ code, friendCredits, trialDays, prelaunch, className }) => {
  const t = useT();
  const toast = useToaster();
  const link = useInviteLink(code);
  const canShare = useCanShare();
  const message = useShareMessage({ friendCredits, trialDays, prelaunch });
  const shares = shareTargets(message, link);

  const copyText = (text: string, label: string) => {
    copy(text);
    toast.show(label);
  };

  return (
    <section className={cx('tdw-ref-card', className)} aria-labelledby="tdw-ref-card-title">
      <div className="tdw-ref-card-head">
        <span className="tdw-ref-card-badge" aria-hidden="true">
          <Icon name="gift" size={22} />
        </span>
        <div className="min-w-0">
          <h3 id="tdw-ref-card-title" className="tdw-ref-card-title">
            {prelaunch
              ? t('tdw_ref_card_title_prelaunch', 'Invite friends to Tadween')
              : t('tdw_ref_card_title', 'Give {{n}} AI credits, earn rewards', {
                  n: friendCredits.toLocaleString(),
                })}
          </h3>
          <p className="tdw-ref-card-sub">
            {prelaunch
              ? t(
                  'tdw_ref_card_sub_prelaunch',
                  'Friends who join with your link skip the waitlist and get started right away.'
                )
              : trialDays
              ? t(
                  'tdw_ref_card_sub_trial',
                  'Your audience gets a {{days}}-day trial and {{n}} AI credits on their first payment.',
                  { n: friendCredits.toLocaleString(), days: trialDays }
                )
              : t(
                  'tdw_ref_card_sub',
                  'Friends who join with your link get {{n}} AI credits on their first payment.',
                  { n: friendCredits.toLocaleString() }
                )}
          </p>
        </div>
      </div>

      <div className="tdw-ref-link">
        <label className="tdw-ref-link-label" htmlFor="tdw-ref-link">
          {t('tdw_ref_your_link', 'Your invite link')}
        </label>
        <div className="tdw-ref-link-row">
          <input
            id="tdw-ref-link"
            className="tdw-ref-link-input"
            readOnly={true}
            dir="ltr"
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            variant="primary"
            icon="copy"
            disabled={!link}
            onClick={() => copyText(link, t('tdw_ref_link_copied', 'Invite link copied'))}
          >
            {t('tdw_ref_copy_link', 'Copy link')}
          </Button>
        </div>
      </div>

      <div className="tdw-ref-card-foot">
        <button
          type="button"
          className="tdw-ref-code"
          onClick={() => copyText(code, t('tdw_ref_code_copied', 'Code copied'))}
          aria-label={t('tdw_ref_copy_code', 'Copy code {{code}}', { code })}
        >
          <span className="tdw-ref-code-label">{t('tdw_ref_code', 'Code')}</span>
          <span className="tdw-ref-code-value" dir="ltr">
            {code}
          </span>
          <Icon name="copy" size={14} />
        </button>
        <div className="tdw-ref-share" role="group" aria-label={t('tdw_ref_share', 'Share')}>
          {shares.map((s) => (
            <a
              key={s.key}
              className={cx('tdw-ref-share-btn', `is-${s.key}`)}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.label}
            </a>
          ))}
          {canShare ? (
            <button
              type="button"
              className="tdw-ref-share-btn is-native"
              onClick={() =>
                navigator
                  .share({ title: 'Tadween', text: message, url: link })
                  .catch(() => undefined)
              }
            >
              <Icon name="share-2" size={14} />
              {t('tdw_ref_share', 'Share')}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};
