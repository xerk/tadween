'use client';

// The composer's own network preview (LinkedIn, X, Instagram…) for a published
// post, fed through the same IntegrationContext the composer uses. Loaded
// lazily by NetworkPreview, so the provider list only downloads when shown.
// The providers' DTOs use class-validator decorators, hence reflect-metadata.
import 'reflect-metadata';
import { FC, useEffect, useMemo, useState } from 'react';
import { Providers } from '@gitroom/frontend/components/new-launch/providers/show.all.providers';
import { getProviderSettingsMeta } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { GeneralPreviewComponent } from '@gitroom/frontend/components/launches/general.preview.component';
import {
  IntegrationContext,
  IntegrationContextType,
} from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import type { PublicPost } from '@gitroom/frontend/components/tadween/post-page/post.page';

const ProviderPostPreview: FC<{ post: PublicPost }> = ({ post }) => {
  const { integration, parts } = post;

  // The previews read the composer's current channel; on 'global' they draw
  // the shared draft ("Global Edit", no picture). Set it before they render.
  useState(() => useLaunchStore.setState({ current: post.id }));
  useEffect(
    () => () => useLaunchStore.setState({ current: 'global' }),
    []
  );

  const meta = useMemo(() => {
    const entry = Providers.find(
      (p) => p.identifier === integration.providerIdentifier
    );
    return entry ? getProviderSettingsMeta(entry.component) : undefined;
  }, [integration.providerIdentifier]);

  const maximumCharacters = useMemo(() => {
    const max = meta?.maximumCharacters;
    try {
      return typeof max === 'function' ? max([]) : max;
    } catch {
      return undefined;
    }
  }, [meta]);

  const context = useMemo<IntegrationContextType>(
    () => ({
      date: newDayjs(post.publishDate),
      allIntegrations: [],
      integration: {
        id: post.id,
        name: integration.name,
        picture: integration.picture,
        identifier: integration.providerIdentifier,
        display: integration.profile,
        type: 'social',
        editor: 'normal',
        disabled: false,
        inBetweenSteps: false,
        changeProfilePicture: false,
        changeNickName: false,
        additionalSettings: '[]',
        time: [],
      } as IntegrationContextType['integration'],
      value: parts.map((p) => ({
        id: p.id,
        content: p.content,
        image: p.media.map((m) => ({ id: m.id, path: m.path })),
      })),
    }),
    [post]
  );

  const Preview = meta?.CustomPreviewComponent || GeneralPreviewComponent;
  return (
    <IntegrationContext.Provider value={context}>
      <Preview maximumCharacters={maximumCharacters} />
    </IntegrationContext.Provider>
  );
};

export default ProviderPostPreview;
