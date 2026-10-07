import React, { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { timer } from '@gitroom/helpers/utils/timer';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Button,
  Dialog,
  Spinner,
} from '@gitroom/frontend/components/tadween/ui';

export const FinishTrial: FC<{ close: () => void }> = (props) => {
  const [finished, setFinished] = useState(false);
  const fetch = useFetch();
  const t = useT();

  const finishSubscription = useCallback(async () => {
    await fetch('/billing/finish-trial', {
      method: 'POST',
    });
    checkFinished();
  }, []);

  const checkFinished = useCallback(async () => {
    const {finished} = await (await fetch('/billing/is-trial-finished')).json();
    if (!finished) {
      await timer(2000);
      return checkFinished();
    }

    setFinished(true);
  }, []);

  useEffect(() => {
    finishSubscription();
  }, []);

  // Tadween: a design-system dialog; the polling above is unchanged
  return (
    <Dialog
      open={true}
      onClose={props.close}
      size="sm"
      title={t('tdw_finishing_trial', 'Finishing your trial')}
      description={
        finished
          ? t(
              'tdw_trial_finished',
              'Your trial has ended and your first payment went through.'
            )
          : t(
              'tdw_trial_finishing',
              'Charging your card and starting your plan. This takes a few seconds.'
            )
      }
      footer={
        finished ? (
          <>
            <Button variant="ghost" onClick={() => window.close()}>
              {t('tdw_close_window', 'Close window')}
            </Button>
            <Button variant="primary" onClick={() => props.close()}>
              {t('tdw_done', 'Done')}
            </Button>
          </>
        ) : null
      }
    >
      {!finished ? (
        <div className="flex justify-center py-[16px]">
          <Spinner size={32} label={t('tdw_finishing_trial', 'Finishing your trial')} />
        </div>
      ) : null}
    </Dialog>
  );
};
