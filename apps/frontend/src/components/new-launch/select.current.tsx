'use client';

import {
  FC,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  SelectedIntegrations,
  useLaunchStore,
} from '@gitroom/frontend/components/new-launch/store';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { GlobalIcon } from '@gitroom/frontend/components/ui/icons';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import { TadweenIcon } from '@gitroom/frontend/components/tadween/editor/icons';
import { useEditorChecks } from '@gitroom/frontend/components/tadween/editor/checks';
import { PHONE_QUERY } from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import {
  useDecisionModal,
  useModals,
} from '@gitroom/frontend/components/layout/new-modal';

export function useHasScroll(ref: RefObject<HTMLElement | null>): boolean {
  const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const checkScroll = () => {
      const el = ref.current;
      if (el) {
        setHasHorizontalScroll(el.scrollWidth > el.clientWidth);
      }
    };

    checkScroll(); // initial check

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(ref.current);

    const mutationObserver = new MutationObserver(checkScroll);
    mutationObserver.observe(ref.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref]);

  return hasHorizontalScroll;
}

export const SelectCurrent: FC = () => {
  const modals = useDecisionModal();
  const {
    selectedIntegrations,
    current,
    setCurrent,
    locked,
    setHide,
    addOrRemoveSelectedIntegration,
  } = useLaunchStore(
    useShallow((state) => ({
      selectedIntegrations: state.selectedIntegrations,
      addOrRemoveSelectedIntegration: state.addOrRemoveSelectedIntegration,
      current: state.current,
      setCurrent: state.setCurrent,
      locked: state.locked,
      setHide: state.setHide,
    }))
  );

  const t = useT();
  const { checks } = useEditorChecks();

  // phones: the strip scrolls sideways, keep the open tab in view (after a
  // jump from the checks sheet, for example)
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (
      !strip ||
      !tab ||
      !window.matchMedia(PHONE_QUERY).matches ||
      strip.scrollWidth <= strip.clientWidth
    ) {
      return;
    }
    const box = strip.getBoundingClientRect();
    const item = tab.getBoundingClientRect();
    if (item.left < box.left || item.right > box.right) {
      strip.scrollBy({
        left: item.left + item.width / 2 - (box.left + box.width / 2),
        behavior: 'smooth',
      });
    }
  }, [current, selectedIntegrations.length]);

  const removeSocial = useCallback(
    (sIntegration: Integrations) => async (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      const open = await modals.open({
        title: 'Remove Social Account',
        description:
          'Are you sure you want to remove this social from scheduling?',
      });

      if (!open) {
        return;
      }

      addOrRemoveSelectedIntegration(sIntegration, {});
    },
    []
  );

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label={t('tdw_editing', 'Editing')}
      className={clsx(
        'tdw-scope-strip select-none',
        locked && 'opacity-50 pointer-events-none'
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={current === 'global'}
        onClick={() => {
          setHide(true);
          setCurrent('global');
        }}
        className={clsx('tdw-scope', current === 'global' && 'is-on')}
      >
        <GlobalIcon />
        <span>{t('tdw_all_channels', 'All channels')}</span>
      </button>
      <span className="tdw-scope-sep" aria-hidden="true" />
      {selectedIntegrations.map(({ integration }) => {
        const hasIssue = checks.some(
          (p) => p.integration.id === integration.id
        );
        return (
          <div key={integration.id} className="tdw-scope-item">
            <button
              type="button"
              role="tab"
              aria-selected={current === integration.id}
              aria-label={integration.name}
              onClick={() => {
                setHide(true);
                setCurrent(integration.id);
              }}
              {...{
                'data-tooltip-id': 'tooltip',
                'data-tooltip-content': integration.name,
              }}
              className={clsx(
                'tdw-scope tdw-scope-ch',
                current === integration.id && 'is-on'
              )}
            >
              <TadweenChannelAvatar
                integration={integration}
                size={26}
                dot={
                  hasIssue ? (
                    <span className="tdw-ch-dot is-error" />
                  ) : (
                    <IsGlobal id={integration.id} />
                  )
                }
              />
            </button>
            <button
              type="button"
              onClick={removeSocial(integration)}
              aria-label={t('tdw_remove_channel_name', 'Remove {{name}}', {
                name: integration.name,
              })}
              className="tdw-scope-x"
            >
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">
                <path
                  d="M2 2l6 6M8 2L2 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const IsGlobal: FC<{ id: string }> = ({ id }) => {
  const t = useT();
  const { isInternal } = useLaunchStore(
    useShallow((state) => ({
      isInternal: !!state.internal.find((p) => p.integration.id === id),
    }))
  );

  if (!isInternal) {
    return null;
  }

  return (
    <span
      data-tooltip-id="tooltip"
      data-tooltip-content={t(
        'no_longer_global_mode',
        'No longer in global mode'
      )}
      className="tdw-ch-dot is-custom"
    >
      <TadweenIcon name="pencil" size={7} strokeWidth={3} />
    </span>
  );
};

// While editing "All channels" the inspector previews one selected channel at
// a time; with several selected, one avatar tab each picks which (styles:
// .tdw-scope-strip.is-compact in app/tadween/editor.scss).
export const SelectPreview: FC<{
  value?: string;
  onChange: (id: string) => void;
}> = ({ value, onChange }) => {
  const t = useT();
  const selectedIntegrations = useLaunchStore(
    (state) => state.selectedIntegrations
  );

  if (selectedIntegrations.length < 2) {
    return null;
  }

  const shown =
    selectedIntegrations.find((p) => p.integration.id === value) ||
    selectedIntegrations[0];

  return (
    <div
      role="tablist"
      aria-label={t('tdw_preview_as', 'Preview as')}
      className="tdw-scope-strip is-compact select-none"
    >
      {selectedIntegrations.map(({ integration }) => (
        <button
          key={integration.id}
          type="button"
          role="tab"
          aria-selected={shown.integration.id === integration.id}
          aria-label={integration.name}
          onClick={() => onChange(integration.id)}
          {...{
            'data-tooltip-id': 'tooltip',
            'data-tooltip-content': integration.name,
          }}
          className={clsx(
            'tdw-scope tdw-scope-ch',
            shown.integration.id === integration.id && 'is-on'
          )}
        >
          <TadweenChannelAvatar
            integration={integration}
            size={26}
            dot={<IsGlobal id={integration.id} />}
          />
        </button>
      ))}
    </div>
  );
};
