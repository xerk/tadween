import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { isNewCopilotMessage } from '@gitroom/nestjs-libraries/openai/ai.config';
import { isBillingExempt } from '@gitroom/backend/services/auth/permissions/permissions.service';

const isPublicComment = (method: string, url: string) =>
  method === 'POST' && /^\/public\/posts\/[^/]+\/comments/.test(url);

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  public override async canActivate(
    context: ExecutionContext
  ): Promise<boolean> {
    const { url, method } = context.switchToHttp().getRequest<Request>();
    if (
      (method === 'POST' && url.includes('/public/v1/posts')) ||
      isPublicComment(method, url)
    ) {
      return super.canActivate(context);
    }

    return true;
  }

  protected override async getTracker(
    req: Record<string, any>
  ): Promise<string> {
    if (!req.org) {
      const forwarded = String(req.headers?.['x-forwarded-for'] || '')
        .split(',')[0]
        .trim();
      return 'ip_' + (forwarded || req.ip || 'unknown');
    }

    return (
      req.org.id + '_' + (req.url.indexOf('/posts') > -1 ? 'posts' : 'other')
    );
  }
}

// route-level guard for public endpoints, keyed by the client address the
// proxy forwards rather than the org the global guard expects
@Injectable()
export class ThrottlerRealIpGuard extends ThrottlerGuard {
  protected override async getTracker(
    req: Record<string, any>
  ): Promise<string> {
    const forwarded = String(req.headers?.['x-forwarded-for'] || '');
    return forwarded.split(',')[0].trim() || req.ip;
  }
}

// Fair use on the AI agent: only requests that send a new message count, per
// workspace. Super admins acting as themselves are not limited, like billing.
@Injectable()
export class ThrottlerAiMessageGuard extends ThrottlerGuard {
  public override async canActivate(
    context: ExecutionContext
  ): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (
      !req.org ||
      !isNewCopilotMessage(req.body) ||
      isBillingExempt(req.user, req)
    ) {
      return true;
    }

    return super.canActivate(context);
  }

  protected override async getTracker(
    req: Record<string, any>
  ): Promise<string> {
    return 'ai_message_' + req.org.id;
  }

  protected override async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      'You sent many messages to the AI agent in the last hour. Please wait a little and try again.',
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
