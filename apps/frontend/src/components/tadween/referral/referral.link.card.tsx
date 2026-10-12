'use client';

// ReferralLinkCard: the workspace's invite link and code, copy buttons and
// share shortcuts (WhatsApp, LinkedIn, X, and the phone's own share sheet).
// The link points at the website when Branding has one (it keeps the code in
// a cookie for 60 days), else at the app's sign-up page. Styles:
// app/tadween/referral.scss. Documented in docs/tadween/partners.md.
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

export const ReferralLinkCard: FC<{
  code: string;
  // what the friend gets on their first payment
  friendCredits: number;
  // affiliates: the longer trial their audience gets
  trialDays?: number | null;
  className?: string;
}> = ({ code, friendCredits, trialDays, className }) => {
  const t = useT();
  const toast = useToaster();
  const link = useInviteLink(code);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const message = trialDays
    ? t(
        'tdw_ref_share_text_trial',
        'I plan and schedule my LinkedIn with Tadween. Start a {{days}}-day free trial with my link and get {{n}} AI credits when you subscribe:',
        { n: friendCredits.toLocaleString(), days: trialDays }
      )
    : t(
        'tdw_ref_share_text',
        'I plan and schedule my LinkedIn with Tadween. Sign up with my link and get {{n}} AI credits when you subscribe:',
        { n: friendCredits.toLocaleString() }
      );

  const copyText = (text: string, label: string) => {
    copy(text);
    toast.show(label);
  };

  const shares = [
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

  return (
    <section className={cx('tdw-ref-card', className)} aria-labelledby="tdw-ref-card-title">
      <div className="tdw-ref-card-head">
        <span className="tdw-ref-card-badge" aria-hidden="true">
          <Icon name="gift" size={22} />
        </span>
        <div className="min-w-0">
          <h3 id="tdw-ref-card-title" className="tdw-ref-card-title">
            {t('tdw_ref_card_title', 'Give {{n}} AI credits, earn rewards', {
              n: friendCredits.toLocaleString(),
            })}
          </h3>
          <p className="tdw-ref-card-sub">
            {trialDays
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
