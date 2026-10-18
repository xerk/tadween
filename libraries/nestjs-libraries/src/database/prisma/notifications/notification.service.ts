import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '@gitroom/nestjs-libraries/database/prisma/notifications/notifications.repository';
import {
  EmailRecipient,
  EmailService,
  TemplateEmailOptions,
} from '@gitroom/nestjs-libraries/services/email.service';
import {
  EmailTemplate,
  EmailTemplateData,
} from '@gitroom/nestjs-libraries/emails/templates/email.templates';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { organizationId } from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import {
  PushMessage,
  PushService,
} from '@gitroom/nestjs-libraries/services/push.service';
import {
  EmailLanguage,
  emailStrings,
} from '@gitroom/nestjs-libraries/emails/templates/email.strings';

export type NotificationType = 'success' | 'fail' | 'info';

export type NotificationKind =
  | 'published'
  | 'failed'
  | 'unconfirmed'
  | 'refresh_needed'
  | 'channel_disabled'
  | 'other';

// The sentences the post workflows and IntegrationService.informAboutRefreshError
// store in Notifications.content. Workflow code can't change, so the list reads
// them back instead of adding a column: group 1 is the provider identifier, the
// next groups are `fields` in order.
const NOTIFICATION_MESSAGES: {
  kind: NotificationKind;
  match: RegExp;
  fields: ('channelName' | 'reason' | 'link')[];
}[] = [
  {
    kind: 'published',
    match: /^Your post has been published on (\S+) at (https?:\/\/\S+)\s*$/,
    fields: ['link'],
  },
  {
    kind: 'failed',
    match:
      /^An error occurred while posting (?:comments )?on ([^\s:]+)(?:: ([\s\S]*))?$/,
    fields: ['reason'],
  },
  {
    kind: 'unconfirmed',
    match:
      /^Your post was sent to (\S+), but we couldn't confirm it was published\. Please check your ([\s\S]+) account before posting again/,
    fields: ['channelName'],
  },
  {
    kind: 'refresh_needed',
    match:
      /^We couldn't post to (\S+) for ([\s\S]+) because you need to reconnect it\./,
    fields: ['channelName'],
  },
  {
    kind: 'channel_disabled',
    match: /^We couldn't post to (\S+) for ([\s\S]+) because it's disabled\./,
    fields: ['channelName'],
  },
  {
    kind: 'refresh_needed',
    match: /^Could not refresh your (\S+) channel/,
    fields: [],
  },
];

const URL_IN_TEXT = /https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)]/;
// a failed publish is reported within minutes of its slot (retries included)
const FAILED_BEFORE_MS = 3 * 60 * 60 * 1000;
const FAILED_AFTER_MS = 5 * 60 * 1000;
// several posts with the same URL: the notification is written right after the
// platform answers, so only a post published within the hour is taken
const PUBLISHED_WITHIN_MS = 60 * 60 * 1000;

@Injectable()
export class NotificationService {
  constructor(
    private _notificationRepository: NotificationsRepository,
    private _emailService: EmailService,
    private _organizationRepository: OrganizationRepository,
    private _temporalService: TemporalService,
    private _integrationManager: IntegrationManager,
    private _pushService: PushService
  ) {}

  getMainPageCount(organizationId: string, userId: string) {
    return this._notificationRepository.getMainPageCount(
      organizationId,
      userId
    );
  }

  getNotificationsPaginated(organizationId: string, page: number) {
    return this._notificationRepository.getNotificationsPaginated(
      organizationId,
      page
    );
  }

  // The in-app list. Every notification keeps its original `content` and gets
  // what it is about (kind, network, link) plus the post and channel it names,
  // found with three batched queries for the whole page.
  async getNotifications(organizationId: string, userId: string) {
    const { lastReadNotifications, notifications } =
      await this._notificationRepository.getNotifications(
        organizationId,
        userId
      );

    const parsed = notifications.map((notification) => ({
      notification,
      ...this.parseNotification(notification.content),
    }));

    const urls = parsed
      .filter((p) => p.kind === 'published' && p.link)
      .map((p) => p.link!);
    const failed = parsed.filter(
      (p) => (p.kind === 'failed' || p.kind === 'unconfirmed') && p.provider
    );
    const providers = [
      ...new Set(parsed.map((p) => p.provider).filter(Boolean) as string[]),
    ];

    const [publishedPosts, failedPosts, channels] = await Promise.all([
      urls.length
        ? this._notificationRepository.getPostsByReleaseUrls(organizationId, [
            ...new Set(urls),
          ])
        : [],
      failed.length
        ? this._notificationRepository.getFailedPostsBetween(
            organizationId,
            [...new Set(failed.map((p) => p.provider!))],
            failed.map((p) => ({
              from: new Date(
                p.notification.createdAt.getTime() - FAILED_BEFORE_MS
              ),
              to: new Date(p.notification.createdAt.getTime() + FAILED_AFTER_MS),
            }))
          )
        : [],
      providers.length
        ? this._notificationRepository.getChannelsByProviders(
            organizationId,
            providers
          )
        : [],
    ]);

    return {
      lastReadNotifications,
      notifications: parsed.map(
        ({ notification, kind, provider, channelName, reason, link }) => {
          const time = notification.createdAt.getTime();
          const providerChannels = channels.filter(
            (c) => c.providerIdentifier === provider
          );
          const post =
            kind === 'published'
              ? this.closestPost(
                  publishedPosts.filter(
                    (p) =>
                      p.releaseURL === link &&
                      (!provider ||
                        p.integration.providerIdentifier === provider)
                  ),
                  time,
                  PUBLISHED_WITHIN_MS
                )
              : kind === 'failed' || kind === 'unconfirmed'
              ? this.failedPost(
                  failedPosts.filter(
                    (p) =>
                      p.integration.providerIdentifier === provider &&
                      (!channelName || p.integration.name === channelName) &&
                      p.publishDate.getTime() >= time - FAILED_BEFORE_MS &&
                      p.publishDate.getTime() <= time + FAILED_AFTER_MS
                  ),
                  time,
                  reason,
                  !!channelName || providerChannels.length <= 1
                )
              : undefined;

          const channel =
            post?.integration ||
            this.namedChannel(providerChannels, kind, channelName);

          return {
            ...notification,
            kind,
            ...(provider
              ? {
                  providerIdentifier: provider,
                  network: this._integrationManager
                    .getSocialIntegration(provider)
                    .name.replace(/\s*\n\s*/g, ' '),
                }
              : {}),
            ...(link ? { link } : {}),
            ...(reason ? { reason } : {}),
            ...(post
              ? {
                  post: {
                    id: post.id,
                    group: post.group,
                    preview: this.postPreview(post.content),
                    publishDate: post.publishDate,
                    state: post.state,
                    image: this.firstImage(post.image),
                  },
                }
              : {}),
            ...(channel
              ? {
                  channel: {
                    id: channel.id,
                    name: channel.name,
                    picture: channel.picture,
                    providerIdentifier: channel.providerIdentifier,
                  },
                }
              : {}),
          };
        }
      ),
    };
  }

  private parseNotification(content: string): {
    kind: NotificationKind;
    provider?: string;
    channelName?: string;
    reason?: string;
    link?: string;
  } {
    for (const message of NOTIFICATION_MESSAGES) {
      const found = content.match(message.match);
      if (!found) {
        continue;
      }

      const provider = found[1].toLowerCase();
      return message.fields.reduce(
        (all, field, index) =>
          found[index + 2]
            ? { ...all, [field]: found[index + 2].trim() }
            : all,
        {
          kind: message.kind,
          ...(this._integrationManager.getSocialIntegration(provider)
            ? { provider }
            : {}),
        }
      );
    }

    return { kind: 'other', link: content.match(URL_IN_TEXT)?.[0] };
  }

  // The only candidate, or (when several posts share a URL, like a platform
  // that returns one generic link) the one published closest to that time.
  private closestPost<T extends { publishDate: Date }>(
    posts: T[],
    time: number,
    within = Infinity
  ) {
    if (posts.length === 1) {
      return posts[0];
    }

    const distance = (post: T) => Math.abs(post.publishDate.getTime() - time);
    const [closest] = [...posts].sort((a, b) => distance(a) - distance(b));
    return closest && distance(closest) <= within ? closest : undefined;
  }

  // The post whose stored error carries the platform's message, or the only
  // failed post around that time when the channel is known (named in the
  // sentence, or the org's only channel of that network). Nothing when it's
  // ambiguous: a wrong post is worse than none.
  private failedPost<T extends { publishDate: Date; error: string | null }>(
    posts: T[],
    time: number,
    reason: string | undefined,
    channelIsKnown: boolean
  ) {
    const withReason = reason
      ? posts.filter((p) => p.error?.includes(reason))
      : [];
    if (withReason.length) {
      return this.closestPost(withReason, time);
    }

    return channelIsKnown && posts.length === 1 ? posts[0] : undefined;
  }

  private namedChannel<T extends { name: string; refreshNeeded: boolean }>(
    channels: T[],
    kind: NotificationKind,
    channelName?: string
  ) {
    if (channelName) {
      return channels.find((c) => c.name === channelName);
    }

    if (channels.length === 1) {
      return channels[0];
    }

    const needsRefresh = channels.filter((c) => c.refreshNeeded);
    return kind === 'refresh_needed' && needsRefresh.length === 1
      ? needsRefresh[0]
      : undefined;
  }

  private postPreview(content: string) {
    // keep a space where one paragraph ends and the next starts
    const text = stripHtmlValidation(
      'none',
      (content || '').replace(/<\/p>\s*<p/gi, '</p> <p'),
      false,
      true
    )
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 220 ? text.slice(0, 219).trimEnd() + '…' : text;
  }

  private firstImage(image: string | null) {
    try {
      const [first] = JSON.parse(image || '[]');
      return (first?.path as string) || undefined;
    } catch (e) {
      return undefined;
    }
  }

  async inAppNotification(
    orgId: string,
    subject: string,
    message: string,
    sendEmail = false,
    digest = false,
    type: NotificationType = 'success'
  ) {
    await this._notificationRepository.createNotification(orgId, message);
    await this.emailNotification(
      orgId,
      subject,
      message,
      sendEmail,
      digest,
      type
    );
    // Tadween: last, so a slow push never holds up the record or the email
    await this.sendPush(orgId, subject, message, type);
  }

  private async emailNotification(
    orgId: string,
    subject: string,
    message: string,
    sendEmail: boolean,
    digest: boolean,
    type: NotificationType
  ) {
    if (!sendEmail) {
      return;
    }

    if (digest) {
      try {
        await this._temporalService.client
          .getRawClient()
          ?.workflow.signalWithStart('digestEmailWorkflow', {
            workflowId: 'digest_email_workflow_' + orgId,
            signal: 'email',
            signalArgs: [
              [
                {
                  title: subject,
                  message,
                  type,
                },
              ],
            ],
            taskQueue: 'main',
            workflowIdConflictPolicy: 'USE_EXISTING',
            args: [{ organizationId: orgId }],
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: organizationId,
                value: orgId,
              },
            ]),
          });
      } catch (err) {}

      return;
    }

    await this.sendEmailsToOrg(orgId, subject, message, type);
  }

  // Tadween: the same notification on the members' phones, each in their
  // language. Runs inside the post workflows' activity, so it never throws.
  // The same preferences as the emails decide who gets one.
  private async sendPush(
    orgId: string,
    subject: string,
    message: string,
    type: NotificationType
  ) {
    try {
      if (!this._pushService.enabled()) {
        return;
      }
      const devices = (
        await this._notificationRepository.getOrganizationDevices(orgId)
      ).filter(
        ({ user }) =>
          type === 'info' ||
          (type === 'success' && user.sendSuccessEmails) ||
          (type === 'fail' && user.sendFailureEmails)
      );
      const languages = new Map<string | null, EmailLanguage>();
      const byLanguage = new Map<EmailLanguage, string[]>();
      for (const device of devices) {
        if (!languages.has(device.user.language)) {
          languages.set(
            device.user.language,
            await this._emailService.languageFor(device.user.language)
          );
        }
        const language = languages.get(device.user.language)!;
        byLanguage.set(language, [
          ...(byLanguage.get(language) || []),
          device.token,
        ]);
      }

      const gone: string[] = [];
      for (const [language, tokens] of byLanguage) {
        gone.push(
          ...(await this._pushService.send(tokens, {
            ...this.pushContent(subject, message, language),
            data: { organizationId: orgId, route: '/notifications' },
          }))
        );
      }
      if (gone.length) {
        await this._notificationRepository.deleteDevices(gone);
      }
    } catch (err) {
      console.error('Push notification failed', err);
    }
  }

  // The push says what the email says, in one line under a title
  private pushContent(
    subject: string,
    message: string,
    language: EmailLanguage
  ): Pick<PushMessage, 'title' | 'body'> {
    const t = emailStrings[language];
    const email = this.notificationEmail(subject, message);
    if (email.template === 'postFailed') {
      const { network, channel, variant } = email.data;
      if (variant === 'unconfirmed') {
        return {
          title: t.postFailed.unconfirmedTitle(network),
          body: t.postFailed.unconfirmed(channel || network),
        };
      }
      return {
        title: t.postFailed.title(network),
        body:
          variant === 'disabled'
            ? t.postFailed.disabled
            : t.postFailed.body(network, channel),
      };
    }
    if (email.template === 'channelReconnect') {
      const { network, channel } = email.data;
      return {
        title: t.channelReconnect.title(network),
        body: t.channelReconnect.body(network, channel),
      };
    }

    const { kind, provider } = this.parseNotification(message);
    if (kind === 'published' && provider) {
      return {
        title: t.push.published(
          this._integrationManager
            .getSocialIntegration(provider)
            .name.replace(/\s*\n\s*/g, ' ')
        ),
        body: t.push.publishedBody,
      };
    }
    return {
      title: this.postPreview(subject) || t.push.other,
      body: this.postPreview(message),
    };
  }

  async sendEmailsToOrg(
    orgId: string,
    subject: string,
    message: string,
    type?: NotificationType
  ) {
    const userOrg = await this._organizationRepository.getAllUsersOrgs(orgId);
    const email = this.notificationEmail(subject, message);
    for (const user of userOrg?.users || []) {
      // 'info' type is always sent regardless of preferences
      if (type !== 'info') {
        // Filter users based on their email preferences
        if (type === 'success' && !user.user.sendSuccessEmails) {
          continue;
        }
        if (type === 'fail' && !user.user.sendFailureEmails) {
          continue;
        }
      }
      await this._emailService.sendTemplate(
        { email: user.user.email, language: user.user.language },
        email.template,
        email.data
      );
    }
  }

  // Tadween: the email for a notification sentence, from what it is about
  // (the same reading the in-app list does). The channel's name is in the
  // workflows' subject ("… for <channel>"); unknown sentences keep their text.
  private notificationEmail(
    subject: string,
    message: string
  ):
    | { template: 'postFailed'; data: EmailTemplateData<'postFailed'> }
    | { template: 'channelReconnect'; data: EmailTemplateData<'channelReconnect'> }
    | { template: 'notification'; data: EmailTemplateData<'notification'> } {
    const { kind, provider, channelName, reason } =
      this.parseNotification(message);
    const network = provider
      ? this._integrationManager
          .getSocialIntegration(provider)
          .name.replace(/\s*\n\s*/g, ' ')
      : '';
    const channel = channelName || subject.match(/ for (.+)$/)?.[1] || '';

    if (network && (kind === 'failed' || kind === 'unconfirmed' || kind === 'channel_disabled')) {
      return {
        template: 'postFailed',
        data: {
          network,
          channel,
          reason,
          variant:
            kind === 'channel_disabled'
              ? 'disabled'
              : kind === 'unconfirmed'
              ? 'unconfirmed'
              : 'failed',
        },
      };
    }
    if (network && kind === 'refresh_needed') {
      return { template: 'channelReconnect', data: { network, channel } };
    }
    return { template: 'notification', data: { title: subject, html: message } };
  }

  async sendEmail(to: string, subject: string, html: string, replyTo?: string) {
    await this._emailService.sendEmail(to, subject, html, 'top', replyTo);
  }

  // Tadween: a branded email in the recipient's language
  sendTemplate<T extends EmailTemplate>(
    to: EmailRecipient,
    template: T,
    data: EmailTemplateData<T>,
    options?: TemplateEmailOptions
  ) {
    return this._emailService.sendTemplate(to, template, data, options);
  }

  // Tadween: internal messages for the team, to TADWEEN_SUPPORT_EMAIL (else
  // the support email from Admin → Branding), in the instance's language
  async sendSupportTemplate<T extends EmailTemplate>(
    template: T,
    data: EmailTemplateData<T>,
    replyTo?: string
  ) {
    const support = await this._emailService.supportEmail();
    if (!support) {
      console.error('support_email_not_set', { template });
      return;
    }
    await this._emailService.sendTemplate(
      { email: support, language: null },
      template,
      data,
      { replyTo }
    );
  }

  // Tadween: billing and lifecycle emails go to the workspace's owners and
  // admins. Reached from payment webhooks: logs, never throws.
  async sendTemplateToManagers<T extends EmailTemplate>(
    orgId: string,
    template: T,
    data: EmailTemplateData<T>,
    dedupeKey?: string
  ) {
    try {
      const org = await this._organizationRepository.getAllUsersOrgs(orgId);
      const managers = (org?.users || []).filter(
        (u) =>
          (u.role === 'SUPERADMIN' || u.role === 'ADMIN') &&
          !u.disabled &&
          !u.user.deletedAt
      );
      for (const manager of managers) {
        await this._emailService.sendTemplate(
          { email: manager.user.email, language: manager.user.language },
          template,
          data,
          {
            dedupeKey: dedupeKey ? `${dedupeKey}_${manager.user.id}` : undefined,
          }
        );
      }
    } catch (err) {
      console.error('lifecycle_email_not_sent', {
        organization_id: orgId,
        template,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  hasEmailProvider() {
    return this._emailService.hasProvider();
  }
}
