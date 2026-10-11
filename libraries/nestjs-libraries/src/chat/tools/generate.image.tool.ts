import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { HttpException, Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class GenerateImageTool implements AgentToolInterface {
  private storage = UploadFactory.createStorage();

  constructor(private _mediaService: MediaService) {}
  name = 'generateImageTool';

  run() {
    return createTool({
      id: 'generateImageTool',
      description: `Generate image to use in a post,
                    in case the user specified a platform that requires attachment and attachment was not provided,
                    ask if they want to generate a picture of a video.
      `,
      mcp: {
        annotations: {
          title: 'Generate Image',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        prompt: z.string(),
      }),
      // Mastra validates the return against this schema, so it must also
      // allow the graceful { error } shape (same as uploadFromUrlTool)
      outputSchema: z.object({
        id: z.string().optional(),
        path: z.string().optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const org = JSON.parse((context?.requestContext as any)?.get('organization') as string);
        try {
          // Paid with AI credits inside generateImage (refused when the
          // workspace is out, refunded when the generation fails)
          const image = await this._mediaService.generateImage(
            inputData.prompt,
            org,
            false,
            (context?.requestContext as any)?.get('billingExempt') === 'true'
          );

          const file = await this.storage.uploadSimple(
            'data:image/png;base64,' + image
          );

          return await this._mediaService.saveFile(
            org.id,
            file.split('/').pop(),
            file
          );
        } catch (err) {
          // SubscriptionException (402) carries { section, action } and its
          // message is just "Subscription Exception", so translate it
          const message =
            err instanceof HttpException && err.getStatus() === 402
              ? "The workspace has used its AI credits this month. They can buy more credits or upgrade in Billing."
              : err instanceof Error
              ? err.message
              : String(err);
          return {
            error: `Image generation failed: ${message}. No AI credits were used.`,
          };
        }
      },
    });
  }
}
