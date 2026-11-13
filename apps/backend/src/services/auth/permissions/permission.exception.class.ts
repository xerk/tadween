import { HttpException, HttpStatus } from '@nestjs/common';

export enum Sections {
  CHANNEL = 'channel',
  POSTS_PER_MONTH = 'posts_per_month',
  VIDEOS_PER_MONTH = 'videos_per_month',
  CLIPPING_MINUTES = 'clipping_minutes',
  TEAM_MEMBERS = 'team_members',
  COMMUNITY_FEATURES = 'community_features',
  FEATURED_BY_GITROOM = 'featured_by_gitroom',
  AI = 'ai',
  AI_CREDITS = 'ai_credits',
  // Tadween: in-app AI is not part of the free plan
  FREE_PLAN_AI = 'free_plan_ai',
  IMPORT_FROM_CHANNELS = 'import_from_channels',
  ADMIN = 'admin',
  WEBHOOKS = 'webhooks',
}

export enum AuthorizationActions {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export class SubscriptionException extends HttpException {
  constructor(message: { section: Sections; action: AuthorizationActions }) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}

// Tadween: an action refused because the free plan has no AI (MCP tools turn
// it into words for the model)
export const FREE_PLAN_AI_MESSAGE = "AI isn't included in the free plan";
export const isFreePlanAiRefusal = (err: unknown) =>
  err instanceof HttpException &&
  err.getStatus() === HttpStatus.PAYMENT_REQUIRED &&
  (err.getResponse() as { section?: string })?.section ===
    Sections.FREE_PLAN_AI;
