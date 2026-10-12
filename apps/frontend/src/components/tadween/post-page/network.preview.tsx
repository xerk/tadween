'use client';

// NetworkPreview: "How it will look on …". One tab per channel the post goes
// to (the public post covers one channel, so today that is one tab), shown in
// a phone or desktop frame. The preview itself is the composer's own.
import { Component, FC, ReactNode, useState } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  SegmentedControl,
  Skeleton,
  Tabs,
} from '@gitroom/frontend/components/tadween/ui';
import type { PublicPost } from '@gitroom/frontend/components/tadween/post-page/post.page';
import { networkName } from '@gitroom/frontend/components/tadween/post-page/post.card';

const ProviderPostPreview = dynamic(
  () => import('@gitroom/frontend/components/tadween/post-page/provider.preview'),
  {
    ssr: false,
    loading: () => (
      <div className="tdw-pp-device-loading">
        <Skeleton width={40} height={40} radius={20} />
        <Skeleton height={12} />
        <Skeleton height={12} width="70%" />
        <Skeleton height={160} radius={12} />
      </div>
    ),
  }
);

// A provider preview that throws only loses the preview, never the post page.
class PreviewBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('network preview failed', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type Device = 'phone' | 'desktop';

export const NetworkPreview: FC<{ post: PublicPost }> = ({ post }) => {
  const t = useT();
  const channels = [post];
  const [current, setCurrent] = useState(post.id);
  const [device, setDevice] = useState<Device>('phone');
  const shown = channels.find((c) => c.id === current) || post;
  const network = networkName(shown.integration.providerIdentifier);

  return (
    <section className="tdw-pp-panel" aria-labelledby="tdw-pp-preview">
      <h2 id="tdw-pp-preview" className="tdw-pp-panel-h">
        {t('tdw_pp_how_it_looks', 'How it will look on {{network}}', {
          network,
        })}
      </h2>
      {channels.length > 1 && (
        <Tabs
          value={current}
          onChange={setCurrent}
          tabs={channels.map((c) => ({
            value: c.id,
            label: networkName(c.integration.providerIdentifier),
          }))}
        />
      )}
      <div className="tdw-pp-device-switch">
        <SegmentedControl<Device>
          size="sm"
          label={t('tdw_pp_device', 'Device')}
          value={device}
          onChange={setDevice}
          options={[
            { value: 'phone', label: t('tdw_pp_phone', 'Phone'), icon: 'smartphone' },
            { value: 'desktop', label: t('tdw_pp_desktop', 'Desktop'), icon: 'monitor' },
          ]}
        />
      </div>
      <div className={`tdw-pp-device is-${device}`}>
        {device === 'phone' ? (
          <span className="tdw-pp-device-island" aria-hidden="true" />
        ) : (
          <div className="tdw-pp-device-chrome" aria-hidden="true">
            <span />
            <span />
            <span />
            <div className="tdw-pp-device-url">{network}</div>
          </div>
        )}
        <div className="tdw-pp-device-screen">
          <PreviewBoundary
            key={shown.id}
            fallback={
              <p className="tdw-pp-note tdw-pp-device-fallback">
                {t(
                  'tdw_pp_preview_unavailable',
                  "The {{network}} preview couldn't be drawn. The post above is what will be published.",
                  { network }
                )}
              </p>
            }
          >
            <ProviderPostPreview post={shown} />
          </PreviewBoundary>
        </div>
      </div>
      <p className="tdw-pp-note">
        {t(
          'tdw_pp_preview_note',
          'An approximation. The network decides the final layout, and text past its limit is highlighted.'
        )}
      </p>
    </section>
  );
};
