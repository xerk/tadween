'use client';

import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AddEditModalProps } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { PicksSocialsComponent } from '@gitroom/frontend/components/new-launch/picks.socials.component';
import { EditorWrapper } from '@gitroom/frontend/components/new-launch/editor';
import { SelectCurrent } from '@gitroom/frontend/components/new-launch/select.current';
import {
  Providers,
  ShowAllProviders,
} from '@gitroom/frontend/components/new-launch/providers/show.all.providers';
import { getProviderSettingsMeta } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import {
  hasUnsavedPostChanges,
  useLaunchStore,
} from '@gitroom/frontend/components/new-launch/store';
import {
  DatePicker,
  DatePickerPanel,
} from '@gitroom/frontend/components/launches/helpers/date.picker';
import { useShallow } from 'zustand/react/shallow';
import { RepeatComponent } from '@gitroom/frontend/components/launches/repeat.component';
import { TagsComponent } from '@gitroom/frontend/components/launches/tags.component';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  useModalDrawer,
  useModals,
} from '@gitroom/frontend/components/layout/new-modal';
import { useHotkeys } from 'react-hotkeys-hook';
import useCookie from 'react-use-cookie';
import { capitalize } from 'lodash';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { CopilotPopup, useChatContext } from '@copilotkit/react-ui';
import { AiOnly } from '@gitroom/frontend/components/tadween/instance/ai.guard';
import { useAiAvailable } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { DummyCodeComponent } from '@gitroom/frontend/components/new-launch/dummy.code.component';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';
import {
  SettingsIcon,
  TrashIcon,
  DropdownArrowSmallIcon,
} from '@gitroom/frontend/components/ui/icons';
import { MobileTopBarAction } from '@gitroom/frontend/components/new-launch/mobile.top.bar';
import {
  TadweenSheet,
  TadweenSheetButton,
  TadweenSheetGroup,
  TadweenSheetRow,
} from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';
import { ComposerTopBar } from '@gitroom/frontend/components/tadween/composer-mobile/top.bar';
import { ComposerMetaBar } from '@gitroom/frontend/components/tadween/composer-mobile/meta.bar';
import { Icon } from '@gitroom/frontend/components/tadween/ui/primitives';
import { useHasScroll } from '@gitroom/frontend/components/ui/is.scroll.hook';
import { useShortlinkPreference } from '@gitroom/frontend/components/settings/shortlink-preference.component';
import dayjs from 'dayjs';
import { Button } from '@gitroom/react/form/button';
import { useClickOutside } from '@mantine/hooks';
import { EditorChecks } from '@gitroom/frontend/components/tadween/editor/checks';
import { TadweenChannelAvatar } from '@gitroom/frontend/components/tadween/editor/channel.avatar';
import { TadweenIcon } from '@gitroom/frontend/components/tadween/editor/icons';

export const ManageModal: FC<AddEditModalProps> = (props) => {
  const t = useT();
  const fetch = useFetch();
  const ref = useRef(null);
  const existingData = useExistingData();
  const [loading, setLoading] = useState(false);
  const toaster = useToaster();
  const modal = useModals();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [mobileSheet, setMobileSheet] = useState<
    'channels' | 'settings' | 'tags' | 'repeat' | 'date' | null
  >(null);
  // phones hide the floating assistant button, the meta bar opens it instead
  const aiAvailable = useAiAvailable();
  const [assistantRequest, setAssistantRequest] = useState(0);
  const [showPostNow, setShowPostNow] = useState(false);
  const postNowRef = useClickOutside<HTMLDivElement>(() => {
    setShowPostNow(false);
  });
  const { data: shortlinkPreferenceData } = useShortlinkPreference();
  // desktop layout choices, remembered on this device like the sidebar's
  const drawer = useModalDrawer();
  const [wideCookie, setWideCookie] = useCookie('tdw-composer-wide', 'no');
  const [previewCookie, setPreviewCookie] = useCookie(
    'tdw-composer-preview',
    'yes'
  );
  const [device, setDevice] = useCookie('tdw-composer-device', 'desktop');
  const wide = wideCookie === 'yes';
  const inspector = previewCookie !== 'no';
  const setWide = (next: boolean) => setWideCookie(next ? 'yes' : 'no');
  const setInspector = (next: boolean) => setPreviewCookie(next ? 'yes' : 'no');

  const { addEditSets, mutate, customClose, dummy } = props;

  const {
    selectedIntegrations,
    hide,
    date,
    setDate,
    repeater,
    setRepeater,
    tags,
    setTags,
    integrations,
    setSelectedIntegrations,
    locked,
    current,
    activateExitButton,
    setHide,
    setBaseline,
    global,
    internal,
    serverChecks,
    setServerChecks,
  } = useLaunchStore(
    useShallow((state) => ({
      hide: state.hide,
      setHide: state.setHide,
      date: state.date,
      setDate: state.setDate,
      current: state.current,
      repeater: state.repeater,
      setRepeater: state.setRepeater,
      tags: state.tags,
      setTags: state.setTags,
      selectedIntegrations: state.selectedIntegrations,
      integrations: state.integrations,
      setSelectedIntegrations: state.setSelectedIntegrations,
      locked: state.locked,
      activateExitButton: state.activateExitButton,
      setBaseline: state.setBaseline,
      global: state.global,
      internal: state.internal,
      serverChecks: state.serverChecks,
      setServerChecks: state.setServerChecks,
    }))
  );
  // the date sheet applies its changes only on save
  const [dateDraft, setDateDraft] = useState(date);

  // closing asks only when something changed since the user first touched the
  // composer, so the defaults that load after it opens are not counted as changes
  const touched = useRef(false);
  const touch = useCallback(() => {
    if (!touched.current) {
      touched.current = true;
      setBaseline();
    }
  }, []);

  useEffect(() => {
    if (hide) {
      setHide(false);
    }
  }, [hide]);

  // what the last save was refused for is stale once the post changes
  useEffect(() => {
    if (serverChecks.length) {
      setServerChecks([]);
    }
  }, [global, internal, selectedIntegrations]);

  const currentIntegrationText = useMemo(() => {
    if (current === 'global') {
      return (
        <div className="tdw-pem-settings-label">
          <span className="tdw-pem-settings-ico mobile:hidden">
            <SettingsIcon size={15} />
          </span>
          <span>{t('tdw_channel_settings_all', 'Channel settings')}</span>
        </div>
      );
    }

    const currentIntegration = integrations.find((p) => p.id === current)!;

    return (
      <div className="tdw-pem-settings-label">
        <span className="mobile:hidden">
          <TadweenChannelAvatar integration={currentIntegration} size={24} />
        </span>
        <span>
          {currentIntegration.name} {t('channel_settings', 'Settings')}
        </span>
      </div>
    );
  }, [current]);

  const changeCustomer = useCallback(
    (customer: string) => {
      const neededIntegrations = integrations.filter(
        (p) => p?.customer?.id === customer
      );
      setSelectedIntegrations(
        neededIntegrations.map((p) => ({
          settings: {},
          selectedIntegrations: p,
        }))
      );
    },
    [integrations]
  );

  const askClose = useCallback(async () => {
    if (!activateExitButton || dummy) {
      return;
    }

    if (
      !hasUnsavedPostChanges() ||
      (await deleteDialog(
        t(
          'are_you_sure_you_want_to_close_this_modal_all_data_will_be_lost',
          'Are you sure you want to close this modal? (all data will be lost)'
        ),
        t('yes_close_it', 'Yes, close it!')
      ))
    ) {
      if (customClose) {
        customClose();
        return;
      }
      modal.closeAll();
    }
  }, [activateExitButton, dummy]);

  const deletePost = useCallback(async () => {
    setLoading(true);
    if (
      !(await deleteDialog(
        t(
          'are_you_sure_you_want_to_delete_post',
          'Are you sure you want to delete this post?'
        ),
        t('yes_delete_it', 'Yes, delete it!')
      ))
    ) {
      setLoading(false);
      return;
    }
    await fetch(`/posts/${existingData.group}`, {
      method: 'DELETE',
    });
    mutate();
    modal.closeAll();
    return;
  }, [existingData, mutate, modal]);

  const schedule = useCallback(
    (type: 'draft' | 'now' | 'schedule' | 'update') => async () => {
      let republish = false;
      if (
        (type === 'now' || type === 'schedule') &&
        (existingData?.posts?.[0]?.state === 'PUBLISHED' ||
          (existingData?.posts?.[0]?.state === 'QUEUE' &&
            dayjs().isAfter(date.utc())))
      ) {
        const channels = selectedIntegrations
          .map((p) => p.integration.name)
          .join(', ');
        const isRecurring =
          !!repeater || !!existingData?.posts?.[0]?.intervalInDays;

        const whatToDo = await new Promise((resolve) => {
          modal.openModal({
            title: t('what_do_you_want_to_do', 'What do you want to do?'),
            children: (
              <div className="flex flex-col">
                <div className="text-[20px] mb-[20px]">
                  {t(
                    'post_already_published_republish_warning',
                    'This post was already published. Republishing will publish it again to'
                  )}{' '}
                  {channels} {t('republish_at', 'at')}{' '}
                  {date.format('DD/MM/YYYY HH:mm')}.
                  {isRecurring && (
                    <div className="mt-[10px]">
                      {t(
                        'republish_recurring_note',
                        'This is a recurring post: your changes apply to all future recurrences starting now.'
                      )}
                    </div>
                  )}
                </div>
                <div className="flex w-full gap-[10px]">
                  <div className="flex-1 flex">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => resolve('update')}
                    >
                      {t(
                        'just_update_post_details',
                        'Just update the post details'
                      )}
                    </Button>
                  </div>
                  <div className="flex-1 flex">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => resolve('republish')}
                    >
                      {t('republish_the_post', 'Republish the post')}
                    </Button>
                  </div>
                </div>
              </div>
            ),
          });
        });

        if (whatToDo === 'update') {
          type = 'update';
        }

        if (whatToDo === 'republish') {
          republish = true;
        }
      }

      setLoading(true);
      setServerChecks([]);

      // Pull the local values to build the payload, but rely on the server
      // (`/posts/valid`) for the actual validation — checkValidity now lives
      // server-side so it can't be bypassed.
      const allValues = await ref.current.getAllValues();

      const integrationById = (id: string) =>
        selectedIntegrations.find((p) => p.integration.id === id);

      const group = existingData.group || makeId(10);

      const posts = allValues.map((post: any) => ({
        integration: {
          id: post.id,
        },
        group,
        settings: { ...(post.settings || {}) },
        value: post.values.map((value: any) => ({
          ...(value.id ? { id: value.id } : {}),
          content: value.content,
          delay: value.delay || 0,
          image:
            (value?.media || []).map(
              ({ id, path, alt, thumbnail, thumbnailTimestamp }: any) => ({
                id,
                path,
                alt,
                thumbnail,
                thumbnailTimestamp,
              })
            ) || [],
        })),
      }));

      if (!dummy) {
        const checkAllValid = await (
          await fetch('/posts/valid', {
            method: 'POST',
            body: JSON.stringify({ type, posts }),
          })
        ).json();

        const focus = (id: string, where: 'fix' | 'preview') => {
          integrationById(id)?.ref?.current?.[where]?.();
        };

        const notEnoughChars = checkAllValid.filter((p: any) => p.emptyContent);

        // every channel the server refused, for the checks list in the footer
        const refused = checkAllValid
          .filter((item: any) => item.valid === false || item.errors !== true)
          .map((item: any) => ({
            id: item.id,
            settings: item.valid === false,
            message:
              item.valid === false
                ? item.settingsError ||
                  t('please_fix_your_settings', 'Please fix your settings')
                : item.errors,
          }));

        for (const item of notEnoughChars) {
          toaster.show(
            `${capitalize(item.identifier.split('-')[0])} (${item.name}):` +
              ' ' +
              t(
                'post_needs_content_or_image',
                'Your post should have at least one character or one image.'
              ),
            'warning'
          );
          setLoading(false);
          focus(item.id, 'preview');
          return;
        }

        if (type !== 'draft') {
          for (const item of checkAllValid) {
            if (item.valid === false) {
              toaster.show(
                `${capitalize(item.identifier.split('-')[0])} (${item.name}): ${
                  item.settingsError ||
                  t('please_fix_your_settings', 'Please fix your settings')
                }`,
                'warning'
              );
              focus(item.id, 'fix');
              setLoading(false);
              setShowSettings(true);
              setServerChecks(refused);
              return;
            }

            if (item.errors !== true) {
              toaster.show(
                `${capitalize(item.identifier.split('-')[0])} (${item.name}): ${
                  item.errors
                }`,
                'warning'
              );
              focus(item.id, 'preview');
              setLoading(false);
              setShowSettings(false);
              setServerChecks(refused);
              return;
            }

            if (item.tooLong) {
              toaster.show(
                `${item.name} (${item.identifier}) ${t(
                  'post_is_too_long',
                  'post is too long, please fix it'
                )}`,
                'warning'
              );
              focus(item.id, 'preview');
              setLoading(false);
              return;
            }
          }
        }
      }

      const shortlinkPreference = shortlinkPreferenceData?.shortlink || 'ASK';

      let shortLink = false;

      if (!dummy && shortlinkPreference !== 'NO') {
        const shortLinkUrl = await (
          await fetch('/posts/should-shortlink', {
            method: 'POST',
            body: JSON.stringify({
              messages: allValues
                // platforms that remove links won't keep shortlinks either
                .filter(
                  (p: any) => !integrationById(p.id)?.integration?.stripLinks
                )
                .flatMap((p: any) => p.values.flatMap((a: any) => a.content)),
            }),
          })
        ).json();

        if (shortLinkUrl.ask) {
          if (shortlinkPreference === 'YES') {
            // Automatically shortlink without asking
            shortLink = true;
          } else {
            // ASK: Show the dialog
            shortLink = await deleteDialog(
              t(
                'shortlink_urls_question',
                'Do you want to shortlink the URLs? it will let you get statistics over clicks'
              ),
              t('yes_shortlink_it', 'Yes, shortlink it!'),
              undefined,
              t('no_original_urls', 'No, original URLs')
            );
          }
        }
      }

      const data = {
        type,
        ...(republish ? { republish } : {}),
        ...(repeater ? { inter: repeater } : {}),
        tags,
        shortLink,
        date: date.utc().format('YYYY-MM-DDTHH:mm:ss'),
        posts,
      };

      if (dummy) {
        modal.openModal({
          title: '',
          children: <DummyCodeComponent code={data} />,
          classNames: {
            modal: 'w-[100%] bg-transparent text-textColor',
          },
          size: '100%',
          withCloseButton: false,
          closeOnEscape: true,
          closeOnClickOutside: true,
        });

        setLoading(false);
      }

      if (!dummy) {
        if (addEditSets) {
          addEditSets(data);
        } else {
          const response = await fetch('/posts', {
            method: 'POST',
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            if (response.status !== 402) {
              const { message } = await response.json().catch(() => ({}));
              toaster.show(
                typeof message === 'string'
                  ? message
                  : t('post_save_failed', 'Could not save the post'),
                'warning'
              );
            }
            setLoading(false);
            return;
          }
        }

        if (!addEditSets) {
          mutate();
          toaster.show(
            !existingData.integration
              ? t('added_successfully', 'Added successfully')
              : t('updated_successfully', 'Updated successfully')
          );
        }
        if (customClose) {
          setTimeout(() => {
            customClose();
          }, 2000);
        }

        if (!addEditSets) {
          modal.closeAll();
        }
      }
    },
    [ref, repeater, tags, date, addEditSets, dummy, shortlinkPreferenceData]
  );

  const scheduleLabel = dummy
    ? t('create_output', 'Create output')
    : !existingData?.integration
    ? t('add_to_calendar', 'Add to calendar')
    : existingData?.posts?.[0]?.state === 'DRAFT'
    ? t('schedule', 'Schedule')
    : t('update', 'Update');

  // the phone top bar has room for one short word: Schedule, or Update
  const phoneScheduleLabel = dummy
    ? scheduleLabel
    : !existingData?.integration || existingData?.posts?.[0]?.state === 'DRAFT'
    ? t('schedule', 'Schedule')
    : t('update', 'Update');

  const mobileActions: MobileTopBarAction[] = addEditSets
    ? [
        {
          label: t('save_set', 'Save Set'),
          variant: 'primary',
          onClick: schedule('draft'),
        },
      ]
    : [
        {
          label: phoneScheduleLabel,
          variant: 'primary',
          onClick: schedule('schedule'),
        },
        ...(!dummy
          ? [
              {
                label: t('post_now', 'Post Now'),
                variant: 'secondary' as const,
                onClick: schedule('now'),
              },
            ]
          : []),
        {
          label: t('save_as_draft', 'Save as Draft'),
          variant: 'tertiary',
          onClick: schedule('draft'),
        },
      ];

  // the settings sheet links to the channel settings only when there are any
  const hasChannelSettings = useMemo(() => {
    const identifiers =
      current === 'global'
        ? selectedIntegrations.map((p) => p.integration.identifier)
        : [integrations.find((p) => p.id === current)?.identifier];

    return identifiers.some(
      (identifier) =>
        !!getProviderSettingsMeta(
          Providers.find((p) => p.identifier === identifier)?.component
        )?.SettingsComponent
    );
  }, [current, selectedIntegrations, integrations]);

  // phones: tags and repeat open from the schedule or the settings sheet, and
  // Done goes back to the sheet they came from
  const [subSheetFrom, setSubSheetFrom] = useState<typeof mobileSheet>(null);
  const openSubSheet = (sheet: 'tags' | 'repeat') => {
    setSubSheetFrom(mobileSheet);
    setMobileSheet(sheet);
  };
  const closeSubSheet = () => {
    setMobileSheet(subSheetFrom);
    setSubSheetFrom(null);
  };

  const actionsDisabled =
    selectedIntegrations.length === 0 || loading || locked;

  // ⌘/Ctrl+Enter does the main action, from the editor too; a dialog opened
  // above the composer keeps the keyboard
  useHotkeys(
    'mod+enter',
    (e) => {
      // not from the assistant's chat box, which sits inside the composer
      if (
        actionsDisabled ||
        (drawer && !drawer.isLast) ||
        (e.target as HTMLElement)?.closest?.('.copilotKitPopup')
      ) {
        return;
      }
      schedule(addEditSets ? 'draft' : 'schedule')();
    },
    {
      enableOnContentEditable: true,
      enableOnFormTags: true,
      preventDefault: true,
    },
    [actionsDisabled, drawer, schedule, addEditSets]
  );

  // "Choose a channel" in the checks: the channel row, ready for the keyboard
  const pickChannels = useCallback(() => {
    const first = document.querySelector<HTMLElement>(
      '.tdw-cm-channels .innerComponent button'
    );
    first?.scrollIntoView({ block: 'nearest' });
    first?.focus();
  }, []);

  const settingsIssue = serverChecks.some((p) => p.settings);
  const settingsOpen = showSettings && hasChannelSettings;

  return (
    <div
      className={clsx(
        'tdw-cm w-full h-full flex-1 p-[40px] mobile:p-0 mobile:h-auto mobile:min-h-full flex relative',
        wide && 'is-wide',
        !inspector && 'is-solo'
      )}
      onPointerDownCapture={touch}
      onKeyDownCapture={touch}
      onDragEnterCapture={touch}
    >
      <div className="tdw-cm-card flex flex-1 min-w-0 bg-newBgColorInner rounded-[20px] mobile:rounded-none flex-col">
        <ComposerTopBar
          title={
            existingData?.integration
              ? t('tdw_cm_edit_post', 'Edit post')
              : t('tdw_cm_new_post', 'New post')
          }
          onCancel={askClose}
          actions={mobileActions}
          disabled={actionsDisabled}
          loading={loading}
        />
        {/* desktop: one header for the whole composer */}
        <div className="tdw-cm-head mobile:hidden">
          <h2 id={drawer?.titleId} className="tdw-cm-heading">
            {existingData?.integration
              ? t('tdw_edit_post_title', 'Edit Post')
              : t('create_post_title', 'Create Post')}
          </h2>
          <CreationMethodBadge
            creationMethod={existingData?.posts?.[0]?.creationMethod}
            size="sm"
          />
          <div className="flex-1" />
          {!dummy && (
            <SelectCustomer
              onChange={changeCustomer}
              integrations={integrations}
            />
          )}
          {aiAvailable && (
            <button
              type="button"
              className="tdw-cm-icon"
              onClick={() => setAssistantRequest((n) => n + 1)}
              aria-label={t('your_assistant', 'Your Assistant')}
              data-tooltip-id="tooltip"
              data-tooltip-content={t('your_assistant', 'Your Assistant')}
            >
              <TadweenIcon name="sparkles" size={18} />
            </button>
          )}
          <button
            type="button"
            className="tdw-cm-icon"
            aria-pressed={inspector}
            onClick={() => setInspector(!inspector)}
            aria-label={t('tdw_cm_show_preview', 'Show preview')}
            data-tooltip-id="tooltip"
            data-tooltip-content={
              inspector
                ? t('tdw_cm_hide_preview', 'Hide preview')
                : t('tdw_cm_show_preview', 'Show preview')
            }
          >
            <TadweenIcon name="panel" size={18} />
          </button>
          {!!drawer && (
            <button
              type="button"
              className="tdw-cm-icon"
              aria-pressed={wide}
              onClick={() => setWide(!wide)}
              aria-label={t('tdw_cm_full_screen', 'Full screen')}
              data-tooltip-id="tooltip"
              data-tooltip-content={
                wide
                  ? t('tdw_cm_side_panel', 'Side panel')
                  : t('tdw_cm_full_screen', 'Full screen')
              }
            >
              <TadweenIcon name={wide ? 'shrink' : 'expand'} size={17} />
            </button>
          )}
          <button
            type="button"
            className="tdw-cm-icon"
            onClick={askClose}
            aria-label={t('close', 'Close')}
          >
            <TadweenIcon name="x" size={18} />
          </button>
        </div>
        <div className="flex-1 flex min-h-0 mobile:contents">
          <div
            className={clsx(
              'tdw-cm-main flex flex-col flex-1 min-w-0',
              mobileTab === 'preview' && 'mobile:flex-none'
            )}
          >
            <div className="flex-1 relative mobile:flex mobile:flex-col">
              <div
                id="social-content"
                className="gap-[20px] mobile:gap-[16px] flex flex-col pe-[8px] pt-[16px] ps-[20px] mobile:px-[16px] mobile:pt-[12px] mobile:static mobile:flex-1 absolute top-0 left-0 w-full h-full mobile:h-auto overflow-x-hidden overflow-y-scroll mobile:overflow-y-visible scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
              >
                {/* Tadween phones: one scrolling row of channels, "+" opens the picker */}
                <div className="tdw-cm-channels flex w-full">
                  <div className="flex flex-1 mobile:min-w-0">
                    <PicksSocialsComponent toolTip={true} />
                  </div>
                  {!existingData.integration ? (
                    <button
                      type="button"
                      onClick={() => setMobileSheet('channels')}
                      aria-label={t('select_channels', 'Select Channels')}
                      aria-haspopup="dialog"
                      className="tdw-cm-add hidden mobile:flex"
                    >
                      <Icon name="plus" size={22} />
                    </button>
                  ) : (
                    <div className="hidden mobile:flex items-center">
                      <CreationMethodBadge
                        creationMethod={
                          existingData?.posts?.[0]?.creationMethod
                        }
                        size="sm"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 gap-[6px] mobile:gap-[12px] flex-col">
                  <div
                    className={clsx(
                      'flex mobile:items-center',
                      !!existingData.integration && 'mobile:hidden'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      {!existingData.integration && <SelectCurrent />}
                    </div>
                  </div>
                  <ComposerMetaBar
                    date={date}
                    repeats={!!repeater}
                    onDate={() => {
                      setDateDraft(date);
                      setMobileSheet('date');
                    }}
                    preview={mobileTab === 'preview'}
                    onPreview={(preview) =>
                      setMobileTab(preview ? 'preview' : 'edit')
                    }
                    onSettings={
                      !dummy ? () => setMobileSheet('settings') : undefined
                    }
                    onAssistant={
                      aiAvailable
                        ? () => setAssistantRequest((n) => n + 1)
                        : undefined
                    }
                  />
                  <div
                    className={clsx(
                      'flex-1 flex',
                      mobileTab === 'preview' && 'mobile:hidden'
                    )}
                  >
                    {!hide && <EditorWrapper totalPosts={1} value="" />}
                  </div>
                  <div id="social-empty" className="pb-[16px] mobile:pb-0" />
                </div>
              </div>
            </div>
          </div>
          {/* the inspector: the live preview, or the channel settings. Both stay
              mounted: the providers hold the post's forms and render their
              settings into #social-settings. */}
          <aside
            className={clsx(
              'tdw-cm-inspector flex flex-col mobile:!w-full mobile:flex-1',
              mobileTab === 'edit' && 'mobile:flex-none'
            )}
          >
            <div className="tdw-cm-inspector-head mobile:hidden">
              {!hasChannelSettings ? (
                <div className="tdw-cm-inspector-title">
                  {t('post_preview', 'Post Preview')}
                </div>
              ) : (
                <div
                  role="tablist"
                  aria-label={t('post_preview', 'Post Preview')}
                  className="tdw-cm-seg"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!settingsOpen}
                    onClick={() => setShowSettings(false)}
                  >
                    {t('preview', 'Preview')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={settingsOpen}
                    onClick={() => setShowSettings(true)}
                  >
                    {t('settings', 'Settings')}
                    {settingsIssue && (
                      <span className="tdw-cm-seg-dot" aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
              {!settingsOpen && (
                <div
                  role="group"
                  aria-label={t('tdw_cm_preview_size', 'Preview size')}
                  className="tdw-cm-seg is-icons"
                >
                  <button
                    type="button"
                    aria-pressed={device === 'desktop'}
                    onClick={() => setDevice('desktop')}
                    aria-label={t('tdw_cm_desktop', 'Desktop')}
                    data-tooltip-id="tooltip"
                    data-tooltip-content={t('tdw_cm_desktop', 'Desktop')}
                  >
                    <TadweenIcon name="monitor" size={15} />
                  </button>
                  <button
                    type="button"
                    aria-pressed={device === 'mobile'}
                    onClick={() => setDevice('mobile')}
                    aria-label={t('tdw_cm_mobile', 'Mobile')}
                    data-tooltip-id="tooltip"
                    data-tooltip-content={t('tdw_cm_mobile', 'Mobile')}
                  >
                    <TadweenIcon name="phone" size={15} />
                  </button>
                </div>
              )}
            </div>
            <div
              className={clsx(
                'flex-1 relative',
                settingsOpen && 'hidden',
                mobileTab === 'edit' && 'mobile:hidden'
              )}
            >
              <Scrollable
                scrollClasses="!pe-[20px]"
                className="absolute mobile:static top-0 p-[20px] pe-[8px] mobile:p-[16px] left-0 w-full h-full mobile:h-auto overflow-x-hidden overflow-y-scroll mobile:overflow-y-visible scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
              >
                <div className="tdw-cm-stage" data-device={device}>
                  <ShowAllProviders ref={ref} />
                </div>
              </Scrollable>
            </div>
            {/* Tadween: on phones the channel settings open as a sheet; on
                desktop the inline sheet is the inspector's Settings tab. It
                stays mounted: the providers render their settings into
                #social-settings. */}
            <div
              className={clsx(
                'flex-1 flex flex-col min-h-0',
                // phones: the sheet stays in the page to slide out
                !settingsOpen && 'hidden mobile:flex'
              )}
              // a changed setting may fix what the last save was refused for,
              // the next save checks it again
              onChangeCapture={() =>
                serverChecks.some((p) => p.settings) &&
                setServerChecks(serverChecks.filter((p) => !p.settings))
              }
            >
              <TadweenSheet
                inline={true}
                keepMounted={true}
                open={showSettings}
                onClose={() => setShowSettings(false)}
                title={currentIntegrationText}
                detent="large"
                footer={
                  <TadweenSheetButton
                    label={t('done', 'Done')}
                    onClick={() => setShowSettings(false)}
                  />
                }
              >
                <div
                  id="wrapper-settings"
                  className={clsx(
                    'flex-1 flex px-[20px] pb-[20px] pt-[4px] mobile:p-0 select-none',
                    current === 'global' && 'hidden'
                  )}
                >
                  <div className="tdw-pem-settings flex-1 flex flex-col overflow-hidden">
                    <div className="tdw-pem-settings-head mobile:hidden">
                      <div className="flex-1 min-w-0">
                        {currentIntegrationText}
                      </div>
                    </div>
                    <div className="flex-1 text-[14px] text-textColor font-[500] relative">
                      <div className="absolute mobile:static left-0 top-0 w-full h-full mobile:h-auto flex flex-col overflow-x-hidden overflow-y-auto mobile:overflow-visible scrollbar scrollbar-thumb-newBgColorInner scrollbar-track-newColColor">
                        <div
                          id="social-settings"
                          className="flex flex-col gap-[20px] bg-newBgColor"
                        />
                      </div>
                    </div>
                    <style>
                      {`#social-settings [data-id="${current}"] {display: block !important;}`}
                    </style>
                  </div>
                </div>
              </TadweenSheet>
            </div>
          </aside>
        </div>
        <div className="tdw-pem-foot select-none border-t border-newBorder flex items-center mobile:hidden">
          <div className="tdw-pem-foot-start">
            <DatePicker onChange={setDate} date={date} />
            {!dummy && (
              <RepeatComponent repeat={repeater} onChange={setRepeater} />
            )}
            {/* keep a single tags component mounted, the tags sheet has its own */}
            {!dummy && mobileSheet !== 'tags' && (
              <TagsComponent
                name="tags"
                label={t('tags', 'Tags')}
                initial={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                }}
              />
            )}
            <EditorChecks
              onSettings={() => setShowSettings(true)}
              onPickChannels={
                !existingData?.integration ? pickChannels : undefined
              }
            />
          </div>
          <div className="tdw-pem-foot-end">
            {existingData?.integration && (
              <button
                type="button"
                onClick={deletePost}
                className="tdw-btn tdw-btn-ghost is-danger tdw-btn-icon"
                aria-label={t('delete_post', 'Delete Post')}
                data-tooltip-id="tooltip"
                data-tooltip-content={t('delete_post', 'Delete Post')}
              >
                <TrashIcon />
              </button>
            )}
            {addEditSets && (
              <button
                className="tdw-btn tdw-btn-primary min-w-[180px]"
                disabled={actionsDisabled}
                onClick={schedule('draft')}
              >
                {t('save_set', 'Save Set')}
                <kbd className="tdw-kbd" aria-hidden="true">
                  {shortcutLabel}
                </kbd>
              </button>
            )}
            {!addEditSets && (
              <div
                ref={postNowRef}
                className="tdw-split"
                onKeyDown={(e) => {
                  // Escape closes the menu, not the composer behind it
                  if (e.key === 'Escape' && showPostNow) {
                    e.stopPropagation();
                    // Next hydrates the whole document, so React and the
                    // modal's Escape hotkey listen on the same node
                    e.nativeEvent.stopImmediatePropagation();
                    setShowPostNow(false);
                  }
                }}
              >
                <button
                  disabled={actionsDisabled}
                  onClick={schedule('schedule')}
                  aria-keyshortcuts="Meta+Enter Control+Enter"
                  className="tdw-btn tdw-btn-primary tdw-split-main relative min-w-[180px]"
                >
                  {loading && (
                    <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
                      <div className="animate-spin h-[20px] w-[20px] border-4 border-white border-t-transparent rounded-full" />
                    </div>
                  )}
                  <div
                    className={clsx(
                      'flex items-center gap-[10px]',
                      loading && 'invisible'
                    )}
                  >
                    {scheduleLabel}
                    <kbd className="tdw-kbd" aria-hidden="true">
                      {shortcutLabel}
                    </kbd>
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={t(
                    'tdw_more_publish_options',
                    'More publish options'
                  )}
                  aria-haspopup="menu"
                  aria-expanded={showPostNow}
                  disabled={actionsDisabled}
                  onClick={() => setShowPostNow(!showPostNow)}
                  className="tdw-btn tdw-btn-primary tdw-split-more"
                >
                  <DropdownArrowSmallIcon
                    className={clsx(showPostNow && 'rotate-180')}
                  />
                </button>
                {showPostNow && (
                  <div className="tdw-split-menu" role="menu">
                    {!dummy && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowPostNow(false);
                          schedule('now')();
                        }}
                        disabled={actionsDisabled}
                        className="tdw-split-item post-now"
                      >
                        <TadweenIcon name="send" size={15} />
                        {t('post_now', 'Post Now')}
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowPostNow(false);
                        schedule('draft')();
                      }}
                      disabled={actionsDisabled}
                      className="tdw-split-item"
                    >
                      <TadweenIcon name="draft" size={15} />
                      {t('save_as_draft', 'Save as Draft')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Tadween phones: every composer sheet is a TadweenSheet; what each one
          does (and the state behind it) is upstream's */}
      <TadweenSheet
        open={mobileSheet === 'channels'}
        onClose={() => setMobileSheet(null)}
        title={t('select_channels', 'Select Channels')}
        detent="medium"
        done={{
          label: t('done', 'Done'),
          disabled: selectedIntegrations.length === 0,
        }}
      >
        {!dummy && (
          <div className="tdw-cm-customer flex pb-[8px] empty:hidden">
            <SelectCustomer
              onChange={changeCustomer}
              integrations={integrations}
            />
          </div>
        )}
        <div className="tdw-cm-picks">
          <PicksSocialsComponent list={true} />
        </div>
      </TadweenSheet>
      <TadweenSheet
        open={mobileSheet === 'settings'}
        onClose={() => setMobileSheet(null)}
        title={t('settings', 'Settings')}
      >
        <TadweenSheetGroup>
          {hasChannelSettings && (
            <TadweenSheetRow
              icon={<Icon name="settings" size={20} />}
              label={
                current === 'global'
                  ? t('channels_settings', 'Channel Settings')
                  : `${integrations.find((p) => p.id === current)?.name} ${t(
                      'channel_settings',
                      'Settings'
                    )}`
              }
              onClick={() => {
                setMobileSheet(null);
                setShowSettings(true);
              }}
            />
          )}
          <TadweenSheetRow
            icon={<Icon name="tag" size={20} />}
            label={t('tags', 'Tags')}
            value={tags.length ? tags.length : t('tdw_cm_none', 'None')}
            onClick={() => openSubSheet('tags')}
          />
          <TadweenSheetRow
            icon={<Icon name="repeat" size={20} />}
            label={t('repeat_post', 'Repeat Post')}
            value={
              repeater
                ? t('tdw_cm_repeat_on', 'On')
                : t('tdw_cm_repeat_never', 'Never')
            }
            onClick={() => openSubSheet('repeat')}
          />
        </TadweenSheetGroup>
        {existingData?.integration && (
          <TadweenSheetGroup>
            <TadweenSheetRow
              icon={<Icon name="trash-2" size={20} />}
              label={t('delete_post', 'Delete Post')}
              destructive={true}
              onClick={() => {
                // the confirm dialog opens under the sheets, close it first
                setMobileSheet(null);
                deletePost();
              }}
            />
          </TadweenSheetGroup>
        )}
      </TadweenSheet>
      <TadweenSheet
        open={mobileSheet === 'tags'}
        onClose={closeSubSheet}
        title={t('tags', 'Tags')}
        detent="large"
        footer={
          <TadweenSheetButton
            label={t('done', 'Done')}
            onClick={closeSubSheet}
          />
        }
      >
        <TagsComponent
          name="tags"
          label={t('tags', 'Tags')}
          initial={tags}
          onChange={(e) => {
            setTags(e.target.value);
          }}
          list={true}
          // the new-tag dialog opens under the sheets: step out of the sheet
          // while it is open and come back to it afterwards
          onModal={(open) => setMobileSheet(open ? null : 'tags')}
        />
      </TadweenSheet>
      <TadweenSheet
        open={mobileSheet === 'date'}
        onClose={() => setMobileSheet(null)}
        title={t('tdw_cm_when_to_post', 'When to post')}
        detent="large"
        footer={
          <TadweenSheetButton
            label={t('save', 'Save')}
            onClick={() => {
              setDate(dateDraft);
              setMobileSheet(null);
            }}
          />
        }
      >
        <DatePickerPanel
          date={dateDraft}
          onChange={setDateDraft}
          sheet={true}
        />
        {!dummy && (
          <TadweenSheetGroup>
            <TadweenSheetRow
              icon={<Icon name="repeat" size={20} />}
              label={t('repeat_post', 'Repeat Post')}
              value={
                repeater
                  ? t('tdw_cm_repeat_on', 'On')
                  : t('tdw_cm_repeat_never', 'Never')
              }
              onClick={() => openSubSheet('repeat')}
            />
            <TadweenSheetRow
              icon={<Icon name="tag" size={20} />}
              label={t('tags', 'Tags')}
              value={tags.length ? tags.length : t('tdw_cm_none', 'None')}
              onClick={() => openSubSheet('tags')}
            />
          </TadweenSheetGroup>
        )}
      </TadweenSheet>
      <TadweenSheet
        open={mobileSheet === 'repeat'}
        onClose={closeSubSheet}
        title={t('repeat_post', 'Repeat Post')}
        footer={
          <TadweenSheetButton
            label={t('done', 'Done')}
            onClick={closeSubSheet}
          />
        }
      >
        <div className="tdw-cm-repeat">
          <RepeatComponent
            repeat={repeater}
            onChange={setRepeater}
            list={true}
          />
        </div>
      </TadweenSheet>
      <AiOnly>
        <CopilotPopup
          className="mobile:!z-[460] mobile:!bottom-[112px]"
          hitEscapeToClose={false}
          clickOutsideToClose={true}
          instructions={`
You are an assistant that help the user to schedule their social media posts,
Here are the things you can do:
- Add a new comment / post to the list of posts
- Delete a comment / post from the list of posts
- Add content to the comment / post
- Activate or deactivate the comment / post

Post content can be added using the addPostContentFor{num} function.
After using the addPostFor{num} it will create a new addPostContentFor{num+ 1} function.
`}
          labels={{
            title: t('your_assistant', 'Your Assistant'),
            initial: t(
              'assistant_initial_message',
              'Hi! I can help you to refine your social media posts.'
            ),
          }}
        >
          <OpenAssistant request={assistantRequest} />
        </CopilotPopup>
      </AiOnly>
    </div>
  );
};

// Opens the assistant popup whenever `request` changes (phones, where its
// floating button is hidden). Rendered inside the popup for its chat context.
const OpenAssistant: FC<{ request: number }> = ({ request }) => {
  const { setOpen } = useChatContext();
  useEffect(() => {
    if (request) {
      setOpen(true);
    }
  }, [request, setOpen]);
  return null;
};

// the platform's shortcut glyphs for the main action
const shortcutLabel =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    ? '⌘↵'
    : 'Ctrl ↵';

const Scrollable: FC<{
  className: string;
  scrollClasses: string;
  children: ReactNode;
}> = ({ className, scrollClasses, children }) => {
  const ref = useRef(undefined);
  const hasScroll = useHasScroll(ref);
  return (
    <div className={clsx(className, hasScroll && scrollClasses)} ref={ref}>
      {children}
    </div>
  );
};
