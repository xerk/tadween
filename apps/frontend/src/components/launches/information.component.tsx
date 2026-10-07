'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { capitalize } from 'lodash';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { hasLinks } from '@gitroom/helpers/utils/strip.links';
import { countLength } from '@gitroom/helpers/utils/count.length';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';

export const InformationComponent: FC<{
  chars: Record<string, number>;
  totalChars: number;
  totalAllowedChars: number;
  isPicture: boolean;
  text?: string;
}> = ({ totalChars, totalAllowedChars, chars, isPicture, text }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const { isGlobal, selectedIntegrations, internal, currentIntegration } =
    useLaunchStore(
      useShallow((state) => ({
        isGlobal: state.current === 'global',
        selectedIntegrations: state.selectedIntegrations,
        internal: state.internal,
        currentIntegration: state.integrations.find(
          (p) => p.id === state.current
        ),
      }))
    );

  const stripLinkNames = useMemo(() => {
    if (!hasLinks(text)) {
      return [] as string[];
    }

    if (!isGlobal) {
      return currentIntegration?.stripLinks ? [currentIntegration.name] : [];
    }

    return selectedIntegrations
      .filter((p) => p.integration.stripLinks)
      .map((p) => p.integration.name);
  }, [text, isGlobal, currentIntegration, selectedIntegrations]);

  const showStripLinkWarning = stripLinkNames.length > 0;

  const countFor = useCallback(
    (identifier?: string) => countLength(identifier || '', text || ''),
    [text]
  );

  const currentChars = countFor(currentIntegration?.identifier);

  const isInternal = useMemo(() => {
    if (!isGlobal) {
      return [];
    }
    return selectedIntegrations.map((p) => {
      const findIt = internal.find(
        (a) => a.integration.id === p.integration.id
      );

      return !!findIt;
    });
  }, [isGlobal, internal, selectedIntegrations]);

  const isValid = useMemo(() => {
    if (showStripLinkWarning) {
      return false;
    }

    if (!isPicture && !totalChars) {
      return false;
    }

    if (currentChars > totalAllowedChars && !isGlobal) {
      return false;
    }

    if (currentChars <= totalAllowedChars && !isGlobal) {
      return true;
    }

    if (
      selectedIntegrations.some((p, index) => {
        if (isInternal[index]) {
          return false;
        }

        return (
          countFor(p.integration.identifier) >
          (chars?.[p.integration.id] || 0)
        );
      })
    ) {
      return false;
    }

    return true;
  }, [
    totalAllowedChars,
    totalChars,
    currentChars,
    countFor,
    isInternal,
    isPicture,
    chars,
    showStripLinkWarning,
  ]);

  const globalDisplayLimit = useMemo(() => {
    if (!isGlobal || !selectedIntegrations.length) {
      return null;
    }

    // Get all limits from non-internal integrations, sorted ascending
    const limits = selectedIntegrations
      .map((p, index) => ({
        limit: chars?.[p.integration.id] || 0,
        count: countFor(p.integration.identifier),
        isInternal: isInternal[index],
      }))
      .filter((item) => !item.isInternal && item.limit > 0)
      .sort((a, b) => a.limit - b.limit);

    if (!limits.length) {
      return null;
    }

    // Find the smallest limit that hasn't been exceeded yet
    // If all are exceeded, show the smallest one
    const validLimit = limits.find((item) => item.count <= item.limit);
    return validLimit ?? limits[0];
  }, [isGlobal, selectedIntegrations, chars, isInternal, countFor]);

  // Tadween counter: a ring filling toward the limit that matters (this
  // channel's, or the tightest one still on the shared post), warning near
  // it, red past it. Hover or tap for every channel's count.
  const overInGlobal = !isGlobal
    ? undefined
    : selectedIntegrations
        .map((p, index) => ({
          count: countFor(p.integration.identifier),
          limit: chars?.[p.integration.id] || 0,
          isInternal: isInternal[index],
        }))
        .find((item) => !item.isInternal && item.count > item.limit);

  const isOver = !isGlobal
    ? currentChars > totalAllowedChars
    : !!overInGlobal;

  // In "All channels" a channel past its limit is what the ring shows.
  const display = !isGlobal
    ? { count: currentChars, limit: totalAllowedChars }
    : overInGlobal || globalDisplayLimit;

  const isNear =
    !!display?.limit &&
    display.limit - display.count < Math.min(300, display.limit * 0.1);

  const ring = 2 * Math.PI * 7;
  const fill = display?.limit ? Math.min(1, display.count / display.limit) : 0;
  const hasList = (isGlobal && !!selectedIntegrations.length) || !isValid;

  return (
    <div
      ref={ref}
      className={clsx(
        'tdw-counter',
        isOver ? 'is-over' : (isNear || showStripLinkWarning) && 'is-near',
        open && 'is-open',
        !selectedIntegrations.length && 'mobile:hidden'
      )}
    >
      <button
        type="button"
        className="tdw-counter-btn"
        aria-expanded={hasList ? open : undefined}
        onClick={() => hasList && setOpen(!open)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="9" cy="9" r="7" className="tdw-counter-track" />
          <circle
            cx="9"
            cy="9"
            r="7"
            className="tdw-counter-fill"
            strokeDasharray={ring}
            strokeDashoffset={ring * (1 - fill)}
          />
        </svg>
        {!!display && (
          <span className="tdw-counter-num">
            {display.count.toLocaleString()}/{display.limit.toLocaleString()}
          </span>
        )}
      </button>
      {hasList && (
        <div className="tdw-limits" role="dialog">
          {!isPicture && !totalChars && (
            <div className="tdw-limits-empty">
              {t(
                'your_post_should_have_at_least_one_character_or_one_image',
                'Your post should have at least one character or one image.'
              )}
            </div>
          )}
          {isGlobal && (
            <>
              <div className="tdw-limits-h">
                {t('tdw_length_by_channel', 'Length by channel')}
              </div>
              {selectedIntegrations.map((p, index) => (
                <div
                  key={p.integration.id}
                  className={clsx(
                    'tdw-limits-row',
                    !isInternal?.[index] &&
                      countFor(p.integration.identifier) >
                        (chars?.[p.integration.id] || 0) &&
                      'is-over'
                  )}
                >
                  <TadweenChannelAvatar integration={p.integration} size={22} />
                  <span className="tdw-limits-name">
                    {p.integration.name}{' '}
                    <span className="tdw-limits-net">
                      {capitalize(p.integration.identifier.split('-')[0])}
                    </span>
                  </span>
                  <span className="tdw-limits-num">
                    {isInternal?.[index]
                      ? t('tdw_own_version', 'own version')
                      : `${countFor(
                          p.integration.identifier
                        ).toLocaleString()}/${(
                          chars?.[p.integration.id] || 0
                        ).toLocaleString()}`}
                  </span>
                </div>
              ))}
            </>
          )}
          {showStripLinkWarning && (
            <div className="tdw-limits-note">
              {t('links_will_be_removed_from', 'Links will be removed from')}:{' '}
              {stripLinkNames.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
