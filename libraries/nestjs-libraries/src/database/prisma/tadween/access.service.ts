import { Injectable, OnModuleInit } from '@nestjs/common';
import { AccessRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/access.repository';
import { PlatformSettingsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.service';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import {
  AccessSettings,
  FreePlanLimits,
  stripeConfigured,
} from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';

// How a workspace's limits are decided:
// - early: full access, like an install without billing (no plan, created
//   before the early-access cutoff, or nothing is enforced on this server)
// - free:  the free plan's limits (no plan, created after the cutoff)
// - plan:  its subscription tier's limits (paid or granted from /admin)
// - none:  no plan and no free plan: Postiz's FREE tier (the paywall)
export type AccessMode = 'early' | 'free' | 'plan' | 'none';

export interface AccessOrganization {
  createdAt: Date | string;
  waitlistedAt?: Date | string | null;
  subscription?: {
    subscriptionTier: string;
    deletedAt?: Date | string | null;
  } | null;
}

export interface OrganizationAccess {
  mode: AccessMode;
  // The pricing tier its limits come from (early: ULTIMATE, free/none: FREE)
  tier: string;
  waitlisted: boolean;
  // Set when the free plan applies
  freePlan: FreePlanLimits | null;
}

// The one place that answers "are payments on" and "which limits apply to
// this workspace". Replaces the STRIPE_PUBLISHABLE_KEY checks that used to be
// spread over the app.
@Injectable()
export class AccessService implements OnModuleInit {
  constructor(
    private _settings: PlatformSettingsService,
    private _repository: AccessRepository,
    private _emailService: EmailService
  ) {}

  async onModuleInit() {
    try {
      await this._settings.ensureAccessCutoff();
    } catch (err) {
      // Settings table missing (fresh install before `prisma db push`): every
      // workspace keeps full access until a later boot stamps the cutoff
      console.error('access_cutoff_not_set', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  getSettings() {
    return this._settings.getAccess();
  }

  // Checkout, trials, the paywall and every upgrade button
  async paymentsEnabled() {
    return stripeConfigured() && (await this._settings.getAccess()).payments;
  }

  async forOrganization(org: AccessOrganization): Promise<OrganizationAccess> {
    const access = await this._settings.getAccess();
    const waitlisted = !!org.waitlistedAt;
    const tier =
      org.subscription && !org.subscription.deletedAt
        ? org.subscription.subscriptionTier
        : null;
    // Without a cutoff (setting unreadable or not stamped yet) every
    // workspace keeps full access: what the server did before
    const early =
      !access.cutoff ||
      new Date(org.createdAt).getTime() < new Date(access.cutoff).getTime();
    const result = (mode: AccessMode, tierName: string): OrganizationAccess => ({
      mode,
      tier: tierName,
      waitlisted,
      freePlan:
        mode === 'free'
          ? {
              channels: access.freePlan.channels,
              members: access.freePlan.members,
              aiCredits: access.freePlan.aiCredits,
            }
          : null,
    });

    if (!stripeConfigured() && !access.freePlan.enabled) {
      return result('early', 'ULTIMATE');
    }
    if (tier) {
      // An early workspace's granted plan only limits it once Stripe is set
      // up (as before: without Stripe keys nothing was enforced)
      return early && !stripeConfigured()
        ? result('early', 'ULTIMATE')
        : result('plan', tier);
    }
    if (early) {
      return result('early', 'ULTIMATE');
    }
    return access.freePlan.enabled
      ? result('free', 'FREE')
      : result('none', 'FREE');
  }

  async forOrganizationId(id: string): Promise<OrganizationAccess | null> {
    const org = await this._repository.getOrganization(id);
    return org ? this.forOrganization(org) : null;
  }

  // Whether the workspace may publish: anything but a waitlisted workspace or
  // one without any plan once Stripe is set up (Postiz's rule)
  async canPublish(organizationId: string) {
    const access = await this.forOrganizationId(organizationId);
    if (!access) {
      return false;
    }
    return !access.waitlisted && access.mode !== 'none';
  }

  // A trial only exists while payments are on, and only for a workspace with
  // a plan (or Postiz's FREE): the free plan and early access never count as
  // a trial, whatever Organization.isTrailing holds
  async trialApplies(access: OrganizationAccess) {
    return (
      (access.mode === 'plan' || access.mode === 'none') &&
      (await this.paymentsEnabled())
    );
  }

  // Channels the workspace may have active (null = no limit)
  async channelLimit(
    org: AccessOrganization & {
      subscription?: { subscriptionTier: string; totalChannels?: number } | null;
    }
  ): Promise<number | null> {
    const access = await this.forOrganization(org);
    if (access.mode === 'early') {
      return null;
    }
    if (access.freePlan) {
      return access.freePlan.channels;
    }
    return access.mode === 'plan' ? org.subscription?.totalChannels || 0 : 0;
  }

  // ── Waitlist ───────────────────────────────────────────────────────────────

  // A new workspace waits when the free plan is full: free plan on, payments
  // off, and `cap` free workspaces created after the cutoff already have
  // access. Invited teammates and valid referral codes skip it (the caller
  // decides). Two sign-ups at the same moment can both get the last spot.
  async shouldWaitlist() {
    try {
      const access = await this._settings.getAccess();
      if (
        !access.freePlan.enabled ||
        access.cap === null ||
        !access.cutoff ||
        (await this.paymentsEnabled())
      ) {
        return false;
      }
      return (
        (await this._repository.countAdmitted(new Date(access.cutoff))) >=
        access.cap
      );
    } catch (err) {
      // never blocks a sign-up
      console.error('waitlist_check_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  // 1 = next in line, null = not waitlisted
  async waitlistPosition(org: { waitlistedAt?: Date | string | null }) {
    if (!org.waitlistedAt) {
      return null;
    }
    return this._repository.waitlistPosition(new Date(org.waitlistedAt));
  }

  async waitlistPositionOf(organizationId: string) {
    const org = await this._repository.getOrganization(organizationId);
    return org ? this.waitlistPosition(org) : null;
  }

  async counts() {
    const access = await this._settings.getAccess();
    const cutoff = access.cutoff ? new Date(access.cutoff) : null;
    const [used, skipped, waitlisted] = await Promise.all([
      cutoff ? this._repository.countAdmitted(cutoff) : Promise.resolve(0),
      cutoff ? this._repository.countSkipped(cutoff) : Promise.resolve(0),
      this._repository.countWaitlisted(),
    ]);
    // `skipped`: free workspaces that came in with a referral code or a team
    // invite, outside the cap
    return { used, cap: access.cap, skipped, waitlisted };
  }

  async listWaitlist(page: number, pageSize: number) {
    const [total, organizations] = await this._repository.listWaitlisted(
      page * pageSize,
      pageSize
    );
    return {
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      items: organizations.map(({ users, ...org }, i) => ({
        ...org,
        position: page * pageSize + i + 1,
        owner: users[0]?.user || null,
      })),
    };
  }

  async saveSettings(next: Omit<AccessSettings, 'cutoff'> & { cutoff?: string | null }, userId: string) {
    const current = await this._settings.getAccess();
    await this._settings.setAccess(
      {
        ...next,
        // keep the stamped cutoff unless the admin sent a new one
        cutoff: next.cutoff === undefined ? current.cutoff : next.cutoff,
      },
      userId
    );
    // A higher cap (or none) lets the oldest waiting workspaces in
    await this.fillOpenSpots();
    return this.adminState();
  }

  async adminState() {
    return {
      settings: await this._settings.getAccess(),
      stripeConfigured: stripeConfigured(),
      paymentsEnabled: await this.paymentsEnabled(),
      counts: await this.counts(),
    };
  }

  // Lets in as many of the oldest waiting workspaces as the cap has room
  // for; everyone once sign-ups no longer wait (free plan off, payments on,
  // no cap or no cutoff)
  private async fillOpenSpots() {
    const access = await this._settings.getAccess();
    const waiting = await this._repository.countWaitlisted();
    if (!waiting) {
      return;
    }
    const room =
      !access.freePlan.enabled ||
      access.cap === null ||
      !access.cutoff ||
      (await this.paymentsEnabled())
        ? waiting
        : access.cap -
          (await this._repository.countAdmitted(new Date(access.cutoff)));
    if (room <= 0) {
      return;
    }
    for (const org of await this._repository.oldestWaitlisted(room)) {
      await this.admit(org.id);
    }
  }

  // Lets one workspace in and tells its owners (once: an already admitted
  // workspace gets no second email). The email never fails the admission.
  async admit(organizationId: string) {
    const admitted = (await this._repository.admit(organizationId)) > 0;
    if (!admitted) {
      return { admitted: false };
    }
    try {
      for (const { user } of await this._repository.owners(organizationId)) {
        await this._emailService.sendTemplate(
          { email: user.email, language: user.language },
          'waitlistAdmitted',
          { name: user.name || '' },
          { dedupeKey: `waitlist_admitted_${organizationId}_${user.id}` }
        );
      }
    } catch (err) {
      console.error('waitlist_admitted_email_not_sent', {
        organization_id: organizationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return { admitted: true };
  }
}
