# Tadween Node.js SDK

The Node.js SDK for the [Tadween](https://tadween.app) public API.

```bash
npm install @tadween/node
```

## Usage

```typescript
import Tadween from '@tadween/node';

const tadween = new Tadween('your api key');

const channels = await tadween.integrations();
```

Your API key is in Tadween → Settings → API & MCP.

Requests go to `https://studio.tadween.app/api` by default. For a self-hosted instance, pass its API URL (the backend URL, without `/public/v1`) as the second argument, or set `TADWEEN_API_URL`:

```typescript
const tadween = new Tadween('your api key', 'https://your-instance.com/api');
```

The available methods are:
- `post(posts: CreatePostDto)` - Schedule a post
- `postList(filters: GetPostsDto)` - Get a list of posts
- `upload(file: Buffer, extension: string)` - Upload a file
- `integrations()` - Get a list of connected channels
- `deletePost(id: string)` - Delete a post by ID

Alternatively you can call the public API directly (`{API_URL}/public/v1/...`) with your API key in the `Authorization` header.

## Credits and license

Based on the Postiz Node.js SDK ([`@postiz/node`](https://www.npmjs.com/package/@postiz/node), [gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app)). AGPL-3.0, see [LICENSE](LICENSE).
