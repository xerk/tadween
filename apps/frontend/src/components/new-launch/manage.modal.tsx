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
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
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
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { capitalize } from 'lodash';
import { SelectCustomer } from '@gitroom/frontend/components/launches/select.customer';
import { CopilotPopup } from '@copilotkit/react-ui';
import { DummyCodeComponent } from '@gitroom/frontend/components/new-launch/dummy.code.component';
import { CreationMethodBadge } from '@gitroom/frontend/components/launches/creation.method.badge';
import {
  SettingsIcon,
  SettingsOutlineIcon,
  ChevronDownIcon,
  CloseIcon,
  TrashIcon,
  DropdownArrowSmallIcon,
  PlusIcon,
  EyeIcon,
  TagIcon,
  RepeatIcon,
} from '@gitroom/frontend/components/ui/icons';
import {
  MobileTopBar,
  MobileTopBarAction,
} from '@gitroom/frontend/components/new-launch/mobile.top.bar';
import {
  BottomSheet,
  BottomSheetButton,
  BottomSheetHeader,
  BottomSheetRow,
} from '@gitroom/frontend/components/ui/bottom.sheet.component';
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
  const [showPostNow, setShowPostNow] = useState(false);
  const postNowRef = useClickOutside<HTMLDivElement>(() => {
    setShowPostNow(false);
  });
  const { data: shortlinkPreferenceData } = useShortlinkPreference();

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
    }))
  );
  // the date sheet applies its changes only on save
  const [dateDraft, setDateDraft] = useState(date);

  useEffect(() => {
    if (hide) {
      setHide(false);
    }
  }, [hide]);

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
      await deleteDialog(
        t(
          'are_you_sure_you_want_to_close_this_modal_all_data_will_be_lost',
          'Are you sure you want to close this modal? (all data will be lost)'
        ),
        t('yes_close_it', 'Yes, close it!')
      )
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
          label: scheduleLabel,
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

  // on phones, the settings, tags, repeat and delete live in a settings sheet
  const settingsButton = !dummy && (
    <div
      onClick={() => setMobileSheet('settings')}
      className="hidden mobile:flex shrink-0 w-[32px] h-[44px] justify-end items-center cursor-pointer text-[#A3A3A3]"
    >
      <SettingsOutlineIcon />
    </div>
  );

  // phones have no room for the preview column, it replaces the editor instead
  const previewButton = (
    <div
      onClick={() => setMobileTab(mobileTab === 'preview' ? 'edit' : 'preview')}
      className={clsx(
        'hidden mobile:flex shrink-0 w-[32px] h-[44px] justify-end items-center cursor-pointer',
        mobileTab === 'preview' ? 'text-[#FC69FF]' : 'text-[#A3A3A3]'
      )}
    >
      <EyeIcon />
    </div>
  );

  return (
    <div className="w-full h-full flex-1 p-[40px] mobile:p-0 mobile:h-auto mobile:min-h-full flex relative">
      <div className="flex flex-1 min-w-0 bg-newBgColorInner rounded-[20px] mobile:rounded-none flex-col">
        <MobileTopBar
          onBack={askClose}
          actions={mobileActions}
          disabled={selectedIntegrations.length === 0 || loading || locked}
          loading={loading}
        >
          <DatePicker
            onChange={setDate}
            date={date}
            onOpen={() => {
              setDateDraft(date);
              setMobileSheet('date');
            }}
          />
        </MobileTopBar>
        <div className="flex-1 flex mobile:contents">
          <div
            className={clsx(
              'flex flex-col flex-1 min-w-0 border-e border-newBorder mobile:border-e-0',
              mobileTab === 'preview' && 'mobile:flex-none'
            )}
          >
            <div className="bg-newBgColor h-[65px] rounded-s-[20px] !rounded-b-[0] mobile:hidden flex items-center gap-[12px] px-[20px] text-[20px] font-[600]">
              {existingData?.integration
                ? t('tdw_edit_post_title', 'Edit Post')
                : t('create_post_title', 'Create Post')}
              <CreationMethodBadge
                creationMethod={existingData?.posts?.[0]?.creationMethod}
                size="sm"
              />
            </div>
            <div className="flex-1 flex flex-col gap-[16px]">
              <div
                className={clsx(
                  // mobile:flex wins over hidden, the settings sheet opens above the editor on phones
                  'flex-1 relative mobile:flex mobile:flex-col',
                  showSettings && 'hidden'
                )}
              >
                <div
                  id="social-content"
                  className="gap-[32px] mobile:gap-[16px] flex flex-col pe-[8px] pt-[20px] ps-[20px] mobile:px-[16px] mobile:pt-[12px] mobile:static mobile:flex-1 absolute top-0 left-0 w-full h-full mobile:h-auto overflow-x-hidden overflow-y-scroll mobile:overflow-y-visible scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
                >
                  <div
                    className={clsx(
                      'flex w-full',
                      !existingData.integration && 'mobile:hidden'
                    )}
                  >
                    <div className="flex flex-1">
                      <PicksSocialsComponent toolTip={true} />
                    </div>
                    <div className="mobile:hidden">
                      {!dummy && (
                        <SelectCustomer
                          onChange={changeCustomer}
                          integrations={integrations}
                        />
                      )}
                    </div>
                    {!!existingData.integration && (
                      <>
                        <div className="hidden mobile:flex items-center">
                          <CreationMethodBadge
                            creationMethod={
                              existingData?.posts?.[0]?.creationMethod
                            }
                            size="sm"
                          />
                        </div>
                        {previewButton}
                        {settingsButton}
                      </>
                    )}
                  </div>
                  <div className="flex flex-1 gap-[6px] mobile:gap-[16px] flex-col">
                    <div className="flex mobile:items-center mobile:gap-[4px]">
                      <div className="flex-1 mobile:flex-initial mobile:min-w-0">
                        {!existingData.integration && <SelectCurrent />}
                      </div>
                      {!existingData.integration && (
                        <>
                          <div
                            onClick={() => setMobileSheet('channels')}
                            className="hidden mobile:flex shrink-0 w-[44px] h-[44px] rounded-[8px] bg-btnSimple justify-center items-center cursor-pointer"
                          >
                            <PlusIcon size={24} />
                          </div>
                          <div className="hidden mobile:block flex-1" />
                          {previewButton}
                          {settingsButton}
                        </>
                      )}
                    </div>
                    {/* Tadween: the footer is hidden on phones, the checks chip gets its own row */}
                    <div className="hidden mobile:flex mobile:empty:hidden">
                      <EditorChecks />
                    </div>
                    <div
                      className={clsx(
                        'flex-1 flex',
                        mobileTab === 'preview' && 'mobile:hidden'
                      )}
                    >
                      {!hide && <EditorWrapper totalPosts={1} value="" />}
                    </div>
                    <div
                      id="social-empty"
                      className={clsx(
                        'pb-[16px] mobile:pb-0'
                        // current !== 'global' && 'hidden'
                      )}
                    />
                  </div>
                </div>
              </div>
              {/* on phones the settings open as a bottom sheet */}
              <div
                className={clsx('contents', !showSettings && 'mobile:hidden')}
              >
                {showSettings && (
                  <div
                    onClick={() => setShowSettings(false)}
                    className="hidden mobile:block fixed inset-0 z-[599] bg-popup backdrop-blur-[8px] animate-fadeIn touch-none"
                  />
                )}
                <div
                  id="wrapper-settings"
                  className={clsx(
                    'pb-[20px] px-[20px] select-none',
                    showSettings &&
                      'flex-1 flex pt-[20px] mobile:fixed mobile:inset-x-0 mobile:bottom-0 mobile:z-[600] mobile:max-h-[90%] mobile:p-0',
                    current === 'global' && 'hidden'
                  )}
                >
                  <div className="tdw-pem-settings flex-1 flex flex-col overflow-hidden mobile:pt-[8px] mobile:pb-[24px] mobile:animate-fade">
                    <div className="hidden mobile:contents">
                      <BottomSheetHeader
                        title={currentIntegrationText}
                        onClose={() => setShowSettings(false)}
                      />
                    </div>
                    <button
                      type="button"
                      aria-expanded={showSettings}
                      onClick={() => setShowSettings(!showSettings)}
                      className={clsx(
                        'tdw-pem-settings-head mobile:hidden',
                        showSettings && 'is-open'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        {currentIntegrationText}
                      </div>
                      <ChevronDownIcon rotated={showSettings} />
                    </button>
                    <div
                      className={clsx(
                        !showSettings ? 'hidden' : 'flex-1',
                        'text-[14px] text-textColor font-[500] relative mobile:min-h-0 mobile:overflow-y-auto mobile:overscroll-contain'
                      )}
                    >
                      <div className="absolute mobile:static left-0 top-0 w-full h-full mobile:h-auto flex flex-col overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-newBgColorInner scrollbar-track-newColColor">
                        <div
                          id="social-settings"
                          className="flex flex-col gap-[20px] bg-newBgColor"
                        />
                      </div>
                    </div>
                    <div className="hidden mobile:contents">
                      <BottomSheetButton
                        label={t('done', 'Done')}
                        onClick={() => setShowSettings(false)}
                      />
                    </div>
                    <style>
                      {`#social-settings [data-id="${current}"] {display: block !important;}`}
                    </style>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className={clsx(
              'w-[580px] tablet:w-[440px] mobile:!w-full flex flex-col mobile:flex-1',
              mobileTab === 'edit' && 'mobile:hidden'
            )}
          >
            <div className="bg-newBgColor h-[65px] rounded-e-[20px] !rounded-b-[0] mobile:hidden flex items-center px-[20px] text-[20px] font-[600]">
              <div className="flex-1">{t('post_preview', 'Post Preview')}</div>
              <div className="cursor-pointer mobile:hidden">
                <CloseIcon onClick={askClose} className="text-[#A3A3A3]" />
              </div>
            </div>
            <div className="flex-1 relative">
              <Scrollable
                scrollClasses="!pe-[20px]"
                className="absolute mobile:static top-0 p-[20px] pe-[8px] mobile:p-[16px] left-0 w-full h-full mobile:h-auto overflow-x-hidden overflow-y-scroll mobile:overflow-y-visible scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner"
              >
                <ShowAllProviders ref={ref} />
              </Scrollable>
            </div>
          </div>
        </div>
        <div className="tdw-pem-foot select-none h-[84px] py-[20px] border-t border-newBorder flex items-center mobile:hidden">
          <div className="flex-1 flex ps-[20px] gap-[8px]">
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

            {!dummy && (
              <RepeatComponent repeat={repeater} onChange={setRepeater} />
            )}

            <EditorChecks />
          </div>
          <div className="pe-[20px] flex items-center justify-end gap-[8px]">
            {existingData?.integration && (
              <button
                type="button"
                onClick={deletePost}
                className="tdw-btn tdw-btn-ghost is-danger"
              >
                <div>
                  <TrashIcon />
                </div>
                <div>{t('delete_post', 'Delete Post')}</div>
              </button>
            )}
            <DatePicker onChange={setDate} date={date} />
            {!addEditSets && (
              <button
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
                className="tdw-btn tdw-btn-secondary relative"
              >
                {loading && (
                  <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
                    <div className="animate-spin h-[20px] w-[20px] border-4 border-textColor border-t-transparent rounded-full" />
                  </div>
                )}
                <div className={clsx(loading && 'invisible')}>
                  {t('save_as_draft', 'Save as Draft')}
                </div>
              </button>
            )}
            {addEditSets && (
              <button
                className="tdw-btn tdw-btn-primary min-w-[180px]"
                disabled={
                  selectedIntegrations.length === 0 || loading || locked
                }
                onClick={schedule('draft')}
              >
                Save Set
              </button>
            )}
            {!addEditSets && (
              <div ref={postNowRef} className="tdw-split">
                <button
                  disabled={
                    selectedIntegrations.length === 0 || loading || locked
                  }
                  onClick={schedule('schedule')}
                  className="tdw-btn tdw-btn-primary tdw-split-main relative min-w-[180px]"
                >
                  {loading && (
                    <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
                      <div className="animate-spin h-[20px] w-[20px] border-4 border-white border-t-transparent rounded-full" />
                    </div>
                  )}
                  <div className={clsx(loading && 'invisible')}>
                    {selectedIntegrations.length === 0
                      ? t('check_circles_above', 'Check the circles above')
                      : scheduleLabel}
                  </div>
                </button>
                {!dummy && (
                  <button
                    type="button"
                    aria-label={t('tdw_more_publish_options', 'More publish options')}
                    aria-haspopup="menu"
                    aria-expanded={showPostNow}
                    disabled={
                      selectedIntegrations.length === 0 || loading || locked
                    }
                    onClick={() => setShowPostNow(!showPostNow)}
                    className="tdw-btn tdw-btn-primary tdw-split-more"
                  >
                    <DropdownArrowSmallIcon
                      className={clsx(showPostNow && 'rotate-180')}
                    />
                  </button>
                )}
                {!dummy && showPostNow && (
                  <div className="tdw-split-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowPostNow(false);
                        schedule('now')();
                      }}
                      disabled={
                        selectedIntegrations.length === 0 || loading || locked
                      }
                      className="tdw-split-item post-now"
                    >
                      <TadweenIcon name="send" size={15} />
                      {t('post_now', 'Post Now')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {mobileSheet === 'channels' && (
        <BottomSheet
          title={t('select_channels', 'Select Channels')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('done', 'Done'),
            onClick: () => setMobileSheet(null),
            disabled: selectedIntegrations.length === 0,
          }}
        >
          {!dummy && (
            <div className="flex pb-[8px] empty:hidden">
              <SelectCustomer
                onChange={changeCustomer}
                integrations={integrations}
              />
            </div>
          )}
          <PicksSocialsComponent list={true} />
        </BottomSheet>
      )}
      {mobileSheet === 'settings' && (
        <BottomSheet
          title={t('settings', 'Settings')}
          onClose={() => setMobileSheet(null)}
        >
          <div className="flex flex-col gap-[12px] pb-[30px]">
            {hasChannelSettings && (
              <BottomSheetRow
                icon={<SettingsOutlineIcon size={24} />}
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
            <BottomSheetRow
              icon={<TagIcon width={24} height={24} />}
              label={t('add_tag', 'Add Tag')}
              onClick={() => setMobileSheet('tags')}
            />
            <BottomSheetRow
              icon={<RepeatIcon size={24} />}
              label={t('repeat_post', 'Repeat Post')}
              onClick={() => setMobileSheet('repeat')}
            />
            {existingData?.integration && (
              <div
                onClick={deletePost}
                className="flex items-center gap-[12px] py-[8px] cursor-pointer text-[#FF3F3F]"
              >
                <TrashIcon size={24} />
                <div className="text-[15px] font-[600]">
                  {t('delete_post', 'Delete Post')}
                </div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
      {mobileSheet === 'tags' && (
        <BottomSheet
          title={t('add_tag', 'Add Tag')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('done', 'Done'),
            onClick: () => setMobileSheet(null),
          }}
        >
          <TagsComponent
            name="tags"
            label={t('tags', 'Tags')}
            initial={tags}
            onChange={(e) => {
              setTags(e.target.value);
            }}
            list={true}
          />
        </BottomSheet>
      )}
      {mobileSheet === 'date' && (
        <BottomSheet
          title={t('change_date_or_time', 'Change Date or Time')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('save', 'Save'),
            onClick: () => {
              setDate(dateDraft);
              setMobileSheet(null);
            },
          }}
        >
          <DatePickerPanel
            date={dateDraft}
            onChange={setDateDraft}
            sheet={true}
          />
        </BottomSheet>
      )}
      {mobileSheet === 'repeat' && (
        <BottomSheet
          title={t('repeat_post', 'Repeat Post')}
          onClose={() => setMobileSheet(null)}
          button={{
            label: t('done', 'Done'),
            onClick: () => setMobileSheet(null),
          }}
        >
          <RepeatComponent
            repeat={repeater}
            onChange={setRepeater}
            list={true}
          />
        </BottomSheet>
      )}
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
      />
    </div>
  );
};

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
