import { notFound } from 'next/navigation';
import { ReferralPage } from '@/components/pages';
import { ar } from '@/content/ar';
import { REFERRAL_PROGRAM } from '@/lib/config';
import { PATHS } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(ar, { path: PATHS.referral, title: ar.referral.meta.title, description: ar.referral.meta.description, og: 'referral' });

export default function ArabicReferral() {
  // Invite & earn is built only with NEXT_PUBLIC_REFERRAL_PROGRAM=1.
  if (!REFERRAL_PROGRAM) notFound();
  return <ReferralPage t={ar} />;
}
