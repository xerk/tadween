'use client';

// "Invite & earn" in the top bar (new-layout/layout.component.tsx), to
// /invite. Shown while the `affiliate` switch is on, payments on or off; not
// for a waitlisted workspace (it never gets the top bar, and /partners/me is
// closed to it). A quiet pill with the gift on desktop; in the phone layout
// the gift alone stays in the compact bar (Upgrade moves to More there).
// Styles: app/tadween/consistency.scss.
import { FC } from 'react';
import Link from 'next/link';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFeatures } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { Icon } from '@gitroom/frontend/components/tadween/ui';

export const InviteEarnButton: FC = () => {
  const t = useT();
  const user = useUser();
  const isOn = useFeatures();
  const label = t('tdw_invite_earn', 'Invite & earn');
  if (!user?.orgId || user.waitlisted || !isOn('affiliate')) {
    return null;
  }
  return (
    <Link
      href="/invite"
      className="tdw-invite-pill"
      aria-label={label}
      title={label}
    >
      <Icon name="gift" size={16} />
      <span className="tdw-invite-label">{label}</span>
    </Link>
  );
};
