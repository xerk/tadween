import { Injectable } from '@nestjs/common';
import { EmailInterface } from '@gitroom/nestjs-libraries/emails/email.interface';
import { ResendProvider } from '@gitroom/nestjs-libraries/emails/resend.provider';
import { EmptyProvider } from '@gitroom/nestjs-libraries/emails/empty.provider';
import { NodeMailerProvider } from '@gitroom/nestjs-libraries/emails/node.mailer.provider';
import { TemporalService } from 'nestjs-temporal-core';
import { timer } from '@gitroom/helpers/utils/timer';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { randomUUID } from 'crypto';
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';
import {
  EmailBrand,
  EmailLanguage,
  EmailTemplate,
  EmailTemplateData,
  emailLanguage,
  esc,
  isRenderedEmail,
  renderEmail,
} from '@gitroom/nestjs-libraries/emails/templates/email.templates';

// Who an email goes to. Without `language` (undefined), the account with this
// address is looked up; null means the account has none saved.
export type EmailRecipient = string | { email: string; language?: string | null };

export interface TemplateEmailOptions {
  // auth emails go out right away; everything else through the email queue
  sync?: boolean;
  priority?: 'top' | 'bottom';
  replyTo?: string;
  // the same key twice sends once (webhook replays, reads that settle twice)
  dedupeKey?: string;
}

const COMPANY_ADDRESS =
  'Xerk LLC, 30 N Gould St Ste R, Sheridan, WY 82801, United States';
// The digest workflow's subject for several notifications (its "[Postiz]"
// prefix is removed before this is checked)
const DIGEST_SUBJECT = /^Your latest notifications$/;
const URL_IN_TEXT = /\s*(?:at\s+)?(https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)])\s*$/;

@Injectable()
export class EmailService {
  emailService: EmailInterface;
  constructor(
    private _temporalService: TemporalService,
    private _platformSettings: PlatformSettingsService,
    private _usersRepository: UsersRepository
  ) {
    this.emailService = this.selectProvider(process.env.EMAIL_PROVIDER!);
    console.log('Email service provider:', this.emailService.name);
    for (const key of this.emailService.validateEnvKeys) {
      if (!process.env[key]) {
        console.error(`Missing environment variable: ${key}`);
      }
    }
  }

  hasProvider() {
    return !(this.emailService instanceof EmptyProvider);
  }

  selectProvider(provider: string) {
    switch (provider) {
      case 'resend':
        return new ResendProvider();
      case 'nodemailer':
        return new NodeMailerProvider();
      default:
        return new EmptyProvider();
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    addTo: 'top' | 'bottom',
    replyTo?: string,
    dedupeKey?: string
  ) {
    if (!to || !subject) {
      return;
    }

    try {
      return await this._temporalService.client
        .getRawClient()
        ?.workflow.start('sendSingleEmailWorkflow', {
          taskQueue: 'main',
          workflowId: dedupeKey
            ? `send_email_${dedupeKey}`
            : `send_email_${randomUUID()}`,
          // a failed send can be tried again with the same key
          ...(dedupeKey
            ? { workflowIdReusePolicy: 'ALLOW_DUPLICATE_FAILED_ONLY' }
            : {}),
          args: [{ to, subject, html, replyTo, addTo }],
        });
    } catch (err) {
      // already sent for this key
      if (dedupeKey && err instanceof WorkflowExecutionAlreadyStartedError) {
        return;
      }
      throw err;
    }
  }

  // Tadween: the recipient's language, then the instance default
  // (Admin → Branding), then English
  async languageFor(language?: string | null): Promise<EmailLanguage> {
    const branding = await this._platformSettings
      .getSavedBranding()
      .catch(() => ({} as { defaultLanguage?: string }));
    return emailLanguage(language, branding.defaultLanguage);
  }

  // Where internal messages go and what the footer offers for questions:
  // TADWEEN_SUPPORT_EMAIL, else the support email from Admin → Branding
  async supportEmail() {
    const branding = await this._platformSettings
      .getSavedBranding()
      .catch(() => ({} as { supportEmail?: string }));
    return (
      process.env.TADWEEN_SUPPORT_EMAIL ||
      branding.supportEmail ||
      process.env.EMAIL_REPLY_TO ||
      ''
    );
  }

  private async brand(): Promise<EmailBrand> {
    const branding = await this._platformSettings
      .getSavedBranding()
      .catch(() => ({} as { instanceName?: string }));
    const appUrl = process.env.FRONTEND_URL || '';
    return {
      name: branding.instanceName || process.env.EMAIL_FROM_NAME || 'Tadween',
      appUrl,
      logoUrl: process.env.EMAIL_LOGO_URL || `${appUrl}/favicon.png`,
      supportEmail: await this.supportEmail(),
      company: process.env.EMAIL_COMPANY_ADDRESS || COMPANY_ADDRESS,
    };
  }

  private async recipientLanguage(to: EmailRecipient) {
    if (typeof to !== 'string' && to.language !== undefined) {
      return this.languageFor(to.language);
    }
    const email = typeof to === 'string' ? to : to.email;
    return this.languageFor(
      await this._usersRepository.getLanguageByEmail(email).catch(() => null)
    );
  }

  async render<T extends EmailTemplate>(
    template: T,
    lang: EmailLanguage,
    data: EmailTemplateData<T>
  ) {
    return renderEmail(template, lang, await this.brand(), data);
  }

  // One branded email in the recipient's language
  async sendTemplate<T extends EmailTemplate>(
    to: EmailRecipient,
    template: T,
    data: EmailTemplateData<T>,
    options: TemplateEmailOptions = {}
  ) {
    const email = typeof to === 'string' ? to : to.email;
    if (!email || email.indexOf('@') === -1) {
      return;
    }
    const { subject, html } = await this.render(
      template,
      await this.recipientLanguage(to),
      data
    );
    if (options.sync) {
      return this.sendEmailSync(email, subject, html, options.replyTo);
    }
    return this.sendEmail(
      email,
      subject,
      html,
      options.priority || 'top',
      options.replyTo,
      options.dedupeKey
    );
  }

  // Fragments from code that predates the templates (the digest and streak
  // workflows, agencies): the same layout, in the recipient's language
  private async wrapFragment(to: string, subject: string, html: string) {
    const lang = await this.recipientLanguage(to);
    if (DIGEST_SUBJECT.test(subject)) {
      return this.render('digest', lang, {
        items: html
          .split(/<br\s*\/?>/i)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const link = line.match(URL_IN_TEXT);
            return {
              html: esc(link ? line.slice(0, link.index) : line),
              link: link?.[1],
            };
          }),
      });
    }
    return this.render('notification', lang, { title: subject, html });
  }

  async sendEmailSync(
    to: string,
    subject: string,
    html: string,
    replyTo?: string
  ) {
    if (to.indexOf('@') === -1) {
      return;
    }

    if (!process.env.EMAIL_FROM_ADDRESS || !process.env.EMAIL_FROM_NAME) {
      console.log(
        'Email sender information not found in environment variables'
      );
      return;
    }

    // Tadween: sender name from /admin → Branding once saved; replies go to
    // EMAIL_REPLY_TO, else the support email from Branding (never no-reply)
    const branding = await this._platformSettings
      .getSavedBranding()
      .catch(() => ({} as { instanceName?: string; supportEmail?: string }));
    const fromName = branding.instanceName || process.env.EMAIL_FROM_NAME;
    replyTo =
      replyTo || process.env.EMAIL_REPLY_TO || branding.supportEmail || undefined;
    // The digest workflow (unchangeable once deployed) hard-codes "[Postiz]";
    // the layout carries the brand, so the prefix is dropped
    subject = subject.replace(/^\[Postiz\]\s*/, '');

    // Templates arrive rendered; older fragments get the same layout
    let modifiedHtml = html;
    if (!isRenderedEmail(html)) {
      const wrapped = await this.wrapFragment(to, subject, html);
      subject = wrapped.subject;
      modifiedHtml = wrapped.html;
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const sends = await this.emailService.sendEmail(
          to,
          subject,
          modifiedHtml,
          fromName,
          process.env.EMAIL_FROM_ADDRESS,
          replyTo
        );
        console.log(sends);
        return;
      } catch (err) {
        lastErr = err;
        console.log(`Email attempt ${attempt + 1}/3 failed:`, err);
        if (attempt < 2) {
          await timer(700);
        }
      }
    }
    console.log(`Email to ${to} failed after 3 attempts:`, lastErr);
  }
}
