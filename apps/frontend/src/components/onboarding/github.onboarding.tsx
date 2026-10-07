import { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { GithubComponent } from '@gitroom/frontend/components/settings/github.component';
import {
  Skeleton,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
export const GithubOnboarding: FC = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const { github } = await (await fetch('/settings/github')).json();
    if (!github) {
      return false;
    }
    const emptyOnes = github.find((p: { login: string }) => !p.login);
    const { organizations } = emptyOnes
      ? await (await fetch(`/settings/organizations/${emptyOnes.id}`)).json()
      : {
          organizations: [],
        };
    return {
      github,
      organizations,
    };
  }, []);
  const { isLoading: isLoadingSettings, data: loadAll } = useSWR(
    'load-all',
    load
  );
  if (!loadAll) {
    // Tadween: a skeleton instead of an empty gap while settings load
    return isLoadingSettings ? (
      <TadweenScope className="grid gap-[8px]">
        <Skeleton height={44} radius={10} />
        <Skeleton height={44} radius={10} />
      </TadweenScope>
    ) : null;
  }
  return (
    <GithubComponent
      github={loadAll.github}
      organizations={loadAll.organizations}
    />
  );
};
