'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import AuthenticationComponent from '@gitroom/frontend/components/settings/authentication.component';
import ShortlinkPreferenceComponent from '@gitroom/frontend/components/settings/shortlink-preference.component';
import DeleteAccountComponent from '@gitroom/frontend/components/settings/delete-account.component';
import { useFeatures } from '@gitroom/frontend/components/tadween/instance/instance.settings';

const MetricComponent = dynamic(
  () => import('@gitroom/frontend/components/settings/metric.component'),
  {
    ssr: false,
  }
);

export const GlobalSettings = () => {
  const isOn = useFeatures();
  return (
    <div className="flex flex-col">
      <AuthenticationComponent />
      <MetricComponent />
      {isOn('shortLinks') && <ShortlinkPreferenceComponent />}
      <DeleteAccountComponent />
    </div>
  );
};
