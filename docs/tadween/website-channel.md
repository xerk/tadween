# Website channel: publish Tadween posts to your own site

The **Website** channel sends each published post to an HTTPS endpoint on your
site. Your site stores it as an article and replies with the article URL.
This page is for site owners who want to build that endpoint.

## Connecting

In Tadween, open **Add channel → Website** and fill in:

| Field | Example | Notes |
| --- | --- | --- |
| Site URL | `https://example.com` | Public address of the site |
| Endpoint URL | `https://example.com/api/tadween` | Must be `https` (plain `http` is only accepted for `localhost`) |
| Secret token | a random string, 16+ characters | Shared secret. Keep it out of your repository |

Tadween checks the endpoint with:

```
GET <endpoint>
Authorization: Bearer <token>
```

| Your reply | Result |
| --- | --- |
| `200 { "ok": true, "name"?: "...", "url"?: "...", "avatar"?: "https://..." }` | Channel connected. The channel name is `name` (or the Site URL hostname). The picture is `avatar`, or `<Site URL>/favicon.ico`, or the Tadween globe icon |
| `401` / `403` | Connection refused: "Your website rejected the secret token" |

## Publishing

```
POST <endpoint>
Authorization: Bearer <token>
Content-Type: application/json
X-Tadween-Timestamp: 1791415102
X-Tadween-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<raw body>" keyed with the token>
```

```json
{
  "external_id": "c1b0e8a4-...",
  "title": "My article",
  "body_md": "Hello **world**",
  "body_html": "<p>Hello <strong>world</strong></p>",
  "summary": "Short summary",
  "tags": ["news", "ai"],
  "cover_url": "https://.../uploads/cover.png",
  "video_url": null,
  "status": "published",
  "publish_at": "2026-10-08T09:00:00.000Z",
  "lang": "en",
  "dir": "ltr"
}
```

- `external_id` is the Tadween post id. It stays the same when the post is
  edited and published again, so **upsert by `external_id`**.
- `body_html` is the editor HTML. `body_md` is the same content converted to
  Markdown. Use whichever one your site renders.
- `cover_url` is the cover chosen in the post settings, or else the first
  picture of the post. `video_url` is the first video, or `null`. Both are
  absolute public URLs.
- `lang`/`dir` are `ar`/`rtl` when the title or text contains right-to-left
  script, and `en`/`ltr` otherwise.

Reply with:

| Your reply | What Tadween does |
| --- | --- |
| `201 { "ok": true, "url": "...", "id": "..." }` when created, `200` when updated (any 2xx) | Post marked published. `url` becomes the post link and `id` the release id |
| `422 { "ok": false, "error": "Title is required" }` (or another 4xx) | Post fails with your `error` text and is **not retried** |
| `401` / `403` (bad token or bad signature) | Post fails and the channel is flagged **reconnect needed** |
| `5xx`, or no answer within **15 s** | Retried up to 3 more times, 5 s apart. This is safe because you upsert by `external_id` |

## Unpublishing

When a user deletes a published post in Tadween (the calendar or the public
API), Tadween calls:

```
DELETE <endpoint>?external_id=<id>
Authorization: Bearer <token>
```

Reply `200 { "ok": true }`. `404` (for example `{ "ok": false, "error": "Already gone." }`)
also counts as success. Deleting the whole channel in Tadween does **not**
delete your articles. Unpublishing is best effort: the post is removed from
Tadween even if your site is down. A `401` flags the channel for reconnection.

## Verifying the signature

1. Read the raw request body as a string **before** parsing the JSON.
2. Reject requests whose `X-Tadween-Timestamp` is more than 5 minutes from now.
   This blocks replayed requests.
3. Compute `"sha256=" + hex(HMAC_SHA256(token, timestamp + "." + rawBody))`.
4. Compare it with `X-Tadween-Signature` using a constant-time comparison.

## Example receiver (Node 18+, no dependencies)

```js
import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN = process.env.TADWEEN_TOKEN;
const SITE = process.env.SITE_URL || 'http://localhost:3531';
const posts = new Map(); // external_id -> article (use your database)

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const safeEqual = (a, b) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function verifySignature(req, raw) {
  const ts = req.headers['x-tadween-timestamp'] || '';
  const sig = req.headers['x-tadween-signature'] || '';
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // 5 min
  const expected = 'sha256=' + createHmac('sha256', TOKEN).update(`${ts}.${raw}`).digest('hex');
  return safeEqual(sig, expected);
}

http.createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!safeEqual(req.headers.authorization || '', `Bearer ${TOKEN}`)) return send(res, 401, { ok: false, error: 'Bad token' });
  const url = new URL(req.url, SITE);

  if (req.method === 'GET') return send(res, 200, { ok: true, name: 'My blog', url: SITE });

  if (req.method === 'POST') {
    if (!verifySignature(req, raw)) return send(res, 401, { ok: false, error: 'Bad signature' });
    const a = JSON.parse(raw);
    if (!a.title) return send(res, 422, { ok: false, error: 'Title is required' });
    const existed = posts.has(a.external_id);
    const slug = existed ? posts.get(a.external_id).slug : a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    posts.set(a.external_id, { ...a, slug }); // upsert keyed by external_id
    return send(res, existed ? 200 : 201, { ok: true, id: slug, url: `${SITE}/blog/${slug}` });
  }

  if (req.method === 'DELETE') {
    if (!posts.delete(url.searchParams.get('external_id'))) return send(res, 404, { ok: false, error: 'Already gone.' });
    return send(res, 200, { ok: true });
  }
  send(res, 405, { ok: false, error: 'Method not allowed' });
}).listen(process.env.PORT || 3531);
```

Run it with `TADWEEN_TOKEN=<your token> node receiver.mjs`.

## Self-hosted Tadween and private networks

Outgoing requests go through Tadween's SSRF guard, which blocks private and
loopback addresses. A self-hosted install whose site runs on a private network
or on `localhost` must set `DISABLE_SSRF_PROTECTION=true`, the same as for
WordPress or Listmonk on a private network.
