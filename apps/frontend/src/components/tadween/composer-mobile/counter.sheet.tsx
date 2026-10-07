'use client';

import { FC, ReactNode, useState } from 'react';
import clsx from 'clsx';
import { capitalize } from 'lodash';
import { useShallow } from 'zustand/react/shallow';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { countLength } from '@gitroom/helpers/utils/count.length';
import { hasLinks } from '@gitroom/helpers/utils/strip.links';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import { TadweenSheet } from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';

// Phones: the editor's counter ring sits in the accessory bar, and a tap opens
// the per-channel lengths in a sheet instead of the desktop popover. The ring
// itself is the editor's own counter (passed as children), so what it shows
// and when it turns red stay in one place.
export const ComposerCounter: FC<{
  text: string;
  children: ReactNode;
}> = ({ text, children }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { isGlobal, selectedIntegrations, internal, current, chars } =
    useLaunchStore(
      useShallow((state) => ({
        isGlobal: state.current === 'global',
        current: state.current,
        selectedIntegrations: state.selectedIntegrations,
        internal: state.internal,
        chars: state.chars,
      }))
    );

  const rows = selectedIntegrations
    .filter((p) => isGlobal || p.integration.id === current)
    .map(({ integration }) => {
      const own =
        isGlobal && internal.some((p) => p.integration.id === integration.id);
      const count = countLength(integration.identifier, text);
      const limit = chars?.[integration.id] || 0;
      return { integration, own, count, limit, over: !own && count > limit };
    });

  const stripLinks = hasLinks(text)
    ? rows.filter((p) => !p.own && p.integration.stripLinks)
    : [];

  return (
    <>
      <div className="tdw-cm-counter" onClickCapture={() => setOpen(true)}>
        {children}
      </div>
      <TadweenSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('tdw_length_by_channel', 'Length by channel')}
      >
        {!text.length && (
          <p className="tdw-cm-sheet-hint">
            {t(
              'your_post_should_have_at_least_one_character_or_one_image',
              'Your post should have at least one character or one image.'
            )}
          </p>
        )}
        <div className="tdw-cm-limits">
          {rows.map((row) => (
            <div
              key={row.integration.id}
              className={clsx('tdw-cm-limits-row', row.over && 'is-over')}
            >
              <TadweenChannelAvatar integration={row.integration} size={32} />
              <span className="tdw-cm-limits-name">
                <b>{row.integration.name}</b>
                <span>
                  {capitalize(row.integration.identifier.split('-')[0])}
                </span>
              </span>
              <span className="tdw-cm-limits-num">
                {row.own
                  ? t('tdw_own_version', 'own version')
                  : `${row.count.toLocaleString()}/${row.limit.toLocaleString()}`}
              </span>
              {!row.own && (
                <span
                  className="tdw-cm-limits-bar"
                  aria-hidden="true"
                  style={{
                    ['--fill' as string]: `${Math.min(
                      100,
                      row.limit ? (row.count / row.limit) * 100 : 0
                    )}%`,
                  }}
                />
              )}
            </div>
          ))}
        </div>
        {!!stripLinks.length && (
          <p className="tdw-cm-sheet-hint">
            {t('links_will_be_removed_from', 'Links will be removed from')}:{' '}
            {stripLinks.map((p) => p.integration.name).join(', ')}
          </p>
        )}
      </TadweenSheet>
    </>
  );
};
