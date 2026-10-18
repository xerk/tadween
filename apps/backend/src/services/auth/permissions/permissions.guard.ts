import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AppAbility,
  PermissionsService,
} from '@gitroom/backend/services/auth/permissions/permissions.service';
import {
  AbilityPolicy,
  CHECK_POLICIES_KEY,
} from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { Organization, User } from '@prisma/client';
import { isBillingExempt } from '@gitroom/backend/services/auth/permissions/permissions.service';
import { Request } from 'express';
import {
  Sections,
  SubscriptionException,
} from './permission.exception.class';

// What a waitlisted workspace can still reach: its waitlist screen (the
// account, language, devices for push), switching or joining another
// workspace, logging out and deleting the account
const WAITLIST_ALLOWED =
  /\/user\/(self|language|logout|organizations|change-org|join-org|devices|delete-account)$/;

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private _reflector: Reflector,
    private _authorizationService: PermissionsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    // A waitlisted workspace is refused everything but its waitlist screen
    // (with or without a policy on the route)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const requestOrg: Organization | undefined = request.org;
    if (
      requestOrg?.waitlistedAt &&
      // @ts-ignore
      !isBillingExempt(request.user, request) &&
      !WAITLIST_ALLOWED.test(request.path)
    ) {
      throw new HttpException(
        'This workspace is on the waitlist.',
        HttpStatus.FORBIDDEN
      );
    }

    if (
      request.path.indexOf('/auth') > -1 ||
      request.path.indexOf('/auth') > -1 ||
      request.path.indexOf('/integrations/social-connect') > -1 ||
      request.path.indexOf('/integrations/provider') > -1
    ) {
      return true;
    }

    let policyHandlers =
      this._reflector.get<AbilityPolicy[]>(
        CHECK_POLICIES_KEY,
        context.getHandler()
      ) || [];

    if (!policyHandlers || !policyHandlers.length) {
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const { org, user }: { org: Organization; user: User } = request;

    // Super admins are never held back by plan limits on their own actions;
    // the workspace role check (Sections.ADMIN) still applies. While
    // impersonating, `user` is the impersonated account (flagged isSuperAdmin
    // by the auth middleware), so its workspace's real limits apply.
    if (isBillingExempt(user, request)) {
      policyHandlers = policyHandlers.filter(
        (handler) => handler[1] === Sections.ADMIN
      );
      if (!policyHandlers.length) {
        return true;
      }
    }

    const refreshChannelId = typeof request.query?.refresh === 'string' ? request.query.refresh : undefined;

    // @ts-ignore
    const ability = await this._authorizationService.check(org.id, org.createdAt, org.users[0].role, policyHandlers, refreshChannelId);

    const item = policyHandlers.find(
      (handler) => !this.execPolicyHandler(handler, ability)
    );

    if (item) {
      throw new SubscriptionException({
        // the free plan has no AI: say so instead of "upgrade"
        section:
          item[1] === Sections.AI &&
          (await this._authorizationService.isFreePlan(org.id))
            ? Sections.FREE_PLAN_AI
            : item[1],
        action: item[0],
      });
    }

    return true;
  }

  private execPolicyHandler(handler: AbilityPolicy, ability: AppAbility) {
    return ability.can(handler[0], handler[1]);
  }
}
