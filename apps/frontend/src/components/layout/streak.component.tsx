'use client';

import { FC, useCallback, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { TopbarPopover } from '@gitroom/frontend/components/tadween/shell/topbar.popover';
import {
  TadweenSheet,
  usePhoneLayout,
} from '@gitroom/frontend/components/tadween/sheet/tadween.sheet';

// Tadween: the flame opens the workspace's posting days (a popover, a sheet on
// phones): the current streak, the best one in the last 12 months, and the
// last five weeks with the days something was published. The streak itself is
// the streak workflow's (orchestrator streak.workflow.ts): it starts with a
// publish and ends after 24 hours without one, so a run of publishes less
// than a day apart is one streak. Styles: app/tadween/consistency.scss.

const DAY = 86400000;
const WEEKS = 5;

const useStreakDays = (streakSince?: string | null) =>
  useMemo(() => {
    if (!streakSince) return 0;
    const diffDays = Math.floor(
      (Date.now() - new Date(streakSince).getTime()) / DAY
    );
    return Math.max(diffDays + 1, 1);
  }, [streakSince]);

// When this workspace published in the last 12 months (only while open)
const usePublishedDates = (open: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return (await (await fetch(path)).json()) as string[];
  }, []);
  // whole days, so the key holds still for the day
  const params = new URLSearchParams({
    startDate: newDayjs().subtract(12, 'month').startOf('day').utc().format(),
    endDate: newDayjs().endOf('day').utc().format(),
  }).toString();
  return useSWR(open ? `/posts/published-dates?${params}` : null, load, {
    revalidateOnFocus: false,
  });
};

const FlameIcon: FC = () => (
  <svg
    width="14"
    height="17"
    viewBox="0 0 22 27"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M17.9862 17.1673C17.7269 18.6157 17.0301 19.9498 15.9896 20.9902C14.949 22.0305 13.6147 22.7271 12.1663 22.986C12.1113 22.9949 12.0557 22.9995 12 22.9998C11.7492 22.9997 11.5075 22.9054 11.323 22.7355C11.1384 22.5656 11.0245 22.3326 11.0037 22.0826C10.9829 21.8326 11.0569 21.584 11.2108 21.3859C11.3648 21.1879 11.5876 21.055 11.835 21.0135C13.9062 20.6648 15.6637 18.9073 16.015 16.8323C16.0594 16.5707 16.2059 16.3375 16.4223 16.184C16.6387 16.0304 16.9072 15.9691 17.1688 16.0135C17.4303 16.058 17.6635 16.2045 17.8171 16.4209C17.9706 16.6372 18.0319 16.9057 17.9875 17.1673H17.9862ZM22 15.9998C22 18.9172 20.8411 21.7151 18.7782 23.778C16.7153 25.8409 13.9174 26.9998 11 26.9998C8.08262 26.9998 5.28473 25.8409 3.22183 23.778C1.15893 21.7151 0 18.9172 0 15.9998C0 12.5098 1.375 8.94105 4.0825 5.39355C4.1682 5.28122 4.27674 5.18833 4.40095 5.12099C4.52516 5.05365 4.66223 5.01341 4.80313 5.00289C4.94403 4.99238 5.08556 5.01185 5.21838 5.06001C5.35121 5.10817 5.47233 5.18393 5.57375 5.2823L8.58875 8.20855L11.3388 0.657298C11.3937 0.50669 11.484 0.371499 11.6022 0.263121C11.7203 0.154744 11.8628 0.0763568 12.0175 0.0345691C12.1723 -0.00721869 12.3349 -0.0111825 12.4915 0.023012C12.6481 0.0572064 12.7942 0.128557 12.9175 0.231048C15.6512 2.4998 22 8.56855 22 15.9998ZM20 15.9998C20 10.2385 15.5262 5.2598 12.7237 2.70855L9.94 10.3423C9.88287 10.4991 9.78741 10.6391 9.66232 10.7495C9.53723 10.86 9.38648 10.9374 9.22383 10.9747C9.06117 11.0119 8.89177 11.0079 8.73107 10.963C8.57036 10.918 8.42346 10.8336 8.30375 10.7173L5.0075 7.5198C3.01125 10.401 2 13.2498 2 15.9998C2 18.3867 2.94821 20.6759 4.63604 22.3638C6.32387 24.0516 8.61305 24.9998 11 24.9998C13.3869 24.9998 15.6761 24.0516 17.364 22.3638C19.0518 20.6759 20 18.3867 20 15.9998Z"
      fill="currentColor"
    />
  </svg>
);

const StreakBody: FC<{ current: number; open: boolean }> = ({
  current,
  open,
}) => {
  const t = useT();
  const { data, isLoading } = usePublishedDates(open);

  const { days, best } = useMemo(() => {
    const times = (data || []).map((d) => new Date(d).getTime());
    const days = new Set(
      times.map((time) => newDayjs(time).local().format('YYYY-MM-DD'))
    );
    // runs of publishes less than a day apart, like the streak workflow
    let best = current;
    let start = times[0];
    times.forEach((time, i) => {
      if (i && time - times[i - 1] >= DAY) {
        start = time;
      }
      best = Math.max(best, Math.floor((time - start) / DAY) + 1);
    });
    return { days, best };
  }, [data, current]);

  const today = newDayjs();
  const todayKey = today.format('YYYY-MM-DD');
  const gridStart = today.startOf('isoWeek').subtract(WEEKS - 1, 'week');
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) =>
    gridStart.add(i, 'day')
  );
  const weekdays = cells.slice(0, 7).map((d) => d.format('dd'));
  const count = (n: number) =>
    n === 1
      ? t('tdw_streak_one_day', '1 day')
      : t('tdw_streak_n_days', '{{n}} days', { n });

  return (
    <div className="tdw-streak-body">
      <div className="tdw-streak-stats">
        <div className="tdw-streak-stat is-current">
          <span>{t('tdw_streak_current', 'Current streak')}</span>
          <b>{count(current)}</b>
        </div>
        <div className="tdw-streak-stat">
          <span>{t('tdw_streak_best', 'Best in 12 months')}</span>
          <b>{isLoading && !data ? '–' : count(best)}</b>
        </div>
      </div>
      <div
        className="tdw-streak-grid"
        role="grid"
        aria-label={t('tdw_streak_days_label', 'Days with a published post')}
      >
        {weekdays.map((d, i) => (
          <em key={i}>{d}</em>
        ))}
        {cells.map((day) => {
          const key = day.format('YYYY-MM-DD');
          const posted = days.has(key);
          return (
            <span
              key={key}
              role="gridcell"
              className={clsx(
                posted && 'is-posted',
                key === todayKey && 'is-today',
                key > todayKey && 'is-future'
              )}
              aria-current={key === todayKey ? 'date' : undefined}
              aria-label={`${day.format('LL')}${
                posted ? ` · ${t('tdw_streak_posted', 'Published')}` : ''
              }`}
            >
              {day.date()}
            </span>
          );
        })}
      </div>
      <p className="tdw-streak-how">
        {t(
          'tdw_streak_how',
          'Your workspace’s streak grows every day it publishes a post and ends after 24 hours without one.'
        )}
      </p>
    </div>
  );
};

export const StreakComponent: FC = () => {
  const user = useUser();
  const t = useT();
  const phone = usePhoneLayout();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const streakDays = useStreakDays(user?.streakSince);

  if (!user?.streakSince || streakDays <= 0) {
    return null;
  }

  const title = t('tdw_streak_title', 'Posting streak');
  const body = <StreakBody current={streakDays} open={open} />;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={clsx('tdw-streak flex items-center gap-[6px]', open && 'is-open')}
        aria-expanded={open}
        aria-label={`${title}: ${streakDays}`}
        onClick={() => setOpen(!open)}
      >
        <FlameIcon />
        <span className="tdw-streak-count">{streakDays}</span>
      </button>
      {phone ? (
        <TadweenSheet open={open} onClose={close} title={title}>
          {body}
        </TadweenSheet>
      ) : (
        <TopbarPopover
          open={open}
          onClose={close}
          anchor={trigger}
          label={title}
          className="tdw-streak-popover"
        >
          <h2 className="tdw-streak-head">{title}</h2>
          {body}
        </TopbarPopover>
      )}
    </>
  );
};
