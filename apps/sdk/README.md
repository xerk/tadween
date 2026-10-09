# Postiz NodeJS SDK

This is the NodeJS SDK for the Tadween public API (built on the Postiz SDK).

You can start by installing the package:

```bash
npm install @postiz/node
```

## Usage
```typescript
import Postiz from '@postiz/node';
const postiz = new Postiz('your api key', 'https://your-instance/api'); // or set POSTIZ_API_URL
```

The available methods are:
- `post(posts: CreatePostDto)` - Schedule a post
- `postList(filters: GetPostsDto)` - Get a list of posts
- `upload(file: Buffer, extension: string)` - Upload a file
- `integrations()` - Get a list of connected channels
- `deletePost(id: string)` - Delete a post by ID

Alternatively you can call the public API directly (`{API_URL}/public/v1/...`) with your API key in the `Authorization` header.