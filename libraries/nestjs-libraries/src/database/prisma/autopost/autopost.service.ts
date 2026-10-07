import { Injectable } from '@nestjs/common';
import { AutopostRepository } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.repository';
import { AutopostDto } from '@gitroom/nestjs-libraries/dtos/autopost/autopost.dto';
import dayjs from 'dayjs';
import { END, START, StateGraph } from '@langchain/langgraph';
import { AutoPost, Integration } from '@prisma/client';
import { BaseMessage } from '@langchain/core/messages';
import striptags from 'striptags';
import { ChatOpenAI, DallEAPIWrapper } from '@langchain/openai';
import { JSDOM } from 'jsdom';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import Parser from 'rss-parser';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import {
  organizationId,
} from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import sharp from 'sharp';
import { Readable } from 'stream';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
const parser = new Parser();

interface WorkflowChannelsState {
  messages: BaseMessage[];
  integrations: Integration[];
  body: AutoPost;
  description: string;
  image: string;
  id: string;
  load: {
    date: string;
    url: string;
    description: string;
    title?: string;
    summary?: string;
    imageUrl?: string | null;
  };
}

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'gpt-4.1',
  temperature: 0.7,
});

const dalle = new DallEAPIWrapper({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
  model: 'chatgpt-image-latest',
});

const generateContent = z.object({
  socialMediaPostContent: z
    .string()
    .describe('Content for social media posts max 120 chars'),
});

const dallePrompt = z.object({
  generatedTextToBeSentToDallE: z
    .string()
    .describe('Generated prompt from description to be sent to DallE'),
});

@Injectable()
export class AutopostService {
  constructor(
    private _autopostsRepository: AutopostRepository,
    private _temporalService: TemporalService,
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _integrationManager: IntegrationManager
  ) {}

  private storage = UploadFactory.createStorage();

  async stopAll(org: string) {
    const getAll = (await this.getAutoposts(org)).filter((f) => f.active);
    for (const autopost of getAll) {
      await this.changeActive(org, autopost.id, false);
    }
  }

  getAutoposts(orgId: string) {
    return this._autopostsRepository.getAutoposts(orgId);
  }

  async createAutopost(orgId: string, body: AutopostDto, id?: string) {
    const data = await this._autopostsRepository.createAutopost(
      orgId,
      body,
      id
    );

    await this.processCron(body.active, orgId, data.id);

    return data;
  }

  async changeActive(orgId: string, id: string, active: boolean) {
    const data = await this._autopostsRepository.changeActive(
      orgId,
      id,
      active
    );
    await this.processCron(active, orgId, id);
    return data;
  }

  async processCron(active: boolean, orgId: string, id: string) {
    if (active) {
      try {
        return await this._temporalService.client
          .getRawClient()
          ?.workflow.start('autoPostWorkflow', {
            workflowId: `autopost-${id}`,
            taskQueue: 'main',
            args: [{ id, immediately: true }],
            // Keep a running workflow, it reads the autopost settings on every run
            workflowIdConflictPolicy: 'USE_EXISTING',
            typedSearchAttributes: new TypedSearchAttributes([
              {
                key: organizationId,
                value: orgId,
              },
            ]),
          });
      } catch (err) {
        // Don't fall through and terminate an active autopost
        return false;
      }
    }

    try {
      return await this._temporalService.terminateWorkflow(`autopost-${id}`);
    } catch (err) {
      return false;
    }
  }

  async deleteAutopost(orgId: string, id: string) {
    const data = await this._autopostsRepository.deleteAutopost(orgId, id);
    await this.processCron(false, orgId, id);
    return data;
  }

  async loadXML(url: string) {
    try {
      const { items } = await parser.parseURL(url);
      const findLast = items.reduce(
        (all: any, current: any) => {
          if (dayjs(current.pubDate).isAfter(all.pubDate)) {
            return current;
          }
          return all;
        },
        { pubDate: dayjs().subtract(100, 'years') }
      );

      return { success: true as const, ...this.feedItem(findLast) };
    } catch (err) {
      /** sent **/
    }

    return { success: false as const };
  }

  // What a post needs from one RSS item: the link, the full text for the AI,
  // and the title, a short summary and an image candidate for plain posts
  feedItem(item: any) {
    const html =
      item?.['content:encoded'] || item?.content || item?.description || '';

    return {
      date: item?.pubDate,
      url: item?.link,
      title: (item?.title || '').trim(),
      summary: this.summarize(
        item?.contentSnippet || item?.description || item?.content || ''
      ),
      imageUrl: this.feedImage(item, html),
      description: striptags(html).replace(/\n/g, ' ').trim(),
    };
  }

  // The enclosure when it is an image, otherwise the first <img> of the content
  private feedImage(item: any, html: string): string | null {
    const found =
      item?.enclosure?.url && /^image\//.test(item.enclosure.type || 'image/')
        ? item.enclosure.url
        : html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    if (!found) {
      return null;
    }

    try {
      return new URL(found.replace(/&amp;/g, '&'), item?.link).href;
    } catch (err) {
      return null;
    }
  }

  // Plain text without the WordPress "The post ... appeared first on ..."
  // footer, cut at a sentence end (or else a word) to fit 280 characters
  private summarize(text: string) {
    const clean = striptags(text)
      .replace(/\s+/g, ' ')
      .replace(/\s*The post .{0,300}? appeared first on .*$/, '')
      .trim();
    if (clean.length <= 280) {
      return clean;
    }

    const cut = clean.slice(0, 280);
    const end = Math.max(
      cut.lastIndexOf('. '),
      cut.lastIndexOf('! '),
      cut.lastIndexOf('? ')
    );
    return end > 80
      ? cut.slice(0, end + 1)
      : cut.replace(/\s+\S*$/, '') + '…';
  }

  static state = () =>
    new StateGraph<WorkflowChannelsState>({
      channels: {
        messages: {
          reducer: (currentState, updateValue) =>
            currentState.concat(updateValue),
          default: () => [],
        },
        body: null,
        description: null,
        load: null,
        image: null,
        integrations: null,
        id: null,
      },
    });

  async loadUrl(url: string) {
    try {
      const loadDom = new JSDOM(await (await fetch(url)).text());
      loadDom.window.document
        .querySelectorAll('script')
        .forEach((s) => s.remove());
      loadDom.window.document
        .querySelectorAll('style')
        .forEach((s) => s.remove());
      // remove all html, script and styles
      return striptags(loadDom.window.document.body.innerHTML);
    } catch (err) {
      return '';
    }
  }

  async generateDescription(state: WorkflowChannelsState) {
    if (!state.body.generateContent) {
      // The template, then the article title and a short summary
      // (schedulePost appends the link)
      return {
        ...state,
        description: [
          state.body.content,
          state.load.title ? '📌 ' + state.load.title : '',
          state.load.summary,
        ]
          .filter((p) => p && String(p).trim())
          .join('\n'),
      };
    }

    const description =
      state.load.description || (await this.loadUrl(state.load.url));
    if (!description) {
      return {
        ...state,
        description: '',
      };
    }

    const structuredOutput = model.withStructuredOutput(generateContent);
    const { socialMediaPostContent } = await ChatPromptTemplate.fromTemplate(
      `
        You are an assistant that gets raw 'description' of a content and generate a social media post content.
        Rules:
        - Maximum 100 chars
        - Try to make it a short as possible to fit any social media
        - Add line breaks between sentences (\\n) 
        - Don't add hashtags
        - Add emojis when needed
        
        'description':
        {content}
      `
    )
      .pipe(structuredOutput)
      .invoke({
        content: description,
      });

    return {
      ...state,
      description: socialMediaPostContent,
    };
  }

  async generatePicture(state: WorkflowChannelsState) {
    const structuredOutput = model.withStructuredOutput(dallePrompt);
    const { generatedTextToBeSentToDallE } =
      await ChatPromptTemplate.fromTemplate(
        `
        You are an assistant that gets description and generate a prompt that will be sent to DallE to generate pictures.
        
        content:
        {content}
      `
      )
        .pipe(structuredOutput)
        .invoke({
          content: state.load.description || state.description,
        });

    const image = await dalle.invoke(generatedTextToBeSentToDallE);

    return { ...state, image };
  }

  // A public https URL fetched through the SSRF-safe dispatcher, null otherwise
  private async safeFetch(url?: string | null) {
    if (!url || !(await isSafePublicHttpsUrl(url))) {
      return null;
    }

    const res = await fetch(url, {
      // @ts-ignore — undici option, not in lib.dom fetch types
      dispatcher: ssrfSafeDispatcher,
      signal: AbortSignal.timeout(20000),
    });
    return res.ok ? res : null;
  }

  // og:image / twitter:image of the article, for feeds without images
  private async findOgImage(articleUrl: string) {
    try {
      const res = await this.safeFetch(articleUrl);
      if (!res) {
        return null;
      }

      const html = (await res.text()).slice(0, 500000);
      for (const key of ['og:image', 'twitter:image']) {
        const found =
          html.match(
            new RegExp(
              `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
              'i'
            )
          ) ||
          html.match(
            new RegExp(
              `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
              'i'
            )
          );
        if (found) {
          return new URL(found[1].replace(/&amp;/g, '&'), articleUrl).href;
        }
      }
    } catch (err: any) {
      console.error('autopost: og:image lookup failed', articleUrl, err?.message);
    }

    return null;
  }

  // The generated picture, else the feed image, else the article og:image.
  // Downloaded, padded into the 4:5 to 1.91:1 range feed networks accept,
  // re-encoded as JPEG and stored in our own storage
  async prepareImage(state: WorkflowChannelsState) {
    const candidates = [
      async () => state.image,
      async () => state.load.imageUrl,
      () => this.findOgImage(state.load.url),
    ];

    for (const candidate of candidates) {
      const url = await candidate();
      try {
        const res = await this.safeFetch(url);
        if (!res) {
          continue;
        }

        // Apply the EXIF orientation first: metadata() reports the stored size
        const input = await sharp(Buffer.from(await res.arrayBuffer()))
          .rotate()
          .toBuffer();
        const { width, height } = await sharp(input).metadata();
        if (!width || !height) {
          continue;
        }

        const ratio = width / height;
        let img = sharp(input).flatten({ background: '#ffffff' });
        if (ratio > 1.91 || ratio < 0.8) {
          img = sharp(
            await img
              .resize({
                width: ratio > 1.91 ? width : Math.round(height * 0.8),
                height: ratio > 1.91 ? Math.round(width / 1.91) : height,
                fit: 'contain',
                background: '#ffffff',
              })
              .toBuffer()
          );
        }

        const buffer = await img
          .resize({ width: 1440, withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();

        const { path } = await this.storage.uploadFile({
          buffer,
          mimetype: 'image/jpeg',
          size: buffer.length,
          path: '',
          fieldname: '',
          destination: '',
          stream: new Readable(),
          filename: '',
          originalname: 'autopost.jpg',
          encoding: '',
        });
        return path as string;
      } catch (err: any) {
        console.error('autopost: image prepare failed', url, err?.message);
      }
    }

    return null;
  }

  async schedulePost(state: WorkflowChannelsState) {
    const orgId = state.integrations[0].organizationId;
    const imagePath = await this.prepareImage(state);
    const nextTime = await this._postsService.findFreeDateTime(orgId);

    const posts = state.integrations.map((i) => ({
      settings: {
        __type: i.providerIdentifier as any,
        title: '',
        tags: [] as any[],
        subreddit: [] as any[],
        ...(this._integrationManager
          .getSocialIntegration(i.providerIdentifier)
          ?.defaultSettings?.() || {}),
      },
      group: makeId(10),
      integration: { id: i.id },
      value: [
        {
          id: makeId(10),
          delay: 0,
          content:
            state.description.replace(/\n/g, '\n\n') +
            '\n\n' +
            state.load.url,
          image: !imagePath
            ? []
            : [
                {
                  id: makeId(10),
                  name: makeId(10),
                  path: imagePath,
                  organizationId: orgId,
                },
              ],
        },
      ],
    }));

    // Channels that pass the editor's validation are scheduled on the next
    // free slot; the rest (e.g. a network that needs media and the item has
    // none) are kept as drafts to finish by hand
    const validation = await this._postsService.validatePosts(orgId, posts);
    const isReady = (post: (typeof posts)[number]) => {
      const check = validation.find((v) => v.id === post.integration.id);
      return (
        !!check &&
        check.valid &&
        check.errors === true &&
        !check.emptyContent &&
        !check.tooLong
      );
    };

    for (const type of ['schedule', 'draft'] as const) {
      const list = posts.filter((p) => isReady(p) === (type === 'schedule'));
      if (!list.length) {
        continue;
      }

      await this._postsService.createPost(
        orgId,
        {
          date: nextTime + 'Z',
          order: makeId(10),
          shortLink: false,
          type,
          tags: [],
          posts: list,
        },
        'AUTOPOST'
      );
    }
  }

  async updateUrl(state: WorkflowChannelsState) {
    await this._autopostsRepository.updateUrl(state.id, state.load.url);
  }

  async startAutopost(id: string) {
    const getPost = await this._autopostsRepository.getAutopost(id);
    if (!getPost || !getPost.active) {
      return;
    }

    const load = await this.loadXML(getPost.url);
    if (!load.success || load.url === getPost.lastUrl) {
      return;
    }

    const integrations = await this._integrationService.getIntegrationsList(
      getPost.organizationId
    );

    const parseIntegrations = JSON.parse(getPost.integrations || '[]') || [];
    const neededIntegrations = integrations.filter((i) =>
      parseIntegrations.some((ii: any) => ii.id === i.id)
    );

    const integrationsToSend =
      parseIntegrations.length === 0 ? integrations : neededIntegrations;
    if (integrationsToSend.length === 0) {
      return;
    }

    const state = AutopostService.state();
    const workflow = state
      .addNode('generate-description', this.generateDescription.bind(this))
      .addNode('generate-picture', this.generatePicture.bind(this))
      .addNode('schedule-post', this.schedulePost.bind(this))
      .addNode('update-url', this.updateUrl.bind(this))
      .addEdge(START, 'generate-description')
      .addConditionalEdges(
        'generate-description',
        (state: WorkflowChannelsState) => {
          if (!state.description) {
            return 'schedule-post';
          }
          if (state.body.addPicture) {
            return 'generate-picture';
          }
          return 'schedule-post';
        }
      )
      .addEdge('generate-picture', 'schedule-post')
      .addEdge('schedule-post', 'update-url')
      .addEdge('update-url', END);

    const app = workflow.compile();
    await app.invoke({
      messages: [],
      id,
      body: getPost,
      load,
      integrations: integrationsToSend,
    });
  }
}
