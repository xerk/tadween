'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Integration } from '@prisma/client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  Button as TdwButton,
  Input as TdwInput,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const CustomerModal: FC<{
  integration: Integration & {
    customer?: {
      id: string;
      name: string;
    };
  };
  onClose: () => void;
}> = (props) => {
  const t = useT();

  const fetch = useFetch();
  const { onClose, integration } = props;
  const [customer, setCustomer] = useState(
    integration.customer?.name || undefined
  );
  const modal = useModals();
  const loadCustomers = useCallback(async () => {
    return (await fetch('/integrations/customers')).json();
  }, []);
  const removeFromCustomer = useCallback(async () => {
    saveCustomer(true);
  }, []);
  const saveCustomer = useCallback(
    async (removeCustomer?: boolean) => {
      if (!customer) {
        return;
      }
      await fetch(`/integrations/${integration.id}/customer-name`, {
        method: 'PUT',
        body: JSON.stringify({
          name: removeCustomer ? '' : customer,
        }),
      });
      modal.closeAll();
      onClose();
    },
    [customer]
  );
  const { data } = useSWR('/customers', loadCustomers);
  // Tadween: the kit's field and actions; the names come from a datalist
  return (
    <TadweenScope>
      <form
        className="tdw-modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          saveCustomer();
        }}
      >
        <p className="tdw-modal-lead">
          {t(
            'tdw_customer_lead',
            'Group channels by customer to filter the calendar and the composer by them. Pick a customer or type a new name.'
          )}
        </p>
        <TdwInput
          id="customer-name"
          list="customer-name-options"
          icon="users"
          autoFocus
          label={t('select_customer_label', 'Select Customer')}
          value={customer ?? ''}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder={t('start_typing', 'Start typing...')}
          autoComplete="off"
        />
        <datalist id="customer-name-options">
          {(data?.map((p: any) => p.name) || []).map((name: string) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="tdw-modal-foot">
          {!!integration?.customer?.name && (
            <TdwButton
              variant="ghost"
              className="is-start tdw-danger-text"
              onClick={removeFromCustomer}
            >
              {t('remove_from_customer', 'Remove from customer')}
            </TdwButton>
          )}
          <TdwButton type="submit" variant="primary" disabled={!customer}>
            {t('save', 'Save')}
          </TdwButton>
        </div>
      </form>
    </TadweenScope>
  );
};
