'use client';

// Brand side of the auth layout: a quiet, softly floating preview of the product
// (a LinkedIn post as the feed shows it, plus calendar chips) and the bilingual
// tagline. Pure CSS/SVG; motion lives in app/tadween/auth.scss and stops under
// prefers-reduced-motion. On phones it collapses to the tagline band.
import { FC } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Icon } from '@gitroom/frontend/components/tadween/ui';

const LinkedInAction: FC<{ d: string; label: string }> = ({ d, label }) => (
  <span className="tdw-auth-li-action">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
    {label}
  </span>
);

export const AuthBrand: FC = () => {
  const t = useT();
  return (
    <aside className="tdw-auth-brand">
      <div className="tdw-auth-stage" aria-hidden="true">
        <article className="tdw-auth-li">
          <header>
            <span className="tdw-auth-li-avatar">SN</span>
            <span className="tdw-auth-li-who">
              <b>Studio Nile</b>
              <small>{t('tdw_auth_preview_page', 'Company page')}</small>
              <small>
                {t('tdw_auth_preview_when', 'Scheduled')} ·{' '}
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm4.9 6.2h-2.1a10.8 10.8 0 0 0-.9-3.9 5.5 5.5 0 0 1 3 3.9ZM8 2.6c.6.8 1.2 2.4 1.3 4.6H6.7c.1-2.2.7-3.8 1.3-4.6ZM6.1 3.3a10.8 10.8 0 0 0-.9 3.9H3.1a5.5 5.5 0 0 1 3-3.9ZM3.1 8.8h2.1c.1 1.5.4 2.9.9 3.9a5.5 5.5 0 0 1-3-3.9ZM8 13.4c-.6-.8-1.2-2.4-1.3-4.6h2.6c-.1 2.2-.7 3.8-1.3 4.6Zm1.9-.7c.5-1 .8-2.4.9-3.9h2.1a5.5 5.5 0 0 1-3 3.9Z" />
                </svg>
              </small>
            </span>
          </header>
          <p className="tdw-auth-li-text">
            {t(
              'tdw_auth_preview_post',
              'Our Cairo studio is moving to Zamalek next month. Same team, bigger tables, better light.'
            )}
          </p>
          <div className="tdw-auth-li-media">
            <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice">
              <rect width="400" height="180" className="sky" />
              <circle cx="318" cy="52" r="22" className="sun" />
              <path d="M0 118 C 70 98 130 132 200 114 S 330 96 400 112 V180 H0Z" className="far" />
              <path d="M0 142 C 80 124 150 156 230 138 S 350 128 400 140 V180 H0Z" className="near" />
              <path d="M36 150 c 10 -26 18 -40 22 -64 M58 86 c -8 -6 -16 -6 -22 -2 M58 86 c 8 -8 16 -8 22 -4 M58 86 c -2 -9 2 -16 8 -20" className="reed" />
            </svg>
          </div>
          <footer>
            <LinkedInAction label={t('tdw_auth_preview_like', 'Like')} d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7A2 2 0 0 1 17.5 21H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z" />
            <LinkedInAction label={t('tdw_auth_preview_comment', 'Comment')} d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <LinkedInAction label={t('tdw_auth_preview_repost', 'Repost')} d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" />
            <LinkedInAction label={t('tdw_auth_preview_send', 'Send')} d="M14.5 21.7a.5.5 0 0 0 .9 0L22 2.6a.5.5 0 0 0-.6-.6L2.3 8.6a.5.5 0 0 0 0 .9l8 3.2a2 2 0 0 1 1.1 1.1ZM21.9 2.1 10.9 13.1" />
          </footer>
        </article>

        <div className="tdw-auth-float is-a">
          <span className="tdw-auth-float-dot" />
          <span>
            <b className="tdw-auth-float-time">{t('tdw_auth_preview_slot_a', 'Tue · 09:30')}</b>
            <small>{t('tdw_auth_preview_scheduled', 'Scheduled on LinkedIn')}</small>
          </span>
        </div>
        <div className="tdw-auth-float is-b">
          <span className="tdw-auth-float-dot is-draft" />
          <span>
            <b className="tdw-auth-float-time">{t('tdw_auth_preview_slot_b', 'Thu · 13:00')}</b>
            <small>{t('tdw_auth_preview_draft', 'Draft')}</small>
          </span>
        </div>
        <div className="tdw-auth-float is-c">
          <Icon name="sparkles" size={14} />
          <span>{t('tdw_auth_preview_hint', 'Your audience reads most around 9:00')}</span>
        </div>
      </div>

      <div className="tdw-auth-tagline">
        {/* The tagline is a bilingual lockup on purpose: English, then Arabic, in every UI language.
            `lbox` keeps the English line LTR on Arabic pages (global.scss flips [dir=ltr]). */}
        <p className="is-en lbox" lang="en">
          Your LinkedIn week, written and scheduled.
        </p>
        <p className="is-ar" lang="ar" dir="rtl">
          أسبوعك على لينكدإن، مكتوب ومجدول.
        </p>
      </div>
    </aside>
  );
};
