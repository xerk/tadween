'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import clsx from 'clsx';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { GlobalIcon } from '@gitroom/frontend/components/ui/icons';

const initials = (value: string) =>
  value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

// A channel picture that never shows a broken image: no picture uses the
// default one, a picture that fails to load turns into the name's initials.
export const TadweenAvatarImage: FC<{
  src?: string | null;
  name?: string;
  className?: string;
}> = ({ src, name = '', className }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <span
        className={clsx('tdw-avatar-initials', className)}
        role="img"
        aria-label={name}
      >
        {initials(name) || '?'}
      </span>
    );
  }

  return (
    <SafeImage
      src={src || '/no-picture.jpg'}
      alt={name}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

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
    <TadweenAvatarImage
      src={integration.picture}
      name={integration.name}
      className="tdw-ch-avatar-img"
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

// The "All channels" identity in the post preview: an icon, no picture to load.
export const TadweenGlobalAvatar: FC<{ size?: number }> = ({ size = 40 }) => (
  <span
    className="tdw-global-avatar"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <GlobalIcon size={Math.round(size / 2)} />
  </span>
);

// One mark per network the post goes to, side by side (no overlapping stack).
export const TadweenNetworkMarks: FC<{ identifiers: string[] }> = ({
  identifiers,
}) => (
  <span className="tdw-net-marks">
    {identifiers.map((identifier) => (
      <SafeImage
        key={identifier}
        src={`/icons/platforms/${identifier}.png`}
        alt={identifier}
        width={14}
        height={14}
      />
    ))}
  </span>
);
