'use client';

// RewardLadder: the referrer's milestones by paying friends (1, 3, 5, 10, 25,
// from GET /partners/me → ladder). On top, a slim bar to the next reward
// ("2 of 3 paying friends · Next: 1 free month"); below it the steps as a
// compact track. Nodes sit on one line (a vertical list in narrow
// containers); the line fills up to the friends who count, reached steps get
// a check, and the next step is ringed. Styles: app/tadween/referral.scss.
import React, { CSSProperties, FC, useId } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { cx, Icon } from '@gitroom/frontend/components/tadween/ui';

export interface LadderStep {
  step: number;
  reward: 'credits' | 'free_month' | 'next_plan_year' | 'founder_for_life';
  credits: number | null;
  reached: boolean;
}

const ICON: Record<LadderStep['reward'], string> = {
  credits: 'sparkles',
  free_month: 'gift',
  next_plan_year: 'trophy',
  founder_for_life: 'award',
};

export const useLadderLabels = () => {
  const t = useT();
  return (s: Pick<LadderStep, 'step' | 'reward' | 'credits'>) => {
    switch (s.reward) {
      case 'credits':
        return s.step >= 5
          ? t('tdw_ref_reward_credits_badge', '+{{n}} AI credits and the Ambassador badge', {
              n: (s.credits || 0).toLocaleString('en-US'),
            })
          : t('tdw_ref_reward_credits', '{{n}} AI credits', {
              n: (s.credits || 0).toLocaleString('en-US'),
            });
      case 'free_month':
        return t('tdw_ref_reward_free_month', '1 free month');
      case 'next_plan_year':
        return t('tdw_ref_reward_next_plan', 'The next plan up, free for 12 months');
      case 'founder_for_life':
        return t('tdw_ref_reward_founder', 'Founder price for life');
    }
  };
};

// How much of the line between step i and step i + 1 is filled (0…1)
const segmentFill = (steps: LadderStep[], i: number, qualified: number) => {
  const from = steps[i].step;
  const to = steps[i + 1]?.step ?? from;
  if (qualified >= to) {
    return 1;
  }
  if (qualified <= from) {
    return 0;
  }
  return (qualified - from) / (to - from);
};

export const RewardLadder: FC<{
  steps: LadderStep[];
  // friends who count (paid twice, or 30 days into a yearly plan)
  qualified: number;
  className?: string;
}> = ({ steps, qualified, className }) => {
  const t = useT();
  const label = useLadderLabels();
  const next = steps.find((s) => !s.reached);
  // the bar runs from 0 to the next step's friends (full at the top)
  const target = next?.step || steps[steps.length - 1]?.step || 1;
  const done = next ? qualified : target;
  const labelId = useId();

  return (
    <div className={cx('tdw-ladder', className)}>
      <div className="tdw-ladder-progress">
        <span id={labelId} className="tdw-ladder-progress-label">
          {next
            ? t('tdw_ref_progress', '{{n}} of {{target}} paying friends · Next: {{reward}}', {
                n: qualified.toLocaleString('en-US'),
                target: target.toLocaleString('en-US'),
                reward: label(next),
              })
            : t('tdw_ref_ladder_done', 'You reached the top of the ladder. Thank you!')}
        </span>
        <span
          className="pz-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={done}
          aria-label={t('tdw_ref_ladder_progress', 'Rewards ladder progress')}
          aria-describedby={labelId}
        >
          <span style={{ width: `${Math.min(100, (done / target) * 100)}%` }} />
        </span>
      </div>
      <ol className="tdw-ladder-steps">
        {steps.map((s, i) => {
          const isNext = next?.step === s.step;
          return (
            <li
              key={s.step}
              className={cx(
                'tdw-ladder-step',
                s.reached && 'is-reached',
                isNext && 'is-next',
                s.reward === 'credits' && 'is-credits'
              )}
              style={{ '--seg': segmentFill(steps, i, qualified) } as CSSProperties}
            >
              {i < steps.length - 1 ? (
                <span className="tdw-ladder-seg" aria-hidden="true">
                  <span />
                </span>
              ) : null}
              <span className="tdw-ladder-dot" aria-hidden="true">
                <Icon name={s.reached ? 'check' : ICON[s.reward]} size={14} />
              </span>
              <span className="tdw-ladder-step-text">
                <span className="tdw-ladder-friends">
                  {s.step === 1
                    ? t('tdw_ref_one_friend', '1 friend')
                    : t('tdw_ref_n_friends', '{{n}} friends', { n: s.step })}
                </span>
                <span className="tdw-ladder-reward">{label(s)}</span>
                {s.reached ? (
                  <span className="tdw-ladder-state">
                    <Icon name="check" size={12} />
                    {t('tdw_ref_reached', 'Earned')}
                  </span>
                ) : isNext ? (
                  <span className="tdw-ladder-state is-next">
                    {t('tdw_ref_step_left', '{{n}} to go', { n: s.step - qualified })}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
