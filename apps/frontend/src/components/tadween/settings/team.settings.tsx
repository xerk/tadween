'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { capitalize } from 'lodash';
import copy from 'copy-to-clipboard';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { SettingsSection } from '@gitroom/frontend/components/tadween/settings/settings.nav';
import { SettingsIcon } from '@gitroom/frontend/components/tadween/settings/settings.icons';

// Tadween Team page. Same data, endpoints and rules as Postiz's
// components/settings/teams.component.tsx (GET/POST/DELETE /settings/team,
// remove only people below your level); laid out as a searchable member list,
// an invite dialog with role cards and a static "what each role can do".
type Role = 'USER' | 'ADMIN' | 'SUPERADMIN';
interface TeamMember {
  id: string;
  role: Role;
  user: {
    email: string;
    id: string;
  };
}
type Filter = 'all' | 'admins' | 'members';

const getLevel = (role?: Role) =>
  role === 'USER' ? 0 : role === 'ADMIN' ? 1 : 2;

// Postiz has no display name on team rows; it shows the first part of the email.
const memberName = (email: string) =>
  capitalize(email.split('@')[0]).split('.')[0];
const memberInitials = (email: string) =>
  email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const useTeam = () => {
  const fetch = useFetch();
  const loadTeam = useCallback(async () => {
    return (await (await fetch('/settings/team')).json())
      .users as TeamMember[];
  }, []);
  return useSWR('/api/teams', loadTeam, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
};

export const InviteMember = () => {
  const modals = useModals();
  const fetch = useFetch();
  const toast = useToaster();
  const t = useT();
  const resolver = useMemo(() => {
    return classValidatorResolver(AddTeamMemberDto);
  }, []);
  const form = useForm({
    values: {
      email: '',
      role: '',
      sendEmail: true,
    },
    resolver,
    mode: 'onChange',
  });
  const sendEmail = useWatch({
    control: form.control,
    name: 'sendEmail',
  });
  const role = useWatch({
    control: form.control,
    name: 'role',
  });
  const submit = useCallback(
    async (values: { email: string; role: string; sendEmail: boolean }) => {
      const { url } = await (
        await fetch('/settings/team', {
          method: 'POST',
          body: JSON.stringify(values),
        })
      ).json();
      if (values.sendEmail) {
        modals.closeAll();
        toast.show(t('invitation_link_sent', 'Invitation link sent'));
        return;
      }
      copy(url);
      modals.closeAll();
      toast.show(t('link_copied_to_clipboard', 'Link copied to clipboard'));
    },
    []
  );

  const roles = [
    {
      value: 'USER',
      label: t('tdw_role_member', 'Member'),
      description: t(
        'tdw_role_member_desc',
        'Writes, schedules, connects channels and sees analytics.'
      ),
    },
    {
      value: 'ADMIN',
      label: t('tdw_role_admin', 'Admin'),
      description: t(
        'tdw_role_admin_desc',
        'Also invites people, manages billing and workspace settings.'
      ),
    },
  ];

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="tdw-invite">
          <p className="tdw-set-desc">
            {t(
              'tdw_invite_lead',
              'They join this workspace with the role you pick.'
            )}
          </p>
          {sendEmail && (
            <Input
              label={t('tdw_invite_email', 'Email')}
              placeholder="name@company.com"
              name="email"
            />
          )}
          <fieldset className="tdw-invite-roles">
            <legend>{t('tdw_role', 'Role')}</legend>
            <div className="tdw-role-options">
              {roles.map((option) => (
                <label
                  key={option.value}
                  className={clsx(
                    'tdw-role-option',
                    role === option.value && 'is-on'
                  )}
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...form.register('role')}
                  />
                  <span className="tdw-role-dot" aria-hidden="true" />
                  <span className="tdw-role-text">
                    <span className="tdw-role-label">{option.label}</span>
                    <span className="tdw-role-desc">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="tdw-invite-check">
            <input type="checkbox" {...form.register('sendEmail')} />
            <span className="tdw-role-text">
              <span className="tdw-role-label">
                {t('tdw_invite_send_email', 'Email them the invitation')}
              </span>
              <span className="tdw-role-desc">
                {t(
                  'tdw_invite_send_email_desc',
                  'Turn this off to copy a link and share it yourself.'
                )}
              </span>
            </span>
          </label>
          <div className="tdw-invite-foot">
            <Button
              type="button"
              secondary={true}
              onClick={() => modals.closeAll()}
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid}
              loading={form.formState.isSubmitting}
            >
              <span className="tdw-btn-inner">
                <SettingsIcon name={sendEmail ? 'send' : 'link'} size={15} />
                {sendEmail
                  ? t('tdw_invite_send', 'Send invitation')
                  : t('tdw_invite_copy', 'Copy invite link')}
              </span>
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

const RoleGuide: FC = () => {
  const t = useT();
  const cards = [
    {
      key: 'member',
      icon: 'user' as const,
      title: t('tdw_role_member', 'Member'),
      can: [
        t('tdw_role_can_posts', 'Write, schedule and edit posts'),
        t('tdw_role_can_channels', 'Connect channels and use the media library'),
        t('tdw_role_can_analytics', 'See analytics'),
      ],
    },
    {
      key: 'admin',
      icon: 'shield' as const,
      title: t('tdw_role_admin', 'Admin'),
      can: [
        t('tdw_role_can_everything', 'Everything members can do'),
        t('tdw_role_can_team', 'Invite people and remove members'),
        t('tdw_role_can_billing', 'Manage billing and the plan'),
        t('tdw_role_can_settings', 'Change short links and the API key'),
      ],
    },
  ];
  return (
    <div className="tdw-roles">
      {cards.map((card) => (
        <div key={card.key} className="tdw-role-card">
          <div className="tdw-role-card-h">
            <SettingsIcon name={card.icon} size={16} />
            {card.title}
          </div>
          <ul>
            {card.can.map((line) => (
              <li key={line}>
                <SettingsIcon name="check" size={13} />
                {line}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export const TeamSettings = () => {
  const fetch = useFetch();
  const user = useUser();
  const modals = useModals();
  const t = useT();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const myLevel = getLevel(user?.role);
  const { data, mutate } = useTeam();

  const roleLabel = useCallback(
    (role: Role) =>
      role === 'USER'
        ? t('tdw_role_member', 'Member')
        : role === 'ADMIN'
        ? t('tdw_role_admin', 'Admin')
        : t('tdw_role_owner', 'Owner'),
    [t]
  );

  const addMember = useCallback(() => {
    modals.openModal({
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      title: t('tdw_invite_title', 'Invite to your team'),
      withCloseButton: true,
      children: <InviteMember />,
    });
  }, [t]);

  const remove = useCallback(
    (toRemove: TeamMember) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_remove_team_member',
            'Are you sure you want to remove this team member?'
          )
        ))
      ) {
        return;
      }
      await fetch(`/settings/team/${toRemove.user.id}`, {
        method: 'DELETE',
      });
      await mutate();
    },
    [t]
  );

  const members = data || [];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(
      (p) =>
        (filter === 'all' ||
          (filter === 'admins' ? p.role !== 'USER' : p.role === 'USER')) &&
        (!q ||
          p.user.email.toLowerCase().includes(q) ||
          memberName(p.user.email).toLowerCase().includes(q))
    );
  }, [members, query, filter]);

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('tdw_filter_all', 'All') },
    { value: 'admins', label: t('tdw_filter_admins', 'Admins') },
    { value: 'members', label: t('tdw_filter_members', 'Members') },
  ];

  return (
    <div className="tdw-team">
      <SettingsSection
        title={`${t('tdw_team_members', 'Members')} · ${members.length}`}
        action={
          <Button onClick={addMember} className="tdw-team-invite">
            <span className="tdw-btn-inner">
              <SettingsIcon name="user-plus" size={15} />
              {t('tdw_invite_people', 'Invite people')}
            </span>
          </Button>
        }
      >
        <div className="tdw-team-tools">
          <label className="tdw-team-search">
            <SettingsIcon name="search" size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // The settings page wraps every tab in the profile <form>;
                // Enter here must not submit it.
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              placeholder={t('tdw_team_search', 'Search by name or email')}
              aria-label={t('tdw_team_search', 'Search by name or email')}
            />
          </label>
          <div
            className="tdw-seg"
            role="radiogroup"
            aria-label={t('tdw_team_filter', 'Filter by role')}
          >
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={filter === f.value}
                className={clsx('tdw-seg-item', filter === f.value && 'is-on')}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="tdw-members">
          {list.map((p) => {
            const isMe = p.user.id === user?.id;
            const canRemove = +myLevel > +getLevel(p.role);
            return (
              <li key={p.user.id} className="tdw-member">
                <span className="tdw-member-av" aria-hidden="true">
                  {memberInitials(p.user.email)}
                </span>
                <div className="tdw-member-who">
                  <span className="tdw-member-name">
                    {memberName(p.user.email)}
                    {isMe ? (
                      <span className="tdw-you">{t('tdw_you', 'You')}</span>
                    ) : null}
                  </span>
                  <span className="tdw-member-email">{p.user.email}</span>
                </div>
                <span
                  className={clsx(
                    'tdw-member-role',
                    p.role === 'SUPERADMIN' && 'is-owner'
                  )}
                >
                  {p.role === 'SUPERADMIN' ? (
                    <SettingsIcon name="crown" size={13} />
                  ) : null}
                  {roleLabel(p.role)}
                </span>
                <div className="tdw-member-more">
                  {canRemove ? (
                    <button
                      type="button"
                      className="tdw-icon-btn is-danger"
                      onClick={remove(p)}
                      aria-label={`${t('remove', 'Remove')} ${p.user.email}`}
                      title={t('remove', 'Remove')}
                    >
                      <SettingsIcon name="trash" size={15} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
          {data && !list.length ? (
            <li className="tdw-member-empty">
              <SettingsIcon name="search" size={18} />
              <span className="tdw-member-name">
                {t('tdw_team_no_match', 'No one matches')}
              </span>
              <span className="tdw-member-email">
                {t('tdw_team_no_match_body', 'Try another name or email.')}
              </span>
            </li>
          ) : null}
        </ul>
      </SettingsSection>
      <SettingsSection title={t('tdw_roles_title', 'What each role can do')}>
        <RoleGuide />
      </SettingsSection>
    </div>
  );
};
