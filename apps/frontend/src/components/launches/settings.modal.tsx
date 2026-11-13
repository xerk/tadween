import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import React, { FC, useCallback, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Integration } from '@prisma/client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Slider } from '@gitroom/react/form/slider';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const Element: FC<{
  setting: any;
  onChange: (value: any) => void;
}> = (props) => {
  const { setting, onChange } = props;
  const [value, setValue] = useState(setting.value);
  // Tadween: a settings row, the switch on the end side
  return (
    <div className="tdw-modal-setting">
      <div className="tdw-modal-setting-text">
        <span className="tdw-modal-setting-title">{setting.title}</span>
        <span className="tdw-modal-setting-desc">{setting.description}</span>
      </div>
      <Slider
        value={value === true ? 'on' : 'off'}
        onChange={() => {
          setValue(!value);
          onChange(!value);
        }}
        fill={true}
      />
    </div>
  );
};
export const SettingsModal: FC<{
  integration: Integration & {
    customer?: {
      id: string;
      name: string;
    };
  };
  onClose: () => void;
}> = (props) => {
  const fetch = useFetch();
  const t = useT();
  const { onClose, integration } = props;
  const modal = useModals();
  const [values, setValues] = useState(
    JSON.parse(integration?.additionalSettings || '[]')
  );
  const changeValue = useCallback(
    (index: number) => (value: any) => {
      const newValues = [...values];
      newValues[index].value = value;
      setValues(newValues);
    },
    [values]
  );
  const save = useCallback(async () => {
    await fetch(`/integrations/${integration.id}/settings`, {
      method: 'POST',
      body: JSON.stringify({
        additionalSettings: JSON.stringify(values),
      }),
    });
    modal.closeAll();
    onClose();
  }, [values, integration]);
  return (
    <div className="tdw-modal-form">
      <div className="tdw-modal-settings">
        {values.map((setting: any, index: number) => (
          <Element
            key={setting.title}
            setting={setting}
            onChange={changeValue(index)}
          />
        ))}
      </div>

      <div className="tdw-modal-foot">
        <Button className="bg-transparent" onClick={() => modal.closeAll()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button onClick={save}>{t('save', 'Save')}</Button>
      </div>
    </div>
  );
};
