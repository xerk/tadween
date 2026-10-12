import { notFound } from 'next/navigation';
import { ReferralPage } from '@/components/pages';
import { en } from '@/content/en';
import { REFERRAL_PROGRAM } from '@/lib/config';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(en, { path: PATHS.referral, title: en.referral.meta.title, description: en.referral.meta.description, og: 'referral' });

export default function Referral() {
  // Invite & earn is built only with NEXT_PUBLIC_REFERRAL_PROGRAM=1.
  if (!REFERRAL_PROGRAM) notFound();
  return <ReferralPage t={en} />;
}
