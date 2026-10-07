'use client';

// Promise-based Tadween dialogs for the billing flow. Postiz opens its
// confirmations and the cancel flow with `deleteDialog(...)` and
// `new Promise(res => modal.openModal(...))`; these openers keep the same
// "await the answer" shape so the Postiz logic around them stays as it is.
import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  Button,
  Dialog,
  RadioGroup,
  RadioOption,
  Textarea,
} from '@gitroom/frontend/components/tadween/ui';

type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'destructive';
  // An alert has a single button and always resolves true
  alert?: boolean;
};

type State =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'reason'; resolve: (v: string | null) => void }
  | {
      kind: 'offer';
      resolve: (v: 'applied' | 'cancel' | 'dismiss') => void;
    }
  | null;

const MIN_REASON = 20;

export const useBillingDialogs = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [state, setState] = useState<State>(null);
  // Keep the last state while the dialog plays its exit
  const last = useRef<State>(null);
  if (state) last.current = state;
  const shown = state || last.current;
  const [reason, setReason] = useState('');
  const [applying, setApplying] = useState(false);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) =>
        setState({ kind: 'confirm', opts, resolve })
      ),
    []
  );

  // "Why are you leaving?" — resolves the reason, or null when dismissed
  const askReason = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        setReason('');
        setState({ kind: 'reason', resolve });
      }),
    []
  );

  // 50% for 3 months — Postiz's retention offer; applies the discount itself
  const offerDiscount = useCallback(
    () =>
      new Promise<'applied' | 'cancel' | 'dismiss'>((resolve) =>
        setState({ kind: 'offer', resolve })
      ),
    []
  );

  const close = () => {
    if (!state) return;
    if (state.kind === 'confirm') state.resolve(false);
    if (state.kind === 'reason') state.resolve(null);
    if (state.kind === 'offer') state.resolve('dismiss');
    setState(null);
  };

  const applyDiscount = async () => {
    if (state?.kind !== 'offer') return;
    setApplying(true);
    await fetch('/billing/apply-discount', {
      method: 'POST',
    });
    setApplying(false);
    toaster.show(
      t('tdw_billing_discount_applied', '50% off applied for your next 3 months'),
      'success'
    );
    state.resolve('applied');
    setState(null);
  };

  const node = (
    <>
      <Dialog
        open={state?.kind === 'confirm'}
        onClose={close}
        size="sm"
        title={shown?.kind === 'confirm' ? shown.opts.title : ''}
        description={shown?.kind === 'confirm' ? shown.opts.description : ''}
        footer={
          shown?.kind === 'confirm' ? (
            <>
              {shown.opts.alert ? null : (
                <Button variant="ghost" onClick={close}>
                  {shown.opts.cancelLabel || t('tdw_cancel', 'Cancel')}
                </Button>
              )}
              <Button
                variant={shown.opts.tone || 'primary'}
                onClick={() => {
                  if (state?.kind === 'confirm') state.resolve(true);
                  setState(null);
                }}
              >
                {shown.opts.confirmLabel}
              </Button>
            </>
          ) : null
        }
      />
      <Dialog
        open={state?.kind === 'reason'}
        onClose={close}
        title={t('tdw_billing_why_leaving', 'Why are you leaving?')}
        description={t(
          'tdw_billing_why_leaving_desc',
          'Tell us in a sentence what we could have done better. At least 20 characters.'
        )}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('tdw_billing_keep_plan', 'Keep my plan')}
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < MIN_REASON}
              onClick={() => {
                if (state?.kind === 'reason') state.resolve(reason);
                setState(null);
              }}
            >
              {t('tdw_continue', 'Continue')}
            </Button>
          </>
        }
      >
        <Textarea
          rows={3}
          autoFocus
          label={t('tdw_billing_feedback', 'Feedback')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t(
            'tdw_billing_feedback_placeholder',
            'What could we have done better?'
          )}
          hint={`${Math.min(reason.trim().length, MIN_REASON)}/${MIN_REASON} ${t(
            'tdw_characters',
            'characters'
          )}`}
        />
      </Dialog>
      <Dialog
        open={state?.kind === 'offer'}
        onClose={close}
        title={t('tdw_billing_stay_half', 'Stay for half price?')}
        description={t(
          'tdw_billing_stay_half_desc',
          'Keep your plan for 50% off your next 3 months. Your scheduled posts keep publishing.'
        )}
        footer={
          <>
            <Button
              variant="ghost"
              className="is-danger"
              disabled={applying}
              onClick={() => {
                if (state?.kind === 'offer') state.resolve('cancel');
                setState(null);
              }}
            >
              {t('tdw_billing_cancel_anyway', 'Cancel anyway')}
            </Button>
            <Button
              variant="primary"
              loading={applying}
              loadingLabel={t('tdw_applying', 'Applying…')}
              onClick={applyDiscount}
            >
              {t('tdw_billing_apply_half', 'Apply 50% off')}
            </Button>
          </>
        }
      />
    </>
  );

  return { node, confirm, askReason, offerDiscount };
};

/* Change plan — pick a tier and period; "Pay today" is Postiz's prorate */
export const ChangePlanDialog = <T extends string>({
  open,
  onClose,
  options,
  value,
  onChange,
  period,
  payToday,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  options: RadioOption<T>[];
  value: T;
  onChange: (v: T) => void;
  period: ReactNode;
  payToday: ReactNode;
  onConfirm: () => void;
  loading?: boolean;
}) => {
  const t = useT();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t('tdw_change_plan', 'Change plan')}
      description={t(
        'tdw_change_plan_desc',
        'The new plan starts right away. You pay the difference for the rest of this period.'
      )}
      footer={
        <>
          <span className="pz-pay-today">{payToday}</span>
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            {t('tdw_cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            loading={loading}
            loadingLabel={t('tdw_changing', 'Changing…')}
            onClick={onConfirm}
          >
            {t('tdw_confirm_change', 'Confirm change')}
          </Button>
        </>
      }
    >
      <div className="grid gap-[16px]">
        {period}
        <RadioGroup<T>
          label={t('tdw_plan', 'Plan')}
          columns={2}
          value={value}
          onChange={onChange}
          options={options}
        />
      </div>
    </Dialog>
  );
};
