'use client';

import React, { FC, FormEventHandler, useCallback, useState } from 'react';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { showMediaBox } from '@gitroom/frontend/components/media/media.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const BotPicture: FC<{
  integration: Integrations;
  canChangeProfilePicture: boolean;
  canChangeNickName: boolean;
  mutate: () => void;
}> = (props) => {
  const t = useT();
  const modal = useModals();
  const toast = useToaster();
  const [nick, setNickname] = useState(
    props.integration.originalName || props.integration.name
  );
  const [picture, setPicture] = useState(
    props.integration.picture || '/no-picture.jpg'
  );
  const fetch = useFetch();
  const submitForm: FormEventHandler<HTMLFormElement> = useCallback(
    async (e) => {
      e.preventDefault();
      await fetch(`/integrations/${props.integration.id}/nickname`, {
        method: 'POST',
        body: JSON.stringify({
          name: nick,
          picture,
        }),
      });
      props.mutate();
      toast.show(t('updated', 'Updated'), 'success');
      modal.closeAll();
    },
    [nick, picture, props.mutate]
  );
  const openMedia = useCallback(() => {
    showMediaBox((values) => {
      setPicture(values.path);
    });
  }, []);
  return (
    <div className="w-full">
      <div>
        <form onSubmit={submitForm} className="tdw-modal-form">
          {props.canChangeProfilePicture && (
            <div className="flex items-center gap-[20px]">
              <img
                src={picture}
                alt=""
                className="w-[72px] h-[72px] rounded-full object-cover"
              />
              <Button type="button" onClick={openMedia}>
                {t('upload', 'Upload')}
              </Button>
            </div>
          )}
          {props.canChangeNickName && (
            <Input
              value={nick}
              onChange={(e) => setNickname(e.target.value)}
              name="Nickname"
              label={t('label_nickname', 'Nickname')}
              placeholder=""
              disableForm={true}
            />
          )}

          <div className="tdw-modal-foot">
            <Button type="submit">{t('save', 'Save')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
