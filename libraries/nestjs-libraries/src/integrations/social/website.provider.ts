import { createHmac } from 'crypto';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import {
  AuthTokenDetails,
  MediaContent,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import {
  BadBody,
  RefreshToken,
  SocialAbstract,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import { WebsiteDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/website.dto';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';

// The site owner's endpoint is their own server: give it a fixed budget so a
// hanging site can't hold the publish activity until its startToCloseTimeout.
const WEBSITE_TIMEOUT = 15_000;

// Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan, Mandaic and the Arabic
// presentation forms.
const RTL_REGEX = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

type WebsiteCredentials = {
  siteUrl: string;
  endpoint: string;
  token: string;
};

const trimSlash = (url: string) => (url || '').trim().replace(/\/+$/, '');

// https everywhere, plain http only for a site running on the same machine
// (local development of the receiver).
const isAllowedEndpoint = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') {
      return true;
    }
    return (
      parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsed.hostname)
    );
  } catch (err) {
    return false;
  }
};

const absoluteUrl = (path?: string) => {
  if (!path) {
    return null;
  }
  return path.indexOf('http') === 0
    ? path
    : `${process.env.FRONTEND_URL}/${path.replace(/^\/+/, '')}`;
};

@Rules(
  'Website publishes the content as an article on the owner site: pictures go inside the content as <img src="..."> where they should appear, the src must be a picture from the media library (upload it with uploadFromUrlTool first), the title setting is required, the cover picture is the cover setting (otherwise the first picture of the post)'
)
export class WebsiteProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3; // the owner's own server, keep it gentle
  identifier = 'website';
  name = 'Website';
  isBetweenSteps = false;
  editor = 'html' as const;
  scopes = [] as string[];
  dto = WebsiteDto;

  maxLength() {
    return 100000;
  }

  inlineImages() {
    return true;
  }

  async generateAuthUrl() {
    const state = makeSecureId(6);
    return {
      url: state,
      codeVerifier: makeSecureId(10),
      state,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async customFields() {
    return [
      {
        key: 'siteUrl',
        label: 'Site URL',
        validation: `/^https?:\\/\\/[^\\s/$.?#].[^\\s]*$/`,
        type: 'text' as const,
        hint: 'The public address of your site, e.g. https://example.com',
      },
      {
        key: 'endpoint',
        label: 'Endpoint URL',
        validation: `/^(https:\\/\\/[^\\s/$.?#][^\\s]*|http:\\/\\/(localhost|127\\.0\\.0\\.1)(:\\d{2,5})?(\\/[^\\s]*)?)$/`,
        type: 'text' as const,
        hint: 'The webhook on your site that receives the articles (https only)',
      },
      {
        key: 'token',
        label: 'Secret token',
        validation: `/^.{16,}$/`,
        type: 'password' as const,
        hint: 'Shared secret, at least 16 characters. Your site uses it to check the Bearer token and the request signature',
      },
    ];
  }

  // 401/403 means the token (or signature) is no longer accepted: the user
  // must reconnect the channel. The site's own error text is what the user is
  // shown for anything else it rejects, 5xx is temporary.
  override handleErrors(
    body: string,
    status: number
  ):
    | { type: 'refresh-token' | 'bad-body' | 'retry'; value: string }
    | undefined {
    if (status === 401 || status === 403) {
      return {
        type: 'refresh-token',
        value: 'Your website rejected the secret token, please reconnect it',
      };
    }

    if (status >= 500) {
      return {
        type: 'retry',
        value: `Your website is not available right now (HTTP ${status})`,
      };
    }

    let error = '';
    try {
      error = JSON.parse(body)?.error || '';
    } catch (err) {
      /**empty**/
    }

    return {
      type: 'bad-body',
      value: error || `Your website rejected the post (HTTP ${status})`,
    };
  }

  private credentials(integration: Integration): WebsiteCredentials {
    const details = JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    ) as WebsiteCredentials;

    return {
      siteUrl: trimSlash(details.siteUrl),
      endpoint: (details.endpoint || '').trim(),
      token: details.token,
    };
  }

  // Plain fetch with the SSRF guard (not this.fetch): authenticate and
  // deletePost run in the API process, and the callers branch on the status.
  private request(url: string, token: string, method: 'GET' | 'DELETE') {
    return fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(WEBSITE_TIMEOUT),
      // @ts-ignore - undici-only option; blocks SSRF to internal IPs
      dispatcher: getSsrfSafeDispatcher(),
    });
  }

  private async reachable(url: string) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        // @ts-ignore - undici-only option; blocks SSRF to internal IPs
        dispatcher: getSsrfSafeDispatcher(),
      });
      return response.ok;
    } catch (err) {
      return false;
    }
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body = JSON.parse(
      Buffer.from(params.code, 'base64').toString()
    ) as WebsiteCredentials;

    const siteUrl = trimSlash(body.siteUrl);
    const endpoint = (body.endpoint || '').trim();

    let hostname = '';
    try {
      hostname = new URL(siteUrl).hostname;
    } catch (err) {
      return 'The Site URL is not a valid address.';
    }

    if (!isAllowedEndpoint(endpoint)) {
      return 'The Endpoint URL must use https.';
    }

    let response: Response;
    try {
      response = await this.request(endpoint, body.token, 'GET');
    } catch (err) {
      console.log(err);
      return 'Could not reach your website endpoint. Check the Endpoint URL and that the site is publicly accessible.';
    }

    if (response.status === 401 || response.status === 403) {
      return 'Your website rejected the secret token. Check that it matches the token configured on your site.';
    }

    let data: { ok?: boolean; name?: string; url?: string; avatar?: string };
    try {
      data = await response.json();
    } catch (err) {
      data = {};
    }

    if (!response.ok || !data?.ok) {
      return `Your website endpoint returned an unexpected answer (HTTP ${response.status}). It must reply to GET with { "ok": true }.`;
    }

    const favicon = `${siteUrl}/favicon.ico`;
    const picture =
      data.avatar ||
      ((await this.reachable(favicon))
        ? favicon
        : `${process.env.FRONTEND_URL}/icons/platforms/website.png`);

    return {
      refreshToken: '',
      expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
      accessToken: body.token,
      id: siteUrl.toLowerCase(),
      name: data.name || hostname,
      picture,
      username: hostname,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<WebsiteDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { endpoint, token } = this.credentials(integration);
    const [firstPost] = postDetails;
    const settings: Partial<WebsiteDto> = firstPost.settings || {};

    const media: MediaContent[] = firstPost.media || [];
    const firstImage = media.find((m) => m.type === 'image');
    const firstVideo = media.find((m) => m.type === 'video');

    const bodyHtml = firstPost.message;
    // the markdown conversion strips every tag, so inline pictures become
    // markdown images first
    const bodyMd = stripHtmlValidation(
      'markdown',
      bodyHtml.replace(/<img\b[^>]*>/gi, (tag) => {
        const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
        const alt = tag.match(/\salt=["']([^"']*)["']/i)?.[1] || '';
        return src ? `![${alt}](${src})` : '';
      }),
      true
    );
    const plainText = stripHtmlValidation('none', bodyHtml);
    const isRtl = RTL_REGEX.test(`${settings.title || ''} ${plainText}`);

    // Serialized once: the signature must cover the exact bytes sent.
    const rawBody = JSON.stringify({
      external_id: firstPost.id,
      title: settings.title || '',
      body_md: bodyMd,
      body_html: bodyHtml,
      summary: settings.summary || '',
      tags: (settings.tags || [])
        .map((tag) => (tag?.label || tag?.value || '').trim())
        .filter((tag) => tag),
      cover_url: absoluteUrl(settings.cover?.path || firstImage?.path),
      video_url: absoluteUrl(firstVideo?.path),
      status: 'published',
      publish_at: new Date().toISOString(),
      lang: isRtl ? 'ar' : 'en',
      dir: isRtl ? 'rtl' : 'ltr',
    });

    // runStreamedUpload (not this.fetch) so every 2xx counts as success and a
    // timed-out request is retried like a 5xx - safe because the site upserts
    // by external_id. The classification is the same handleErrors as above.
    const result = await this.runStreamedUpload<{ url: string; id: string }>(
      async () => {
        const timestamp = String(dayjs().unix());
        const signature = createHmac('sha256', token)
          .update(`${timestamp}.${rawBody}`)
          .digest('hex');

        let response: Response;
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-Tadween-Timestamp': timestamp,
              'X-Tadween-Signature': `sha256=${signature}`,
            },
            body: rawBody,
            signal: AbortSignal.timeout(WEBSITE_TIMEOUT),
            // @ts-ignore - undici-only option; blocks SSRF to internal IPs
            dispatcher: getSsrfSafeDispatcher(),
          });
        } catch (err: any) {
          if (
            err?.name === 'TimeoutError' ||
            err?.cause?.name === 'TimeoutError'
          ) {
            throw { response: { status: 504, data: '{}' } };
          }
          throw err;
        }

        const text = await response.text().catch(() => '');
        if (!response.ok) {
          throw { response: { status: response.status, data: text || '{}' } };
        }

        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch (err) {
          /**empty**/
        }

        if (!data?.ok || !data?.url) {
          throw {
            response: {
              status: 422,
              data: JSON.stringify({
                error:
                  data?.error ||
                  'Your website did not return the published article URL',
              }),
            },
          };
        }

        return { url: data.url, id: String(data.id ?? firstPost.id) };
      },
      this.identifier
    );

    return [
      {
        id: firstPost.id,
        status: 'completed',
        postId: result.id,
        releaseURL: result.url,
      },
    ];
  }

  async deletePost(
    accessToken: string,
    integration: Integration,
    releaseId: string,
    externalId: string
  ): Promise<void> {
    const { endpoint, token } = this.credentials(integration);
    const url = new URL(endpoint);
    url.searchParams.set('external_id', externalId);

    const response = await this.request(url.toString(), token, 'DELETE');

    // 404 means the article is already gone, which is what we wanted
    if (response.ok || response.status === 404) {
      return;
    }

    const text = (await response.text().catch(() => '')) || '{}';
    const handle = this.handleErrors(text, response.status);
    if (handle?.type === 'refresh-token') {
      throw new RefreshToken(this.identifier, text, '{}', handle.value);
    }
    throw new BadBody(this.identifier, text, '{}', handle?.value);
  }
}
