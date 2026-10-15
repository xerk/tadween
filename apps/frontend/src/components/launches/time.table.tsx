'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import dayjs from 'dayjs';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
// @ts-ignore
import useKeypress from 'react-use-keypress';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { sortBy } from 'lodash';
import { usePreventWindowUnload } from '@gitroom/react/helpers/use.prevent.window.unload';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import {
  Button as TdwButton,
  Icon,
  IconButton,
  Select,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import { TadweenEmptyState } from '@gitroom/frontend/components/tadween/empty.state';

dayjs.extend(utc);
dayjs.extend(timezone);

const hourOptions = [...Array(24).keys()].map((i) => ({
  value: i,
  label: i.toString().padStart(2, '0'),
}));

const minuteOptions = [...Array(60).keys()].map((i) => ({
  value: i,
  label: i.toString().padStart(2, '0'),
}));

export const TimeTable: FC<{
  integration: Integrations;
  mutate: () => void;
}> = (props) => {
  const t = useT();
  const {
    integration: { time },
    mutate,
  } = props;
  const [currentTimes, setCurrentTimes] = useState([...time]);
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const fetch = useFetch();
  const modal = useModals();
  usePreventWindowUnload(true);

  const askClose = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'are_you_sure_you_want_to_close_the_window',
          'Are you sure you want to close the window?'
        ),
        t('yes_close', 'Yes, close'),
        undefined,
        undefined,
        // closing drops the slots that weren't saved: the red action
        true
      ))
    ) {
      return;
    }
    modal.closeAll();
  }, []);

  useKeypress('Escape', askClose);

  // `value` is the slot's minutes: the list on screen is sorted, the saved
  // one isn't, so the slot is found by its time rather than its position
  const removeSlot = useCallback(
    (value: number) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_this_slot',
            'Are you sure you want to delete this slot?'
          )
        ))
      ) {
        return;
      }
      setCurrentTimes((prev) => {
        const index = prev.findIndex((p) => p.time === value);
        return prev.filter((_, i) => i !== index);
      });
    },
    []
  );

  const addHour = useCallback(() => {
    const calculateMinutes =
      newDayjs()
        .utc()
        .startOf('day')
        .add(hour, 'hours')
        .add(minute, 'minutes')
        .diff(newDayjs().utc().startOf('day'), 'minutes') -
      dayjs.tz().utcOffset();
    setCurrentTimes((prev) => [
      ...prev,
      {
        time: calculateMinutes,
      },
    ]);
  }, [hour, minute]);

  const times = useMemo(() => {
    return sortBy(
      currentTimes.map(({ time }) => ({
        value: time,
        formatted: dayjs
          .utc()
          .startOf('day')
          .add(time, 'minutes')
          .local()
          .format('HH:mm'),
      })),
      (p) => p.value
    );
  }, [currentTimes]);

  const save = useCallback(async () => {
    await fetch(`/integrations/${props.integration.id}/time`, {
      method: 'POST',
      body: JSON.stringify({
        time: currentTimes,
      }),
    });
    mutate();
    modal.closeAll();
  }, [currentTimes]);

  // Tadween: the kit's selects, rows and actions
  return (
    <TadweenScope className="tdw-modal-form tdw-slots">
      <p className="tdw-modal-lead">
        {t(
          'tdw_time_slots_lead',
          'New posts for this channel snap to these times. Times are in your time zone.'
        )}
      </p>
      <div className="tdw-slots-add">
        <Select<number>
          label={t('hour', 'Hour')}
          value={hour}
          onChange={setHour}
          options={hourOptions}
        />
        <Select<number>
          label={t('minutes', 'Minutes')}
          value={minute}
          onChange={setMinute}
          options={minuteOptions}
        />
        <TdwButton icon="plus" onClick={addHour}>
          {t('add', 'Add')}
        </TdwButton>
      </div>

      <div className="tdw-slots-list">
        <div className="tdw-slots-count">
          {t('scheduled_times', 'Scheduled Times')} · {times.length}
        </div>
        {times.length === 0 ? (
          <TadweenEmptyState
            size="sm"
            icon="clock"
            className="border border-dashed border-newTableBorder rounded-[12px]"
            title={t('no_time_slots', 'No time slots added yet')}
            body={t(
              'tdw_no_time_slots_body',
              'Add a time above and new posts for this channel will snap to it.'
            )}
          />
        ) : (
          <ul>
            {times.map((timeSlot, index) => (
              <li key={`${timeSlot.value}-${index}`} className="tdw-slots-row">
                <Icon name="clock" size={16} />
                <span className="time">{timeSlot.formatted}</span>
                <IconButton
                  icon="trash-2"
                  size="sm"
                  className="tdw-danger-icon"
                  label={`${t('delete', 'Delete')} ${timeSlot.formatted}`}
                  onClick={removeSlot(timeSlot.value)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tdw-modal-foot">
        <TdwButton variant="ghost" onClick={askClose}>
          {t('cancel', 'Cancel')}
        </TdwButton>
        <TdwButton variant="primary" onClick={save}>
          {t('save_changes', 'Save Changes')}
        </TdwButton>
      </div>
    </TadweenScope>
  );
};
