import {
  Logger,
  Controller,
  Get,
  Post,
  Req,
  Res,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from '@copilotkit/runtime';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { isBillingExempt } from '@gitroom/backend/services/auth/permissions/permissions.service';
import {
  AiCreditAction,
  agentMessagesPerHour,
  aiModels,
  isNewCopilotMessage,
} from '@gitroom/nestjs-libraries/openai/ai.config';
import { ThrottlerAiMessageGuard } from '@gitroom/nestjs-libraries/throttler/throttler.provider';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { MastraAgent } from '@ag-ui/mastra';
import { MastraService } from '@gitroom/nestjs-libraries/chat/mastra.service';
import { Request, Response } from 'express';
import { RequestContext } from '@mastra/core/di';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

export type ChannelsContext = {
  integrations: string;
  organization: string;
  ui: string;
  billingExempt: string;
};

// the copilot runtime writes its own CORS headers on the response, keep them aligned with main.ts
const copilotCors = () => ({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:6274',
    ...(process.env.MAIN_URL ? [process.env.MAIN_URL] : []),
  ],
  credentials: !process.env.NOT_SECURED,
});

// Tadween: without an OpenAI key, answer instead of leaving the request open
// (CopilotKit asks for runtime info on every page load). The info call gets
// the shape the real runtime returns with one placeholder agent, because
// CopilotKit throws during render when the agent a component uses is missing
// (an empty `agents` takes down every page). Runs and everything else get a
// 503. The frontend hides the assistant in this case (`ai.available` in
// GET /instance/settings), so this only keeps CopilotKit quiet.
const aiNotConfigured = (req: Request, res: Response, agentId: string) => {
  if ((req.body as { method?: string } | undefined)?.method === 'info') {
    return res.status(200).json({
      version: '0.0.0',
      agents: {
        [agentId]: {
          name: agentId,
          description: 'AI is not configured on this server.',
          className: 'NotConfigured',
        },
      },
      audioFileTranscriptionEnabled: false,
      suggestions: false,
      a2uiEnabled: false,
      openGenerativeUIEnabled: false,
    });
  }
  return res
    .status(503)
    .json({ error: 'AI is not configured on this server.' });
};

@Controller('/copilot')
export class CopilotController {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _mastraService: MastraService
  ) {}
  // A new message is paid with AI credits: refused (402) before the model
  // runs when the workspace can't pay, charged once the answer was streamed
  private async meterMessage(
    req: Request,
    res: Response,
    organization: Organization,
    user: User,
    action: AiCreditAction
  ) {
    if (!isNewCopilotMessage(req.body)) {
      return;
    }

    await this._subscriptionService.assertAiCredits(
      organization.id,
      action,
      isBillingExempt(user, req)
    );

    // 'close' also fires when the browser stops the answer half way
    res.once('close', () => {
      if (res.statusCode >= 400) {
        return;
      }
      this._subscriptionService
        .chargeAiCredits(organization.id, action)
        .catch((err) => Logger.error(`Could not charge AI credits: ${err}`));
    });
  }

  @Post('/chat')
  async chatAgent(
    @Req() req: Request,
    @Res() res: Response,
    @GetOrgFromRequest() organization: Organization,
    @GetUserFromRequest() user: User
  ) {
    if (
      process.env.OPENAI_API_KEY === undefined ||
      process.env.OPENAI_API_KEY === ''
    ) {
      Logger.warn('OpenAI API key not set, chat functionality will not work');
      return aiNotConfigured(req, res, 'default');
    }

    await this.meterMessage(req, res, organization, user, 'write');

    const copilotRuntimeHandler = copilotRuntimeNodeHttpEndpoint({
      endpoint: '/copilot/chat',
      cors: copilotCors(),
      runtime: new CopilotRuntime(),
      serviceAdapter: new OpenAIAdapter({
        model: aiModels.writing(),
      }),
    });

    return copilotRuntimeHandler(req, res);
  }

  @Post('/agent')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  @UseGuards(ThrottlerAiMessageGuard)
  @Throttle({ default: { limit: agentMessagesPerHour(), ttl: 3600000 } })
  async agent(
    @Req() req: Request,
    @Res() res: Response,
    @GetOrgFromRequest() organization: Organization,
    @GetUserFromRequest() user: User
  ) {
    if (
      process.env.OPENAI_API_KEY === undefined ||
      process.env.OPENAI_API_KEY === ''
    ) {
      Logger.warn('OpenAI API key not set, chat functionality will not work');
      return aiNotConfigured(req, res, 'postiz');
    }

    await this.meterMessage(req, res, organization, user, 'agent_message');
    const mastra = await this._mastraService.mastra();
    const requestContext = new RequestContext<ChannelsContext>();
    requestContext.set(
      'integrations',
      req?.body?.body?.forwardedProps?.integrations || []
    );

    requestContext.set('organization', JSON.stringify(organization));
    requestContext.set('ui', 'true');
    // tools (image generation) never refuse a super admin, like the dashboard
    requestContext.set('billingExempt', String(isBillingExempt(user, req)));

    const agents = MastraAgent.getLocalAgents({
      resourceId: organization.id,
      mastra,
      requestContext: requestContext as any,
    });

    const runtime = new CopilotRuntime({
      agents,
    });

    const copilotRuntimeHandler = copilotRuntimeNodeHttpEndpoint({
      endpoint: '/copilot/agent',
      cors: copilotCors(),
      runtime,
      serviceAdapter: new OpenAIAdapter({
        model: aiModels.writing(),
      }),
    });

    return copilotRuntimeHandler(req, res);
  }

  @Get('/credits')
  calculateCredits(
    @GetOrgFromRequest() organization: Organization,
    @Query('type') type: 'ai_images' | 'ai_videos'
  ) {
    return this._subscriptionService.checkCredits(
      organization,
      type || 'ai_images'
    );
  }

  @Get('/:thread/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getMessagesList(
    @GetOrgFromRequest() organization: Organization,
    @Param('thread') threadId: string
  ): Promise<any> {
    const mastra = await this._mastraService.mastra();
    const memory = await mastra.getAgent('postiz').getMemory();
    try {
      return await memory.recall({
        resourceId: organization.id,
        threadId,
      });
    } catch (err) {
      Logger.warn(`Could not recall messages for thread ${threadId}: ${err}`);
      return { messages: [] };
    }
  }

  @Get('/list')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async getList(@GetOrgFromRequest() organization: Organization) {
    const mastra = await this._mastraService.mastra();
    const memory = await mastra.getAgent('postiz').getMemory();
    const list = await memory.listThreads({
      filter: { resourceId: organization.id },
      perPage: 100000,
      page: 0,
      orderBy: { field: 'createdAt', direction: 'DESC' },
    });

    return {
      threads: list.threads.map((p) => ({
        id: p.id,
        title: p.title,
      })),
    };
  }
}
