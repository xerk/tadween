import {
  AgentToolInterface,
  ToolReturn,
} from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import {
  IntegrationManager,
  socialIntegrationList,
} from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { RefreshToken } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { timer } from '@gitroom/helpers/utils/timer';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';

@Injectable()
export class IntegrationTriggerTool implements AgentToolInterface {
  constructor(
    private _integrationManager: IntegrationManager,
    private _integrationService: IntegrationService,
    private _refreshIntegrationService: RefreshIntegrationService
  ) {}
  name = 'triggerTool';

  // The ChatGPT directory endpoint has no "call any provider function" tool:
  // every provider function flagged with `directory` is its own read-only tool,
  // with a fixed name, typed input and typed output
  directory() {
    const tools = this._integrationManager.getAllDirectoryTools();
    return Object.entries(tools).reduce(
      (all, [identifier, providerTools]) => ({
        ...all,
        ...providerTools.reduce((list, p) => {
          const directory = p.directory;
          const provider = socialIntegrationList.find(
            (s) => s.identifier === identifier
          )!;
          return {
            ...list,
            [directory.name]: createTool({
              id: directory.name,
              description: `${p.description}. Only for ${provider.name.replace(
                /\s+/g,
                ' '
              )} channels (platform "${identifier}" in integrationList). Read only: it searches the network and changes nothing.`,
              mcp: {
                annotations: {
                  title: directory.title,
                  readOnlyHint: true,
                  destructiveHint: false,
                  idempotentHint: true,
                  openWorldHint: true,
                },
              },
              inputSchema: z.object({
                integrationId: z
                  .string()
                  .describe(
                    `The id of the ${provider.name.replace(
                      /\s+/g,
                      ' '
                    )} channel, from integrationList`
                  ),
                ...p.dataSchema.reduce(
                  (keys, key) => ({
                    ...keys,
                    [key.key]: (key.enum
                      ? z.enum(key.enum as [string, ...string[]])
                      : z.string()
                    )
                      .optional()
                      .describe(key.description),
                  }),
                  {} as Record<string, z.ZodTypeAny>
                ),
              }),
              outputSchema: z.object({
                output: z.array(
                  z.object(
                    Object.entries(directory.output).reduce(
                      (fields, [field, type]) => ({
                        ...fields,
                        [field]: type === 'number' ? z.number() : z.string(),
                      }),
                      {} as Record<string, z.ZodTypeAny>
                    )
                  )
                ),
              }),
              execute: async (inputData, context) => {
                checkAuth(inputData, context);
                const organizationId = JSON.parse(
                  (context?.requestContext as any)?.get(
                    'organization'
                  ) as string
                ).id;
                const { integrationId, ...data } = inputData as Record<
                  string,
                  string
                >;

                const output = await this.call(
                  organizationId,
                  integrationId,
                  p.methodName,
                  data,
                  identifier
                );

                // only the declared fields of every item, typed as declared
                // (an item without an id can't be used in a setting)
                return {
                  output: (Array.isArray(output) ? output : [])
                    .filter(
                      (item: Record<string, unknown>) =>
                        !('id' in directory.output) || !!item?.id
                    )
                    .map((item: Record<string, unknown>) =>
                      Object.entries(directory.output).reduce(
                        (fields, [field, type]) => ({
                          ...fields,
                          [field]:
                            type === 'number'
                              ? Number(item[field]) || 0
                              : String(item[field] ?? ''),
                        }),
                        {}
                      )
                    ),
                };
              },
            }),
          };
        }, {} as Record<string, ToolReturn>),
      }),
      {} as Record<string, ToolReturn>
    );
  }

  // Runs a provider helper function on a channel, refreshing its token once
  // when the provider asks to. `identifier` pins the provider the channel must
  // be on: those calls are read only, so a failed refresh reports the channel
  // instead of disconnecting it
  async call(
    organizationId: string,
    integrationId: string,
    methodName: string,
    data: Record<string, string>,
    identifier?: string
  ) {
    const getIntegration = await this._integrationService.getIntegrationById(
      organizationId,
      integrationId
    );

    if (!getIntegration) {
      throw new Error(
        'Integration not found, use integrationList to get a valid integration id'
      );
    }

    if (identifier && getIntegration.providerIdentifier !== identifier) {
      throw new Error(
        `This tool only works with "${identifier}" channels, and this channel is "${getIntegration.providerIdentifier}". Use integrationList to find a "${identifier}" channel`
      );
    }

    const integrationProvider = socialIntegrationList.find(
      (p) => p.identifier === getIntegration.providerIdentifier
    )!;

    if (!integrationProvider) {
      throw new Error(
        'Integration provider not found, use integrationList to get a valid integration id'
      );
    }

    const tools = this._integrationManager.getAllTools();
    if (
      // @ts-ignore
      !tools[integrationProvider.identifier].some(
        (p) => p.methodName === methodName
      ) ||
      // @ts-ignore
      !integrationProvider[methodName]
    ) {
      throw new Error(
        `Method "${methodName}" not found for this integration, use integrationSchema to get the callable tools`
      );
    }

    let refreshed = false;
    while (true) {
      try {
        // @ts-ignore
        return await integrationProvider[methodName](
          getIntegration.token,
          data,
          getIntegration.internalId,
          getIntegration
        );
      } catch (err) {
        if (err instanceof RefreshToken && !refreshed) {
          refreshed = true;
          const refreshedToken = await this._refreshIntegrationService.refresh(
            getIntegration
          );

          if (!refreshedToken) {
            if (identifier) {
              throw new Error(
                'The token of this channel expired, the user needs to reconnect it in the app'
              );
            }

            await this._integrationService.disconnectChannel(
              organizationId,
              getIntegration
            );
            throw new Error(
              'The channel was disconnected because its token expired, the user needs to reconnect it in the app'
            );
          }

          const { accessToken } = refreshedToken;

          if (accessToken) {
            getIntegration.token = accessToken;

            if (integrationProvider.refreshWait) {
              await timer(10000);
            }

            continue;
          }
        }

        if (err instanceof RefreshToken) {
          throw new Error(
            'The provider rejected the credentials even after refreshing the token, the user needs to reconnect the channel in the app'
          );
        }

        throw new Error(
          `Provider call failed: ${
            err instanceof Error && err.message
              ? err.message
              : 'unexpected error'
          }`
        );
      }
    }
  }

  run() {
    return createTool({
      id: 'triggerTool',
      description: `Use this to call a provider helper function (a methodName from the integrationSchema callable tools) that fetches provider-specific data needed for settings, like ids or search results.
      Some helper functions require values provided by the user, like a word to search for. methodName is required [input:callable-tools].
      If provider auth is expired, this tool may refresh the stored integration token; if refresh fails, it marks the channel as needing reconnect and notifies the organization.`,
      mcp: {
        annotations: {
          title: 'Trigger Integration Tool',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        integrationId: z.string().describe('The id of the integration'),
        methodName: z
          .string()
          .describe(
            'The methodName from the `integrationSchema` functions in the tools array, required'
          ),
        dataSchema: z.array(
          z.object({
            key: z.string().describe('Name of the settings key to pass'),
            value: z.string().describe('Value of the key'),
          })
        ),
      }),
      outputSchema: z.object({
        output: z.union([
          z.array(z.record(z.string(), z.any())),
          z.record(z.string(), z.any()),
          z.string(),
        ]),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        return {
          output: await this.call(
            organizationId,
            inputData.integrationId,
            inputData.methodName,
            inputData.dataSchema.reduce(
              (
                all: Record<string, string>,
                current: { key: string; value: string }
              ) => ({
                ...all,
                [current.key]: current.value,
              }),
              {} as Record<string, string>
            )
          ),
        };
      },
    });
  }
}
