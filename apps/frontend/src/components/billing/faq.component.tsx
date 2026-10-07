'use client';

import { FC, ReactNode, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import DeleteAccountComponent from '@gitroom/frontend/components/settings/delete-account.component';
import { Accordion } from '@gitroom/frontend/components/tadween/billing/accordion';
const useFaqList = () => {
  const { isGeneral } = useVariables();
  const user = useUser();
  const t = useT();
  return [
    // Tadween: the questions from the design system's PricingTable, in place
    // of Postiz's (which name Postiz and its open-source repository)
    ...(user?.allowTrial
      ? [
          {
            title: t('tdw_faq_trial', 'Is there a free trial?'),
            description: t(
              'tdw_faq_trial_desc',
              'Every plan starts with a 7-day free trial. To confirm your card we hold $2 and release it right away. Cancel any time from Billing without talking to anyone.'
            ),
          },
        ]
      : []),
    {
      title: t('tdw_faq_pages', 'Does it work with LinkedIn company pages?'),
      description: t(
        'tdw_faq_pages_desc',
        'Yes. Connect your profile and every page you admin, then schedule to one or many at once.'
      ),
    },
    {
      title: t('tdw_faq_channels', 'What are channels?'),
      description: t(
        'tdw_faq_channels_desc',
        'A channel is an account you publish to, like your LinkedIn profile or a company page you admin. X, Facebook, Instagram and the other networks count as channels too.'
      ),
    },
    {
      title: t('tdw_faq_team', 'What are team members?'),
      description: t(
        'tdw_faq_team_desc',
        'People you invite to your workspace to draft, review and schedule posts with you, and to add their own channels.'
      ),
    },
    {
      title: t('tdw_faq_change', 'Can I change or cancel my plan?'),
      description: t(
        'tdw_faq_change_desc',
        'Any time from Billing. A new plan starts right away and you pay the prorated difference. If you cancel, your plan stays active until the end of the billing period.'
      ),
    },
    ...(user?.tier?.current === 'FREE'
      ? [
          {
            title: t('tdw_faq_delete', 'How can I delete my account?'),
            description: t(
              'tdw_faq_delete_desc',
              'You can delete your account with all its workspaces, channels and posts. This cannot be undone.'
            ),
            content: <DeleteAccountComponent isLink={true} />,
          },
        ]
      : []),
  ];
};
export const FAQSection: FC<{
  title: string;
  description: string;
  content?: ReactNode;
}> = (props) => {
  const { title, description, content } = props;
  const [show, setShow] = useState(false);
  const changeShow = useCallback(() => {
    setShow(!show);
  }, [show]);
  return (
    <div
      className="bg-sixth p-[24px] border border-tableBorder rounded-[8px] flex flex-col"
      onClick={changeShow}
    >
      <div className={`text-[20px] cursor-pointer flex justify-center`}>
        <div className="flex-1">{title}</div>
        <div className="flex items-center justify-center w-[32px]">
          {!show ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M18 12.75H6C5.59 12.75 5.25 12.41 5.25 12C5.25 11.59 5.59 11.25 6 11.25H18C18.41 11.25 18.75 11.59 18.75 12C18.75 12.41 18.41 12.75 18 12.75Z"
                fill="white"
              />
              <path
                d="M12 18.75C11.59 18.75 11.25 18.41 11.25 18V6C11.25 5.59 11.59 5.25 12 5.25C12.41 5.25 12.75 5.59 12.75 6V18C12.75 18.41 12.41 18.75 12 18.75Z"
                fill="white"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
            >
              <path
                d="M24 17H8C7.45333 17 7 16.5467 7 16C7 15.4533 7.45333 15 8 15H24C24.5467 15 25 15.4533 25 16C25 16.5467 24.5467 17 24 17Z"
                fill="#ECECEC"
              />
            </svg>
          )}
        </div>
      </div>
      <div
        className={clsx(
          'transition-all duration-500 overflow-hidden',
          !show ? 'max-h-[0]' : 'max-h-[500px]'
        )}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={`mt-[16px] w-full text-wrap font-[400] text-[16px] text-customColor17 select-text max-w-[450px]`}
          dangerouslySetInnerHTML={{
            __html: description,
          }}
        />
        {content && (
          <div
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="mt-[16px]"
          >
            {content}
          </div>
        )}
      </div>
    </div>
  );
};
export const FAQComponent: FC = () => {
  const list = useFaqList();
  // Tadween: the design system's Accordion
  return (
    <Accordion
      defaultOpen={[0]}
      items={list.map((item) => ({
        title: item.title,
        content: (
          <>
            <div
              className="select-text"
              dangerouslySetInnerHTML={{
                __html: item.description,
              }}
            />
            {item.content ? (
              <div className="pz-faq-extra">{item.content}</div>
            ) : null}
          </>
        ),
      }))}
    />
  );
};
