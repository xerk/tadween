import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import dayjs from 'dayjs';
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { continueProviderList } from '@gitroom/frontend/components/new-launch/providers/continue-provider/list';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
export const Null: FC<{
  onSave: (data: any) => Promise<void>;
  existingId: string[];
}> = () => null;
export const ContinueProvider: FC = () => {
  const { mutate } = useSWRConfig();
  const fetch = useFetch();
  const searchParams = useSearchParams();
  const added = searchParams.get('added');
  const continueId = searchParams.get('continue');
  const router = useRouter();
  const load = useCallback(async (path: string) => {
    const list = (await (await fetch(path)).json()).integrations;
    return list;
  }, []);
  const { data: integrations, isLoading } = useSWR('/integrations/list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });
  const refreshList = useCallback(() => {
    mutate('/integrations/list');
    const url = new URL(window.location.href);
    url.searchParams.delete('added');
    url.searchParams.delete('continue');
    router.push(url.toString());
  }, []);
  const Provider = useMemo(() => {
    if (!added) {
      return Null;
    }
    return (
      continueProviderList[added as keyof typeof continueProviderList] || Null
    );
  }, [added]);

  // the dialog opens once, so it waits for the list: it names the account
  // being set up and leaves out what is already connected
  if (
    !added ||
    !continueId ||
    !integrations ||
    isLoading ||
    Provider === Null
  ) {
    return null;
  }

  return (
    <ContinueModal
      refreshList={refreshList}
      added={added}
      continueId={continueId}
      integrations={integrations.map((p: any) => p.internalId)}
      channel={integrations.find((p: any) => p.id === continueId)}
      provider={Provider}
    />
  );
};

const ModalContent: FC<{
  continueId: string;
  added: any;
  provider: any;
  closeModal: () => void;
  integrations: string[];
  channel?: { name?: string; picture?: string };
}> = ({
  continueId,
  added,
  provider: Provider,
  closeModal,
  integrations,
  channel,
}) => {
  const fetch = useFetch();

  const onSave = useCallback(
    async (data: any) => {
      await fetch(`/integrations/provider/${continueId}/connect`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      closeModal();
    },
    [continueId, closeModal]
  );

  return (
    <IntegrationContext.Provider
      value={{
        date: newDayjs(),
        value: [],
        allIntegrations: [],
        integration: {
          editor: 'normal',
          additionalSettings: '',
          display: '',
          time: [
            {
              time: 0,
            },
          ],
          id: continueId,
          type: '',
          name: channel?.name || '',
          picture: channel?.picture || '',
          inBetweenSteps: true,
          changeNickName: false,
          changeProfilePicture: false,
          identifier: added,
        },
      }}
    >
      <Provider
        onSave={onSave}
        existingId={integrations}
        onClose={closeModal}
      />
    </IntegrationContext.Provider>
  );
};

const ContinueModal: FC<{
  continueId: string;
  added: any;
  provider: any;
  integrations: string[];
  channel?: { name?: string; picture?: string };
  refreshList: () => void;
}> = (props) => {
  const modals = useModals();

  useEffect(() => {
    // the step draws its own header (network, title, account), see
    // with-continue-provider.tsx; every way of closing refreshes the list
    modals.openModal({
      title: '',
      withCloseButton: false,
      size: 560,
      onClose: props.refreshList,
      children: (close) => <ModalContent {...props} closeModal={close} />,
    });
  }, []);

  return null;
};
