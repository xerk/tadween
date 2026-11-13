'use client';

import {
  FC,
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import {
  Avatar,
  Button,
  cx,
  EmptyState,
  Icon,
  IconButton,
  Input,
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

const SWR_OPTIONS = {
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  revalidateOnFocus: false,
  revalidateIfStale: false,
  revalidateOnMount: true,
  revalidateOnReconnect: false,
  refreshInterval: 0,
  shouldRetryOnError: false,
};

// past this many options the list gets a search field
const SEARCH_FROM = 6;

export interface ContinueProviderProps {
  onSave: (data: any) => Promise<void>;
  existingId: string[];
  initialData?: any[];
  isSaving?: boolean;
  // in the app's modal: closes it (the channel stays half connected)
  onClose?: () => void;
  // offer Reconnect (delete the channel and sign in again); needs a session,
  // so the public connect page leaves it off for visitors who aren't logged in
  allowReconnect?: boolean;
}

// a translation key and its English default
export interface ContinueCopy {
  key: string;
  text: string;
}

export interface ContinueProviderConfig<TItem, TSelection> {
  endpoint: string;
  swrKey: string;
  // the dialog's title, e.g. "Choose a Facebook Page"
  title: ContinueCopy;
  // what the user sees when the account has nothing to pick, and where the
  // network explains how to fix it
  empty: {
    title: ContinueCopy;
    body: ContinueCopy;
    helpUrl: string;
    helpLabel: ContinueCopy;
  };
  avatarShape?: 'circle' | 'square';
  getItemName: (item: TItem) => string;
  getItemPicture?: (item: TItem) => string | undefined;
  // the row's second line (handle, follower count…), only from data the network returns
  getItemDescription?: (
    item: TItem,
    t: ReturnType<typeof useT>
  ) => string | undefined;
  getSelectionValue: (item: TItem) => TSelection;
  transformSaveData: (selection: TSelection) => any;
  isSelected: (item: TItem, selection: TSelection | null) => boolean;
  getItemId: (item: TItem) => string;
}

// The network's icon, as the Add channel gallery shows it (also heads the
// browser extension notice, launches/chrome.extension.warning.tsx)
export const NetworkIcon: FC<{ identifier: string }> = ({ identifier }) => (
  <span className="tdw-continue-network" aria-hidden="true">
    <img
      src={
        identifier === 'youtube'
          ? '/icons/platforms/youtube.svg'
          : `/icons/platforms/${identifier}.png`
      }
      alt=""
    />
  </span>
);

const LoadingRows: FC = () => (
  <div className="tdw-continue-list" aria-hidden="true">
    {[0, 1, 2].map((row) => (
      <div key={row} className="tdw-continue-skeleton">
        <Skeleton width={16} height={16} radius={8} />
        <Skeleton width={40} height={40} radius={20} />
        <span className="tdw-continue-row-text">
          <Skeleton width={row === 1 ? '46%' : '58%'} height={14} />
          <Skeleton width={row === 1 ? '30%' : '38%'} height={12} />
        </span>
      </div>
    ))}
  </div>
);

export function withContinueProvider<TItem, TSelection>(
  config: ContinueProviderConfig<TItem, TSelection>
): FC<ContinueProviderProps> {
  const {
    endpoint,
    swrKey,
    title,
    empty,
    avatarShape = 'circle',
    getItemName,
    getItemPicture,
    getItemDescription,
    getSelectionValue,
    transformSaveData,
    isSelected,
    getItemId,
  } = config;

  return function ContinueProviderComponent(props: ContinueProviderProps) {
    const {
      onSave,
      existingId,
      initialData,
      isSaving,
      onClose,
      allowReconnect,
    } = props;
    const call = useCustomProviderFunction();
    const { integration } = useIntegration();
    const fetch = useFetch();
    const toaster = useToaster();
    const t = useT();
    const titleId = useId();
    const radioName = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const [selection, setSelection] = useState<TSelection | null>(null);
    const [saving, setSaving] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [query, setQuery] = useState('');

    // in the modal, keyboard users start inside the dialog
    useEffect(() => {
      if (onClose) {
        rootRef.current?.focus({ preventScroll: true });
      }
    }, []);

    const loadData = useCallback(async () => {
      // Skip fetch if initial data was provided
      if (initialData) {
        return initialData;
      }
      const list = await call.get(endpoint);
      // a failing network call comes back as `false` (or an error body), not a list
      if (!Array.isArray(list)) {
        throw new Error(`${endpoint}: ${JSON.stringify(list)}`);
      }
      return list;
    }, [initialData]);

    const { data, error, isLoading, mutate } = useSWR(
      initialData ? null : swrKey,
      loadData,
      SWR_OPTIONS
    );

    const resolvedData = (initialData || data) as TItem[] | undefined;

    const filteredData = useMemo(() => {
      return (
        resolvedData?.filter((item) => !existingId.includes(getItemId(item))) ||
        []
      );
    }, [resolvedData, existingId]);

    const visibleData = useMemo(() => {
      const search = query.trim().toLowerCase();
      if (!search) {
        return filteredData;
      }
      return filteredData.filter((item) =>
        [getItemName(item), getItemDescription?.(item, t)]
          .filter(Boolean)
          .some((p) => p!.toLowerCase().includes(search))
      );
    }, [filteredData, query]);

    const handleSave = useCallback(
      async (e?: FormEvent) => {
        e?.preventDefault();
        if (!selection) {
          return;
        }
        setSaving(true);
        try {
          await onSave(transformSaveData(selection));
        } finally {
          setSaving(false);
        }
      },
      [onSave, selection]
    );

    // "Delete the channel and add it again" for the user: the same calls as
    // the channel menu's Delete and the Add channel gallery
    const reconnect = useCallback(async () => {
      if (!integration) {
        return;
      }
      const failed = () =>
        toaster.show(
          t(
            'could_not_connect_to_platform',
            'Could not connect to the platform'
          ),
          'warning'
        );
      setReconnecting(true);
      try {
        const deleteIntegration = await fetch('/integrations', {
          method: 'DELETE',
          body: JSON.stringify({
            id: integration.id,
          }),
        });
        if (deleteIntegration.status === 406) {
          toaster.show(
            t(
              'delete_posts_before_channel',
              'You have to delete all the posts associated with this channel before deleting it'
            ),
            'warning'
          );
          return;
        }
        if (!deleteIntegration.ok) {
          failed();
          return;
        }
        const response = await fetch(
          `/integrations/social/${integration.identifier}`
        );
        if (response.status === 402) {
          onClose?.();
          return;
        }
        const { url, err } = await response.json();
        if (err || !url) {
          failed();
          onClose?.();
          return;
        }
        window.location.href = url;
      } catch {
        failed();
      } finally {
        setReconnecting(false);
      }
    }, [integration, onClose]);

    const closeButton = onClose ? (
      <Button variant="ghost" onClick={onClose}>
        {t('close', 'Close')}
      </Button>
    ) : null;

    const reconnectButton = allowReconnect ? (
      <Button
        variant="primary"
        icon="refresh-cw"
        loading={reconnecting}
        onClick={reconnect}
      >
        {t('tdw_continue_reconnect', 'Reconnect')}
      </Button>
    ) : null;

    // Closing leaves the channel half connected, the way it always has: it
    // stays in the channel list with an alert that reopens this dialog
    const keepNote = onClose ? (
      <p className="tdw-continue-note">
        {t(
          'tdw_continue_keep_note',
          'If you close this, the channel stays in your list with an alert, so you can finish setting it up later. Reconnect removes it and signs you in again.'
        )}
      </p>
    ) : null;

    const loading = !initialData && isLoading;
    const failed = !initialData && !loading && !!error;
    const nothing = !loading && !failed && !resolvedData?.length;
    const allConnected =
      !loading && !failed && !!resolvedData?.length && !filteredData.length;
    const showList = !loading && !failed && !!filteredData.length;

    return (
      <TadweenScope>
        <div
          ref={rootRef}
          tabIndex={onClose ? -1 : undefined}
          role={onClose ? 'dialog' : 'region'}
          aria-labelledby={titleId}
          aria-busy={loading || undefined}
          className="tdw-continue"
        >
          <form className="tdw-continue-form" onSubmit={handleSave}>
            <header className="tdw-continue-head">
              {integration?.identifier ? (
                <NetworkIcon identifier={integration.identifier} />
              ) : null}
              <div className="tdw-continue-heading">
                <h2 id={titleId} className="tdw-continue-title">
                  {t(title.key, title.text)}
                </h2>
                {integration?.name ? (
                  <p className="tdw-continue-account">
                    <Avatar
                      name={integration.name}
                      src={integration.picture || undefined}
                      size={18}
                    />
                    <span>
                      {t('tdw_continue_signed_in_as', 'Signed in as {{name}}', {
                        name: integration.name,
                      })}
                    </span>
                  </p>
                ) : null}
              </div>
              {onClose ? (
                <IconButton
                  icon="x"
                  label={t('close', 'Close')}
                  className="tdw-continue-close"
                  onClick={onClose}
                />
              ) : null}
            </header>

            {loading ? (
              <>
                <p className="pz-sr" role="status">
                  {t('tdw_continue_loading', 'Loading your options…')}
                </p>
                <LoadingRows />
              </>
            ) : null}

            {failed ? (
              <div className="tdw-continue-state">
                <EmptyState
                  size="sm"
                  icon="triangle-alert"
                  title={t(
                    'tdw_continue_error_title',
                    "We couldn't load this list"
                  )}
                  body={t(
                    'tdw_continue_error_body',
                    'The network did not answer, or the connection needs to be renewed. Try again, or reconnect if it keeps happening.'
                  )}
                  secondary={
                    allowReconnect ? (
                      <Button
                        variant="secondary"
                        icon="refresh-cw"
                        loading={reconnecting}
                        onClick={reconnect}
                      >
                        {t('tdw_continue_reconnect', 'Reconnect')}
                      </Button>
                    ) : null
                  }
                  action={
                    <Button variant="primary" onClick={() => mutate()}>
                      {t('tdw_try_again', 'Try again')}
                    </Button>
                  }
                />
                <details className="tdw-continue-details">
                  <summary>
                    {t('tdw_continue_details', 'Technical details')}
                  </summary>
                  <code>{String(error?.message || error)}</code>
                </details>
              </div>
            ) : null}

            {nothing ? (
              <div className="tdw-continue-state">
                <EmptyState
                  size="sm"
                  icon="search"
                  title={t(empty.title.key, empty.title.text)}
                  body={t(empty.body.key, empty.body.text)}
                  secondary={closeButton}
                  action={reconnectButton}
                />
                <a
                  className="tdw-continue-help"
                  href={empty.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(empty.helpLabel.key, empty.helpLabel.text)}
                  <Icon name="external-link" size={14} />
                </a>
                {keepNote}
              </div>
            ) : null}

            {allConnected ? (
              <div className="tdw-continue-state">
                <EmptyState
                  size="sm"
                  icon="circle-check"
                  title={t(
                    'tdw_continue_all_connected_title',
                    'Everything here is already connected'
                  )}
                  body={t(
                    'tdw_continue_all_connected_body',
                    'Each option on this account is already one of your channels. Reconnect to sign in with a different account.'
                  )}
                  secondary={closeButton}
                  action={reconnectButton}
                />
                {keepNote}
              </div>
            ) : null}

            {showList ? (
              <>
                {filteredData.length > SEARCH_FROM ? (
                  <Input
                    icon="search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    // Enter filters; it never submits what was picked before
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    placeholder={t('tdw_continue_search', 'Search by name')}
                    aria-label={t('tdw_continue_search', 'Search by name')}
                  />
                ) : null}
                <div
                  role="radiogroup"
                  aria-labelledby={titleId}
                  className="tdw-continue-list"
                >
                  {visibleData.map((item) => {
                    const on = isSelected(item, selection);
                    const description = getItemDescription?.(item, t);
                    return (
                      <label
                        key={getItemId(item)}
                        className={cx(
                          'pz-radio tdw-continue-row',
                          on && 'is-on'
                        )}
                      >
                        <input
                          type="radio"
                          name={radioName}
                          className="pz-sr"
                          checked={on}
                          onChange={() => setSelection(getSelectionValue(item))}
                        />
                        <span className="pz-radio-dot" aria-hidden="true" />
                        <Avatar
                          name={getItemName(item)}
                          src={getItemPicture?.(item) || undefined}
                          size={40}
                          shape={avatarShape}
                        />
                        <span className="tdw-continue-row-text">
                          {/* names keep their own direction in an Arabic dialog */}
                          <span className="tdw-continue-row-name">
                            <bdi>{getItemName(item)}</bdi>
                          </span>
                          {description ? (
                            <span className="tdw-continue-row-desc">
                              <bdi>{description}</bdi>
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                  {!visibleData.length ? (
                    <p className="tdw-continue-no-match">
                      {t(
                        'tdw_continue_no_match',
                        'Nothing matches your search.'
                      )}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            {showList || loading ? (
              <footer className="tdw-continue-foot">
                {closeButton}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!selection}
                  loading={isSaving || saving}
                >
                  {t('tdw_continue_connect', 'Connect')}
                </Button>
              </footer>
            ) : null}
          </form>
        </div>
      </TadweenScope>
    );
  };
}
