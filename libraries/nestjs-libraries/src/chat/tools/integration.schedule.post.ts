import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { AllProvidersSettings } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/all.providers.settings';
import { Integration } from '@prisma/client';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import {
  directoryChannelSchemas,
  directoryUnsupportedMessage,
  isDirectoryProvider,
} from '@gitroom/nestjs-libraries/chat/validation.schemas.helper';
import { brandNameFromEnv } from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';
import {
  ValidUrlExtension,
  ValidUrlPath,
} from '@gitroom/helpers/utils/valid.url.path';

type SchedulePost = {
  integrationId: string;
  date: string;
  shortLink: boolean;
  type: 'draft' | 'schedule' | 'now';
  postsAndComments: Array<{ content: string; attachments: string[] }>;
  settings: Record<string, any>;
};

// the ChatGPT directory input: the platform picks the settings variant
type DirectoryPosts = {
  socialPost: Array<SchedulePost & { platform: string }>;
};

const validUrlExtension = new ValidUrlExtension();
const validUrlPath = new ValidUrlPath();

// Same URL validation as MediaDto (valid.url.path) - each attachment must
// point to an allowed upload domain and a supported file extension.
const attachmentUrl = z
  .string()
  .refine((url) => validUrlPath.validate(url, {} as any), {
    message: validUrlPath.defaultMessage({} as any),
  })
  .refine((url) => validUrlExtension.validate(url, {} as any), {
    message: validUrlExtension.defaultMessage({} as any),
  });

@Injectable()
export class IntegrationSchedulePostTool implements AgentToolInterface {
  constructor(
    private _postsService: PostsService,
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager
  ) {}
  name = 'integrationSchedulePostTool';

  // The ChatGPT directory version: the settings of every supported platform are
  // in the input schema (one variant per platform), instead of key / value
  // pairs described by integrationSchema
  directory() {
    const variants = directoryChannelSchemas(
      this._integrationManager.getAllRulesDescription(),
      this._integrationManager.getAllDirectoryTools()
    );

    return {
      [this.name]: createTool({
        id: this.name,
        mcp: {
          annotations: {
            title: 'Schedule Social Media Post',
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: false,
            openWorldHint: true,
          },
        },
        description: `
Create a draft, a scheduled post or a post published right away on the user's connected ${brandNameFromEnv()} channels.
Get the channel ids and platforms with integrationList first. Every item of socialPost is one post on one channel: pick the variant of its platform, it lists that platform's rules, its character limit and its settings.
postsAndComments: the first item is the post, every other item is a comment (or the next post of the thread, on X and Threads).
Always show the user the full post (text, media, channel, date and time) and get their confirmation before calling this tool. A "now" or "schedule" post is published by ${brandNameFromEnv()} to the social network, a "draft" is never published.
Do not use this to update or delete existing posts.
On success, each item in output contains a previewUrl the user can open to see the post.
If the input is rejected as invalid, check that every item uses the variant whose platform list has the channel's platform, with only the settings that variant lists.
If validation fails, the result contains output.errors describing what to fix; the call can be retried with corrected parameters.
`,
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['socialPost'],
          properties: {
            socialPost: {
              type: 'array',
              minItems: 1,
              description: 'One item per channel and post',
              items: {
                anyOf: variants.map((variant) => ({
                  type: 'object',
                  additionalProperties: false,
                  description: variant.description,
                  required: [
                    'platform',
                    'integrationId',
                    'date',
                    'type',
                    'shortLink',
                    'postsAndComments',
                    'settings',
                  ],
                  properties: {
                    platform: {
                      type: 'string',
                      enum: variant.platforms,
                      description:
                        'The platform of the channel, from integrationList',
                    },
                    integrationId: {
                      type: 'string',
                      description:
                        'The id of the channel, from integrationList',
                    },
                    date: {
                      type: 'string',
                      description:
                        'The date of the post in UTC, for example 2026-07-20T09:00:00. For "now", the current date',
                    },
                    type: {
                      type: 'string',
                      enum: ['draft', 'schedule', 'now'],
                      description:
                        'draft = saved, never published. schedule = published at the date. now = published right away',
                    },
                    shortLink: {
                      type: 'boolean',
                      description:
                        'If the post has a link, whether to shorten it (ask the user)',
                    },
                    postsAndComments: {
                      type: 'array',
                      minItems: 1,
                      description:
                        'The first item is the post, every other item is a comment',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['content', 'attachments'],
                        properties: {
                          content: {
                            type: 'string',
                            description:
                              'The content of the post, HTML, Each line must be wrapped in <p> here is the possible tags: h1, h2, h3, u, strong, li, ul, p (you can\'t have u and strong together), and img (<img src="...">) only when the platform rules say pictures go inside the content',
                          },
                          attachments: {
                            type: 'array',
                            items: { type: 'string' },
                            description:
                              'URLs of the images or videos, from the media library (mediaListTool, uploadFromUrlTool or generateImageTool)',
                          },
                        },
                      },
                    },
                    settings: {
                      ...variant.settings,
                      description: `The settings of the platform`,
                    },
                  },
                })),
              },
            },
          },
        },
        outputSchema: z.object({
          output: z
            .array(
              z.object({
                postId: z.string(),
                integration: z.string(),
                previewUrl: z
                  .string()
                  .describe(
                    'Public preview page of the created post, share it with the user'
                  ),
              })
            )
            .or(z.object({ errors: z.string() })),
        }),
        execute: async (inputData: DirectoryPosts, context) => {
          checkAuth(inputData, context);
          const organizationId = JSON.parse(
            (context?.requestContext as any)?.get('organization') as string
          ).id;

          for (const post of inputData.socialPost) {
            const integration =
              await this._integrationService.getIntegrationById(
                organizationId,
                post.integrationId
              );

            if (!integration) {
              return {
                output: {
                  errors: `Channel ${post.integrationId} was not found, use integrationList to get a valid id`,
                },
              };
            }

            if (!isDirectoryProvider(integration.providerIdentifier)) {
              return {
                output: { errors: directoryUnsupportedMessage() },
              };
            }

            if (integration.providerIdentifier !== post.platform) {
              return {
                output: {
                  errors: `Channel ${post.integrationId} is a "${integration.providerIdentifier}" channel, pass platform "${integration.providerIdentifier}" with its settings`,
                },
              };
            }

            // the same check as the key / value tool's attachment schema
            for (const attachment of post.postsAndComments.flatMap(
              (p) => p.attachments
            )) {
              const check = attachmentUrl.safeParse(attachment);
              if (!check.success) {
                return {
                  output: {
                    errors: `${attachment}: ${check.error.issues[0].message}`,
                  },
                };
              }
            }
          }

          return this.schedule(organizationId, inputData.socialPost);
        },
      }),
    };
  }

  run() {
    return createTool({
      id: 'schedulePostTool',
      mcp: {
        annotations: {
          title: 'Schedule Social Media Post',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      description: `
Use this when the user wants to create a draft, scheduled, or immediate social media post on their connected channels, based on the integrationSchema tool.
Examples of the input shape:

A single LinkedIn post with one comment
- socialPost array length will be one
- postsAndComments array length will be two (one for the post, one for the comment)

20 Facebook posts each on individual days without comments
- socialPost array length will be 20
- postsAndComments array length will be one

Do not use this to update or delete existing posts.
On success, each item in output contains a previewUrl the user can open to see the post.
If validation fails, the result contains output.errors describing what to fix; the call can be retried with corrected parameters.
`,
      inputSchema: z.object({
        socialPost: z
          .array(
            z.object({
              integrationId: z
                .string()
                .describe('The id of the integration (not internal id)'),
              isPremium: z
                .boolean()
                .describe(
                  "If the integration is X, return if it's premium or not"
                ),
              date: z.string().describe('The date of the post in UTC time'),
              shortLink: z
                .boolean()
                .describe(
                  'If the post has a link inside, we can ask the user if they want to add a short link'
                ),
              type: z
                .enum(['draft', 'schedule', 'now'])
                .describe(
                  'The type of the post, if we pass now, we should pass the current date also'
                ),
              postsAndComments: z
                .array(
                  z.object({
                    content: z
                      .string()
                      .describe(
                        "The content of the post, HTML, Each line must be wrapped in <p> here is the possible tags: h1, h2, h3, u, strong, li, ul, p (you can't have u and strong together), img (<img src=\"...\">) only when the integration rules say pictures go inside the content, and span only for a mention in the exact format given by a mention tool from the integrationSchema tools"
                      ),
                    attachments: z
                      .array(attachmentUrl)
                      .describe('The image of the post (URLS)'),
                  })
                )
                .describe(
                  'first item is the post, every other item is the comments'
                ),
              settings: z
                .array(
                  z.object({
                    key: z
                      .string()
                      .describe('Name of the settings key to pass'),
                    value: z
                      .any()
                      .describe(
                        'Value of the key, always prefer the id then label if possible. When the settings schema says a field is an id, pass the id returned by the channel tools, never the display label'
                      ),
                  })
                )
                .describe(
                  'This relies on the integrationSchema tool to get the settings [input:settings]'
                ),
            })
          )
          .describe('Individual post'),
      }),
      outputSchema: z.object({
        output: z
          .array(
            z.object({
              postId: z.string(),
              integration: z.string(),
              previewUrl: z
                .string()
                .describe(
                  'Public preview page of the created post, share it with the user'
                ),
            })
          )
          .or(z.object({ errors: z.string() })),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        return this.schedule(
          organizationId,
          inputData.socialPost.map((post: any) => ({
            ...post,
            settings: post.settings.reduce(
              (acc: Record<string, any>, s: { key: string; value: any }) => ({
                ...acc,
                [s.key]: s.value,
              }),
              {} as Record<string, any>
            ),
          }))
        );
      },
    });
  }

  // Validates every post the way the dashboard / public API do, then creates
  // them. Shared by the key / value tool and the ChatGPT directory one
  private async schedule(organizationId: string, socialPost: SchedulePost[]) {
    const finalOutput = [];

    const integrations = {} as Record<string, Integration>;
    for (const platform of socialPost) {
      integrations[platform.integrationId] =
        await this._integrationService.getIntegrationById(
          organizationId,
          platform.integrationId
        );

      // Same server-side validation as the dashboard / public API
      // (settings DTO + media checkValidity + empty / too-long content).
      const [validation] = await this._postsService.validatePosts(
        organizationId,
        [
          {
            integration: { id: platform.integrationId },
            settings: platform.settings,
            value: platform.postsAndComments.map((p: any) => ({
              content: p.content,
              image: (p.attachments || []).map((path: string) => ({
                path,
              })),
            })),
          },
        ]
      );

      if (validation.emptyContent) {
        return {
          output: {
            errors: `${validation.name}: Your post should have at least one character or one image.`,
          },
        };
      }

      if (platform.type !== 'draft') {
        if (!validation.valid) {
          return {
            output: {
              errors: `${validation.name}: ${
                validation.settingsError || 'Please fix your settings'
              }, please fix it, and try integrationSchedulePostTool again.`,
            },
          };
        }

        if (validation.errors !== true) {
          return {
            output: {
              errors: `${validation.name}: ${validation.errors}, please fix it, and try integrationSchedulePostTool again.`,
            },
          };
        }

        if (validation.tooLong) {
          return {
            output: {
              errors: `${validation.name}: The maximum characters is ${validation.maximumCharacters}, please fix it, and try integrationSchedulePostTool again.`,
            },
          };
        }
      }
    }

    for (const post of socialPost) {
      const integration = integrations[post.integrationId];

      if (!integration) {
        throw new Error('Integration not found');
      }

      const output = await this._postsService.createPost(
        organizationId,
        {
          date: post.date,
          type: post.type,
          shortLink: post.shortLink,
          tags: [],
          posts: [
            {
              integration,
              group: makeId(10),
              settings: {
                ...post.settings,
                __type: integration.providerIdentifier,
              } as AllProvidersSettings,
              value: post.postsAndComments.map((p: any) => ({
                content: p.content,
                id: makeId(10),
                delay: 0,
                image: p.attachments.map((p: any) => ({
                  id: makeId(10),
                  path: p,
                })),
              })),
            },
          ],
        },
        'MCP'
      );
      // Same public preview page the calendar "Preview Post" button opens.
      finalOutput.push(
        ...output.map((p) => ({
          ...p,
          previewUrl: `${process.env.FRONTEND_URL}/p/${p.postId}?share=true`,
        }))
      );
    }

    return {
      output: finalOutput,
    };
  }
}
