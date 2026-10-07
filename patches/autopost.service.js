"use strict";
var AutopostService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutopostService = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const autopost_repository_1 = require("./autopost.repository");
const dayjs_1 = tslib_1.__importDefault(require("dayjs"));
const langgraph_1 = require("@langchain/langgraph");
const striptags_1 = tslib_1.__importDefault(require("striptags"));
const openai_1 = require("@langchain/openai");
const jsdom_1 = require("jsdom");
const zod_1 = require("zod");
const prompts_1 = require("@langchain/core/prompts");
const posts_service_1 = require("../posts/posts.service");
const rss_parser_1 = tslib_1.__importDefault(require("rss-parser"));
const integration_service_1 = require("../integrations/integration.service");
const make_is_1 = require("../../../services/make.is");
const nestjs_temporal_core_1 = require("nestjs-temporal-core");
const common_2 = require("@temporalio/common");
const temporal_search_attribute_1 = require("../../../temporal/temporal.search.attribute");
// LOCAL PATCH: deps for attaching the article image (Instagram requires media)
const sharp_1 = tslib_1.__importDefault(require("sharp"));
const upload_factory_1 = require("../../../upload/upload.factory");
const webhook_url_validator_1 = require("../../../dtos/webhooks/webhook.url.validator");
const ssrf_safe_dispatcher_1 = require("../../../dtos/webhooks/ssrf.safe.dispatcher");
const parser = new rss_parser_1.default();
const model = new openai_1.ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
    model: 'gpt-4.1',
    temperature: 0.7,
});
const dalle = new openai_1.DallEAPIWrapper({
    apiKey: process.env.OPENAI_API_KEY || 'sk-proj-',
    model: 'chatgpt-image-latest',
});
const generateContent = zod_1.z.object({
    socialMediaPostContent: zod_1.z
        .string()
        .describe('Content for social media posts max 120 chars'),
});
const dallePrompt = zod_1.z.object({
    generatedTextToBeSentToDallE: zod_1.z
        .string()
        .describe('Generated prompt from description to be sent to DallE'),
});
let AutopostService = AutopostService_1 = class AutopostService {
    constructor(_autopostsRepository, _temporalService, _integrationService, _postsService) {
        this._autopostsRepository = _autopostsRepository;
        this._temporalService = _temporalService;
        this._integrationService = _integrationService;
        this._postsService = _postsService;
    }
    async stopAll(org) {
        const getAll = (await this.getAutoposts(org)).filter((f) => f.active);
        for (const autopost of getAll) {
            await this.changeActive(org, autopost.id, false);
        }
    }
    getAutoposts(orgId) {
        return this._autopostsRepository.getAutoposts(orgId);
    }
    async createAutopost(orgId, body, id) {
        const data = await this._autopostsRepository.createAutopost(orgId, body, id);
        await this.processCron(body.active, orgId, data.id);
        return data;
    }
    async changeActive(orgId, id, active) {
        const data = await this._autopostsRepository.changeActive(orgId, id, active);
        await this.processCron(active, orgId, id);
        return data;
    }
    async processCron(active, orgId, id) {
        if (active) {
            try {
                return this._temporalService.client
                    .getRawClient()
                    ?.workflow.start('autoPostWorkflow', {
                    workflowId: `autopost-${id}`,
                    taskQueue: 'main',
                    args: [{ id, immediately: true }],
                    typedSearchAttributes: new common_2.TypedSearchAttributes([
                        {
                            key: temporal_search_attribute_1.organizationId,
                            value: orgId,
                        },
                    ]),
                });
            }
            catch (err) { }
        }
        try {
            return await this._temporalService.terminateWorkflow(`autopost-${id}`);
        }
        catch (err) {
            return false;
        }
    }
    async deleteAutopost(orgId, id) {
        const data = await this._autopostsRepository.deleteAutopost(orgId, id);
        await this.processCron(false, orgId, id);
        return data;
    }
    async loadXML(url) {
        try {
            const { items } = await parser.parseURL(url);
            const findLast = items.reduce((all, current) => {
                if ((0, dayjs_1.default)(current.pubDate).isAfter(all.pubDate)) {
                    return current;
                }
                return all;
            }, { pubDate: (0, dayjs_1.default)().subtract(100, 'years') });
            return {
                success: true,
                date: findLast.pubDate,
                url: findLast.link,
                // LOCAL PATCH: keep title + a short summary for non-AI drafts
                title: (findLast.title || '').trim(),
                // LOCAL PATCH: image candidate from the feed item (enclosure, else first <img> in the content)
                imageUrl: (() => {
                    if (findLast?.enclosure?.url && /^image\//.test(findLast.enclosure.type || 'image/')) {
                        return findLast.enclosure.url;
                    }
                    const html = findLast?.['content:encoded'] || findLast?.content || findLast?.description || '';
                    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                    return m ? m[1].replace(/&amp;/g, '&') : null;
                })(),
                summary: (() => {
                    const t = (0, striptags_1.default)(findLast?.contentSnippet || findLast?.description || findLast?.content || '').replace(/\s+/g, ' ').replace(/\s*The post .{0,300}? appeared first on [^.]*\.?\s*$/, '').trim();
                    if (t.length <= 280) return t;
                    const cut = t.slice(0, 280);
                    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
                    return end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…';
                })(),
                description: (0, striptags_1.default)(findLast?.['content:encoded'] ||
                    findLast?.content ||
                    findLast?.description ||
                    '')
                    .replace(/\n/g, ' ')
                    .trim(),
            };
        }
        catch (err) {
        }
        return { success: false };
    }
    async loadUrl(url) {
        try {
            const loadDom = new jsdom_1.JSDOM(await (await fetch(url)).text());
            loadDom.window.document
                .querySelectorAll('script')
                .forEach((s) => s.remove());
            loadDom.window.document
                .querySelectorAll('style')
                .forEach((s) => s.remove());
            return (0, striptags_1.default)(loadDom.window.document.body.innerHTML);
        }
        catch (err) {
            return '';
        }
    }
    async generateDescription(state) {
        if (!state.body.generateContent) {
            // LOCAL PATCH: template + title + short summary (schedulePost appends the link)
            return {
                ...state,
                description: [state.body.content, state.load.title ? '📌 ' + state.load.title : '', state.load.summary]
                    .filter((x) => x && String(x).trim())
                    .join('\n'),
            };
        }
        const description = state.load.description || (await this.loadUrl(state.load.url));
        if (!description) {
            return {
                ...state,
                description: '',
            };
        }
        const structuredOutput = model.withStructuredOutput(generateContent);
        const { socialMediaPostContent } = await prompts_1.ChatPromptTemplate.fromTemplate(`
        You are an assistant that gets raw 'description' of a content and generate a social media post content.
        Rules:
        - Maximum 100 chars
        - Try to make it a short as possible to fit any social media
        - Add line breaks between sentences (\\n) 
        - Don't add hashtags
        - Add emojis when needed
        
        'description':
        {content}
      `)
            .pipe(structuredOutput)
            .invoke({
            content: description,
        });
        return {
            ...state,
            description: socialMediaPostContent,
        };
    }
    async generatePicture(state) {
        const structuredOutput = model.withStructuredOutput(dallePrompt);
        const { generatedTextToBeSentToDallE } = await prompts_1.ChatPromptTemplate.fromTemplate(`
        You are an assistant that gets description and generate a prompt that will be sent to DallE to generate pictures.
        
        content:
        {content}
      `)
            .pipe(structuredOutput)
            .invoke({
            content: state.load.description || state.description,
        });
        const image = await dalle.invoke(generatedTextToBeSentToDallE);
        return { ...state, image };
    }
    // LOCAL PATCH: fetch a public https URL through the SSRF-safe dispatcher
    async safeFetch(url) {
        if (!url || !(await (0, webhook_url_validator_1.isSafePublicHttpsUrl)(url))) {
            return null;
        }
        const res = await fetch(url, {
            dispatcher: ssrf_safe_dispatcher_1.ssrfSafeDispatcher,
            signal: AbortSignal.timeout(20000),
        });
        return res.ok ? res : null;
    }
    // LOCAL PATCH: og:image / twitter:image of the article page, for feeds without images
    async findOgImage(articleUrl) {
        try {
            const res = await this.safeFetch(articleUrl);
            if (!res) {
                return null;
            }
            const html = (await res.text()).slice(0, 500000);
            for (const key of ['og:image', 'twitter:image']) {
                const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i'));
                if (m) {
                    return new URL(m[1].replace(/&amp;/g, '&'), articleUrl).href;
                }
            }
        }
        catch (err) {
            console.error('autopost: og:image lookup failed', articleUrl, err?.message);
        }
        return null;
    }
    // LOCAL PATCH: download -> fit Instagram aspect ratio (0.8..1.91) -> JPEG -> our own storage
    async prepareImage(state) {
        const candidates = [state.image, state.load.imageUrl];
        for (let i = 0; i < 3; i++) {
            const url = i < 2 ? candidates[i] : await this.findOgImage(state.load.url);
            if (!url) {
                continue;
            }
            try {
                const res = await this.safeFetch(url);
                if (!res) {
                    continue;
                }
                const input = Buffer.from(await res.arrayBuffer());
                const { width, height } = await (0, sharp_1.default)(input).rotate().metadata();
                if (!width || !height) {
                    continue;
                }
                const ratio = width / height;
                let img = (0, sharp_1.default)(input).rotate().flatten({ background: '#ffffff' });
                if (ratio > 1.91 || ratio < 0.8) {
                    const target = ratio > 1.91 ? 1.91 : 0.8;
                    img = img.resize({
                        width: ratio > 1.91 ? width : Math.round(height * target),
                        height: ratio > 1.91 ? Math.round(width / target) : height,
                        fit: 'contain',
                        background: '#ffffff',
                    });
                    img = (0, sharp_1.default)(await img.toBuffer());
                }
                const buffer = await img
                    .resize({ width: 1440, withoutEnlargement: true })
                    .jpeg({ quality: 90 })
                    .toBuffer();
                const uploaded = await upload_factory_1.UploadFactory.createStorage().uploadFile({
                    buffer,
                    mimetype: 'image/jpeg',
                    size: buffer.length,
                    originalname: 'autopost.jpg',
                });
                return uploaded.path;
            }
            catch (err) {
                console.error('autopost: image prepare failed', url, err?.message);
            }
        }
        return null;
    }
    async schedulePost(state) {
        // LOCAL PATCH: attach the article image; Instagram is skipped for items without one
        const imagePath = await this.prepareImage(state);
        const integrations = imagePath
            ? state.integrations
            : state.integrations.filter((i) => !i.providerIdentifier.startsWith('instagram'));
        if (integrations.length === 0) {
            return;
        }
        const nextTime = await this._postsService.findFreeDateTime(integrations[0].organizationId);
        await this._postsService.createPost(integrations[0].organizationId, {
            date: nextTime + 'Z',
            order: (0, make_is_1.makeId)(10),
            shortLink: false,
            // LOCAL PATCH: auto-publish into the next free slot instead of creating a draft
            type: 'schedule',
            tags: [],
            posts: integrations.map((i) => ({
                settings: {
                    __type: i.providerIdentifier,
                    title: '',
                    tags: [],
                    subreddit: [],
                    ...(i.providerIdentifier.startsWith('instagram')
                        ? { post_type: 'post', collaborators: [] }
                        : {}),
                },
                group: (0, make_is_1.makeId)(10),
                integration: { id: i.id },
                value: [
                    {
                        id: (0, make_is_1.makeId)(10),
                        delay: 0,
                        content: state.description.replace(/\n/g, '\n\n') +
                            '\n\n' +
                            state.load.url,
                        image: !imagePath
                            ? []
                            : [
                                {
                                    id: (0, make_is_1.makeId)(10),
                                    name: (0, make_is_1.makeId)(10),
                                    path: imagePath,
                                    organizationId: integrations[0].organizationId,
                                },
                            ],
                    },
                ],
            })),
        }, 'AUTOPOST');
    }
    async updateUrl(state) {
        await this._autopostsRepository.updateUrl(state.id, state.load.url);
    }
    async startAutopost(id) {
        const getPost = await this._autopostsRepository.getAutopost(id);
        if (!getPost || !getPost.active) {
            return;
        }
        const load = await this.loadXML(getPost.url);
        if (!load.success || load.url === getPost.lastUrl) {
            return;
        }
        const integrations = await this._integrationService.getIntegrationsList(getPost.organizationId);
        const parseIntegrations = JSON.parse(getPost.integrations || '[]') || [];
        const neededIntegrations = integrations.filter((i) => parseIntegrations.some((ii) => ii.id === i.id));
        const integrationsToSend = parseIntegrations.length === 0 ? integrations : neededIntegrations;
        if (integrationsToSend.length === 0) {
            return;
        }
        const state = AutopostService_1.state();
        const workflow = state
            .addNode('generate-description', this.generateDescription.bind(this))
            .addNode('generate-picture', this.generatePicture.bind(this))
            .addNode('schedule-post', this.schedulePost.bind(this))
            .addNode('update-url', this.updateUrl.bind(this))
            .addEdge(langgraph_1.START, 'generate-description')
            .addConditionalEdges('generate-description', (state) => {
            if (!state.description) {
                return 'schedule-post';
            }
            if (state.body.addPicture) {
                return 'generate-picture';
            }
            return 'schedule-post';
        })
            .addEdge('generate-picture', 'schedule-post')
            .addEdge('schedule-post', 'update-url')
            .addEdge('update-url', langgraph_1.END);
        const app = workflow.compile();
        await app.invoke({
            messages: [],
            id,
            body: getPost,
            load,
            integrations: integrationsToSend,
        });
    }
};
exports.AutopostService = AutopostService;
AutopostService.state = () => new langgraph_1.StateGraph({
    channels: {
        messages: {
            reducer: (currentState, updateValue) => currentState.concat(updateValue),
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
exports.AutopostService = AutopostService = AutopostService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [autopost_repository_1.AutopostRepository,
        nestjs_temporal_core_1.TemporalService,
        integration_service_1.IntegrationService,
        posts_service_1.PostsService])
], AutopostService);
//# sourceMappingURL=autopost.service.js.map