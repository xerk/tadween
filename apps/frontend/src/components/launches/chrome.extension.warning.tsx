'use client';

import { FC, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useBrandLinks } from '@gitroom/frontend/components/tadween/instance/instance.settings';
import { NetworkIcon } from '@gitroom/frontend/components/new-launch/providers/continue-provider/with-continue-provider';
import {
  Button,
  Checkbox,
  Icon,
  IconButton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';

// Tadween: the risks of connecting through the browser extension, in the
// app modal (a bottom sheet on phones). The modal's own title row is hidden,
// the notice draws its header (app/tadween/extension.scss)
export const ChromeExtensionWarning: FC<{
  identifier: string;
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ identifier, name, onConfirm, onCancel }) => {
  const modals = useModals();
  const t = useT();
  const brand = useBrandLinks();
  const { chromeExtensionUrl } = useVariables();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [understood, setUnderstood] = useState(false);

  // keyboard users start inside the notice
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const cancel = useCallback(() => {
    modals.closeCurrent();
    onCancel();
  }, [modals, onCancel]);

  const risks = [
    {
      icon: 'triangle-alert',
      tone: 'warning',
      title: t('tdw_extension_risk_account', 'Account risk'),
      body: t(
        'tdw_extension_risk_account_body',
        "Connecting through a browser extension may break {{network}}'s terms of service, and {{network}} could suspend or ban your account.",
        { network: name }
      ),
    },
    {
      icon: 'refresh-cw',
      tone: 'warning',
      title: t('tdw_extension_risk_reliability', 'Reliability'),
      body: t(
        'tdw_extension_risk_reliability_body',
        "It's less reliable than other channels and may disconnect without warning. When your {{network}} session expires, you'll need to reconnect.",
        { network: name }
      ),
    },
    {
      icon: 'lock',
      tone: 'info',
      title: t('tdw_extension_risk_data', 'Your data'),
      body: t(
        'tdw_extension_risk_data_body',
        'We store your {{network}} login session encrypted and use it only to post for you.',
        { network: name }
      ),
    },
  ];

  return (
    <TadweenScope>
      <div
        ref={rootRef}
        tabIndex={-1}
        role="dialog"
        aria-labelledby={titleId}
        className="tdw-extension"
        // the modal's Escape hotkey skips form fields, so the checkbox
        // closes the notice itself
        onKeyDown={(e) => {
          if (
            e.key === 'Escape' &&
            (e.target as HTMLElement).matches('input')
          ) {
            cancel();
          }
        }}
      >
        <header className="tdw-extension-head">
          <NetworkIcon identifier={identifier} />
          <div className="tdw-extension-heading">
            <h2 id={titleId} className="tdw-extension-title">
              {t(
                'tdw_extension_title',
                'Connect {{network}} with the {{brand}} browser extension',
                { network: name, brand: brand.name }
              )}
            </h2>
            <p className="tdw-extension-intro">
              {t(
                'tdw_extension_intro',
                '{{network}} connects through our browser extension, which uses your {{network}} login from this browser.',
                { network: name }
              )}
            </p>
          </div>
          <IconButton
            icon="x"
            label={t('close', 'Close')}
            className="tdw-extension-close"
            onClick={cancel}
          />
        </header>

        <ul className="tdw-extension-risks">
          {risks.map((risk) => (
            <li
              key={risk.icon}
              className={`tdw-extension-risk pz-banner-${risk.tone}`}
            >
              <Icon name={risk.icon} className="pz-banner-icon" />
              <span className="tdw-extension-risk-text">
                <strong>{risk.title}</strong>
                <span>{risk.body}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Add channel lists these channels only with CHROME_EXTENSION_URL set */}
        <a
          className="tdw-extension-install"
          href={chromeExtensionUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="puzzle" />
          {t('tdw_extension_install', 'Install the extension')}
          <Icon name="external-link" size={14} />
        </a>

        <div className="tdw-extension-consent">
          <Checkbox
            label={t('tdw_extension_understand', 'I understand the risks')}
            checked={understood}
            onChange={setUnderstood}
          />
        </div>

        <footer className="tdw-extension-foot">
          <Button variant="ghost" onClick={cancel}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={!understood}
            onClick={() => {
              modals.closeCurrent();
              onConfirm();
            }}
          >
            {t('continue', 'Continue')}
          </Button>
        </footer>
      </div>
    </TadweenScope>
  );
};
