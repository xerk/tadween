'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';

// Channel picture with its network badge, as used across the post editor
// (scope strip, counter list, checks list). Styles: app/tadween/editor.scss.
export const TadweenChannelAvatar: FC<{
  integration: Pick<Integrations, 'picture' | 'identifier' | 'name'>;
  size?: number;
  dot?: ReactNode;
  className?: string;
}> = ({ integration, size = 22, dot, className }) => (
  <span
    className={clsx('tdw-ch-avatar', className)}
    style={{ width: size, height: size }}
  >
    <SafeImage
      src={integration.picture || '/no-picture.jpg'}
      alt={integration.name}
      width={size}
      height={size}
      className="tdw-ch-avatar-img"
      onError={(e) => {
        e.currentTarget.src = '/no-picture.jpg';
        e.currentTarget.srcset = '/no-picture.jpg';
      }}
    />
    {integration.identifier === 'youtube' ? (
      <img
        src="/icons/platforms/youtube.svg"
        className="tdw-ch-avatar-net"
        alt=""
      />
    ) : (
      <SafeImage
        src={`/icons/platforms/${integration.identifier}.png`}
        className="tdw-ch-avatar-net"
        alt={integration.identifier}
        width={12}
        height={12}
      />
    )}
    {dot}
  </span>
);
