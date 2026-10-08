'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { orderBy } from 'lodash';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  expandPosts,
  expandPostsList,
} from '@gitroom/helpers/utils/posts.list.minify';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { SetSelectionModal } from '@gitroom/frontend/components/launches/calendar';
import { CustomVariables } from '@gitroom/frontend/components/launches/add.provider.component';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';

// Data and actions for the Today page. Every request is an endpoint the calendar
// already uses (/posts, /posts/list, /posts/group, /integrations/list, /sets),
// one SWR hook each. The create / edit actions open Postiz's own AddEditModal
// the same way the calendar's "Create Post" and post chips do.

export type TodayPost = {
  id: string;
  group: string;
  content: string;
  publishDate: string;
  actualDate?: string;
  state: 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT';
  error?: string | null;
  releaseURL?: string | null;
  intervalInDays?: number | null;
  integration: {
    id: string;
    name: string;
    picture: string;
    providerIdentifier: string;
  };
};

export type TodayIntegration = Integrations & {
  refreshNeeded?: boolean;
  internalId?: string;
  isCustomFields?: boolean;
  customFields?: any[];
};

const swrOptions = {
  revalidateOnFocus: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
};

// The selected customer, read from `?customer=` like CalendarWeekProvider's
// initial filter; '' means every customer, as on the calendar.
export const useTodayCustomer = () => useSearchParams().get('customer') || '';

// The calendar's week query: same params as CalendarWeekProvider.loadData
export const useTodayWeekPosts = (startDate: string, endDate: string) => {
  const fetch = useFetch();
  const customer = useTodayCustomer();
  const load = useCallback(async () => {
    const params = new URLSearchParams({
      display: 'week',
      customer,
      startDate: dayjs.utc(startDate).format(),
      endDate: dayjs.utc(endDate).format(),
    }).toString();
    const data = await (await fetch(`/posts?${params}`)).json();
    return (expandPosts(data)?.posts || []) as TodayPost[];
  }, [startDate, endDate, customer]);
  return useSWR(`today-week-${startDate}-${customer}`, load, swrOptions);
};

// Upcoming QUEUE posts, soonest first (the calendar's list view, "scheduled")
export const useTodayNextPost = () => {
  const fetch = useFetch();
  const customer = useTodayCustomer();
  const load = useCallback(async () => {
    const data = await (
      await fetch(
        `/posts/list?page=0&limit=1&customer=${encodeURIComponent(customer)}&state=scheduled`
      )
    ).json();
    return ((expandPostsList(data)?.posts || [])[0] || null) as TodayPost | null;
  }, [customer]);
  return useSWR(`today-next-${customer}`, load, swrOptions);
};

// The whole group of the next post: the only response that carries its media
export const useTodayPostGroup = (group?: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch(`/posts/group/${group}`)).json();
  }, [group]);
  return useSWR(group ? `today-group-${group}` : null, load, swrOptions);
};

export const useTodayDrafts = () => {
  const fetch = useFetch();
  const customer = useTodayCustomer();
  const load = useCallback(async () => {
    const data = expandPostsList(
      await (
        await fetch(
          `/posts/list?page=0&limit=5&customer=${encodeURIComponent(customer)}&state=draft`
        )
      ).json()
    );
    return {
      posts: (data?.posts || []) as TodayPost[],
      total: (data?.total || 0) as number,
    };
  }, [customer]);
  return useSWR(`today-drafts-${customer}`, load, swrOptions);
};

// The organisation's own most recent published posts, for "when you usually post"
export const useTodayPublished = () => {
  const fetch = useFetch();
  const customer = useTodayCustomer();
  const load = useCallback(async () => {
    const data = await (
      await fetch(
        `/posts/list?page=0&limit=100&customer=${encodeURIComponent(customer)}&state=published`
      )
    ).json();
    return (expandPostsList(data)?.posts || []) as TodayPost[];
  }, [customer]);
  return useSWR(`today-published-${customer}`, load, swrOptions);
};

// Same key and request as CalendarWeekProvider, so the two share one cache entry
export const useTodaySets = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/sets')).json();
  }, []);
  return useSWR('sets', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

// Same key and request as CalendarWeekProvider's default signature
export const useTodayDefaultSignature = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/signatures/default')).json();
  }, []);
  return useSWR('default-sign', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
};

// Channels in the order the calendar lists them (launches.component.tsx)
export const useTodayIntegrations = () => {
  const { data, isLoading, mutate } = useIntegrationList();
  const integrations = useMemo(
    () =>
      orderBy(
        (data || []) as TodayIntegration[],
        ['type', 'disabled', 'identifier'],
        ['desc', 'asc', 'asc']
      ),
    [data]
  );
  return { integrations, isLoading, mutate };
};

export const useTodayActions = (
  integrations: TodayIntegration[],
  reload: () => void
) => {
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const router = useRouter();
  const t = useT();
  const { data: sets } = useTodaySets();
  const { data: signature } = useTodayDefaultSignature();

  // NewPost (launches/new.post.tsx): pick a set if there are any, then the editor
  // `day` (from the week strip) keeps the next free slot's time of day on that day
  // and, like the calendar's "+" on a slot (CalendarColumn.addModal), starts the
  // post with the default signature when no set was picked
  const create = useCallback(
    async (day?: dayjs.Dayjs) => {
      const slot = dayjs
        .utc((await (await fetch('/posts/find-slot')).json()).date)
        .local();
      const onDay = day
        ? day.hour(slot.hour()).minute(slot.minute()).second(0)
        : slot;
      const soon = dayjs.utc().local().add(10, 'minute').second(0);
      const date = onDay.isBefore(soon) ? soon : onDay;

      const set: any = !sets?.length
        ? undefined
        : await new Promise((resolve) => {
            modal.openModal({
              title: t('select_set', 'Select a Set'),
              closeOnClickOutside: true,
              closeOnEscape: true,
              withCloseButton: false,
              onClose: () => resolve('exit'),
              classNames: {
                modal: 'text-textColor',
              },
              children: (
                <SetSelectionModal
                  sets={sets}
                  onSelect={(selectedSet) => {
                    resolve(selectedSet);
                    modal.closeAll();
                  }}
                  onContinueWithoutSet={() => {
                    resolve(undefined);
                    modal.closeAll();
                  }}
                />
              ),
            });
          });

      if (set === 'exit') return;

      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px] text-textColor',
        },
        children: (
          <AddEditModal
            allIntegrations={integrations.map((p) => ({ ...p }))}
            {...(day && signature?.id && !set
              ? {
                  onlyValues: [
                    {
                      content: '\n' + signature.content,
                    },
                  ],
                }
              : {})}
            {...(set?.content ? { set: JSON.parse(set.content) } : {})}
            reopenModal={() => create(day)}
            mutate={reload}
            integrations={integrations}
            date={date}
          />
        ),
        size: '80%',
        title: ``,
      });
    },
    [integrations, sets, signature, reload]
  );

  // The calendar chip's edit (launches/calendar.tsx → usePostActions.editPost)
  const edit = useCallback(
    (post: TodayPost) => async () => {
      const data = await (await fetch(`/posts/group/${post.group}`)).json();
      if (!data?.posts?.length) {
        toaster.show(t('post_not_found', 'Post not found'), 'warning');
        reload();
        return;
      }
      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px] text-textColor',
        },
        children: (
          <ExistingDataContextProvider value={data}>
            <AddEditModal
              allIntegrations={integrations.map((p) => ({ ...p }))}
              reopenModal={edit(post)}
              mutate={reload}
              integrations={integrations
                .filter((f) => f.id === data.integration)
                .map((p) => ({ ...p, picture: data.integrationPicture }))}
              date={dayjs.utc(data.posts[0].publishDate).local()}
            />
          </ExistingDataContextProvider>
        ),
        size: '80%',
        title: ``,
      });
    },
    [integrations, reload, t, fetch, modal, toaster]
  );

  // The calendar chip's preview: the public share page
  const preview = useCallback(
    (post: TodayPost) => () => {
      window.open(`/p/` + post.id + '?share=true', '_blank');
    },
    []
  );

  // The channel list's reconnect (launches.component.tsx → refreshChannel)
  const reconnect = useCallback(
    (integration: TodayIntegration) => async () => {
      if (integration.inBetweenSteps) {
        router.push(
          `/launches?added=${integration.identifier}&continue=${integration.id}`
        );
        return;
      }
      if (integration.isCustomFields) {
        modal.openModal({
          title: t('custom_url', 'Custom URL'),
          withCloseButton: false,
          classNames: {
            modal: 'md',
          },
          children: (
            <CustomVariables
              identifier={integration.identifier}
              gotoUrl={(url: string) => router.push(url)}
              variables={integration.customFields || []}
            />
          ),
        });
        return;
      }
      const { url } = await (
        await fetch(
          `/integrations/social/${integration.identifier}?refresh=${integration.internalId}`,
          {
            method: 'GET',
          }
        )
      ).json();
      window.location.href = url;
    },
    []
  );

  return { create, edit, preview, reconnect };
};
