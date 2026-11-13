import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import {
  directoryChannelSchemas,
  directoryUnsupportedMessage,
  isDirectoryProvider,
} from '@gitroom/nestjs-libraries/chat/validation.schemas.helper';
import { brandNameFromEnv } from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';

@Injectable()
export class PostSettingsTool implements AgentToolInterface {
  constructor(
    private _postsService: PostsService,
    private _integrationManager: IntegrationManager
  ) {}
  name = 'postSettingsTool';

  // The ChatGPT directory version: the settings of every supported platform are
  // in the input schema (one variant per platform), instead of key / value
  // pairs described by integrationSchema
  directory() {
    const variants = directoryChannelSchemas(
      this._integrationManager.getAllRulesDescription(),
      this._integrationManager.getAllDirectoryTools(),
      true
    );

    return {
      [this.name]: createTool({
        id: this.name,
        mcp: {
          annotations: {
            title: 'Update Post Settings',
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: false,
          },
        },
        description: `
Update the platform settings of an existing ${brandNameFromEnv()} post (scheduled or draft) that was NOT published yet.
Only the settings change - the content and the publish date stay exactly as they are.
Find the post first with postsListTool and pass its "id" here, and its "platform" with the settings in the variant of that platform.
The settings are merged into the existing ones, so only pass the keys you want to change; anything you don't pass stays as it is.
Show the user which post and which settings will change and get their confirmation first.
If the input is rejected as invalid, check that "update" uses the variant whose platform list has the post's platform, with only the settings that variant lists.
If validation fails, the result contains output.errors describing what to fix; the call can be retried with corrected parameters.
`,
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'update'],
          properties: {
            id: {
              type: 'string',
              description: 'The "id" of the post, from postsListTool',
            },
            update: {
              description:
                'The platform of the post and the settings to change: pick the variant of its platform',
              anyOf: variants.map((variant) => ({
                type: 'object',
                additionalProperties: false,
                description: variant.description,
                required: ['platform', 'settings'],
                properties: {
                  platform: {
                    type: 'string',
                    enum: variant.platforms,
                    description: 'The platform of the post, from postsListTool',
                  },
                  settings: {
                    ...variant.settings,
                    description:
                      'Only the settings keys to change, merged into the existing settings',
                  },
                },
              })),
            },
          },
        },
        outputSchema: z.object({
          output: z
            .object({
              postId: z.string(),
              publishDate: z.string(),
            })
            .or(z.object({ errors: z.string() })),
        }),
        execute: async (
          inputData: {
            id: string;
            update: { platform: string; settings: Record<string, any> };
          },
          context
        ) => {
          checkAuth(inputData, context);
          const organizationId = JSON.parse(
            (context?.requestContext as any)?.get('organization') as string
          ).id;

          const post = await this._postsService.getPostById(
            inputData.id,
            organizationId
          );
          const identifier = post?.integration?.providerIdentifier;

          if (identifier && !isDirectoryProvider(identifier)) {
            return { output: { errors: directoryUnsupportedMessage() } };
          }

          if (identifier && identifier !== inputData.update.platform) {
            return {
              output: {
                errors: `Post ${inputData.id} is on a "${identifier}" channel, pass platform "${identifier}" with its settings`,
              },
            };
          }

          return this.update(
            organizationId,
            inputData.id,
            inputData.update.settings
          );
        },
      }),
    };
  }

  run() {
    return createTool({
      id: 'postSettingsTool',
      mcp: {
        annotations: {
          title: 'Update Post Settings',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      description: `
Update the provider settings of an existing post (scheduled or draft) that was NOT published yet.
Only the settings change - the content and the publish date stay exactly as they are.
Find the post first (list your posts) and pass its "id" here.
The settings are merged into the existing ones, so only pass the keys you want to change; anything you don't pass stays as it is.
This relies on the integrationSchema tool [input:settings] to know which keys exist for the platform.
If validation fails, the result contains output.errors describing what to fix; the call can be retried with corrected parameters.
`,
      inputSchema: z.object({
        id: z.string().describe('The "id" of the post to update its settings'),
        settings: z
          .array(
            z.object({
              key: z.string().describe('Name of the settings key to change'),
              value: z
                .any()
                .describe(
                  'New value of the key, always prefer the id then label if possible. When the settings schema says a field is an id, pass the id returned by the channel tools, never the display label'
                ),
            })
          )
          .describe(
            'Settings keys to change, merged into the existing settings. This relies on the integrationSchema tool [input:settings]'
          ),
      }),
      outputSchema: z.object({
        output: z
          .object({
            postId: z.string(),
            publishDate: z.string(),
          })
          .or(z.object({ errors: z.string() })),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const settings = (inputData.settings || []).reduce(
          (acc: Record<string, any>, s: { key: string; value: any }) => ({
            ...acc,
            [s.key]: s.value,
          }),
          {} as Record<string, any>
        );

        return this.update(organizationId, inputData.id, settings);
      },
    });
  }

  private async update(
    organizationId: string,
    id: string,
    settings: Record<string, any>
  ) {
    try {
      const output = await this._postsService.updatePostSettings(
        organizationId,
        id,
        settings,
        'MCP'
      );

      return { output };
    } catch (err: any) {
      return {
        output: {
          errors: err?.message || 'Failed to update the post settings',
        },
      };
    }
  }
}
