# Tadween marketing site

The public site for Tadween, in English and in Arabic (under `/ar`, right to left): the landing page (`/`), features (`/features`), one SEO page per network (`/channels`, `/channels/<slug>`), the AI agent (`/ai-agent`), developers (`/developers`, the public API, MCP and webhooks) and pricing (`/pricing`). It's a separate Next.js app (Next 16, App Router) so that syncing upstream Postiz into `apps/frontend` never touches it.

The design is ported from the Tadween design system: tokens, the landing sections and copy, the LinkedIn preview and pricing table, and the motion engine (a three.js 3D hero, GSAP scroll effects and a pinned write → preview → schedule section).

## Run it

From the repository root:

```bash
pnpm install
pnpm --filter tadween-landing dev     # http://localhost:4300
pnpm --filter tadween-landing build
pnpm --filter tadween-landing start   # serves the build on :4300
```

## Environment

All of these are read at build time (`NEXT_PUBLIC_*` values are inlined into the bundle), so set them before `build`.

| Variable | Default | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:4200` | The Tadween app. Sign-up buttons go to `${APP_URL}/auth` and sign-in to `${APP_URL}/auth/login`. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:4300` | Where this site is served. Used for canonical URLs, hreflang, the sitemap and Open Graph. |
| `NEXT_PUBLIC_API_URL` | unset | The Tadween API. When set, pricing reads plans from `GET ${API_URL}/instance/settings` (added in PR #4) at build time and refreshes them at most hourly. If it's unset, unreachable or has no plans saved, the site uses its built-in placeholder plans. The developer and agent pages also use it for the MCP and API URLs in their examples (a placeholder otherwise). |
| `NEXT_PUBLIC_MCP_URL` | unset | Where the MCP server is served, when it isn't the API host (the app's `MCP_URL`). The agent and AI client pages build `/mcp` and `/mcp-oauth-dynamic` from it, falling back to `NEXT_PUBLIC_API_URL`. |
| `NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS` | unset | Set to `1` to show the home page's social-proof section with its marked placeholder slots (for previews). Leave it unset in production until real customer logos and quotes replace the placeholders in `src/content`. |

All prices are placeholders, and the page says so. The API returns USD prices only, so EGP amounts always come from the placeholders in `src/lib/plans.ts`.

## Deploy

**Vercel.** Create a project with the root directory set to `apps/landing`. Vercel detects Next.js and pnpm. Add the environment variables above and deploy. Every page is static (or ISR when `NEXT_PUBLIC_API_URL` is set), so it can be served from the CDN.

**Docker.** Build from the repository root. Pass the variables as build args, because they are inlined at build time:

```bash
docker build -f apps/landing/Dockerfile -t tadween-landing \
  --build-arg NEXT_PUBLIC_APP_URL=https://app.example.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://example.com \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .
docker run -p 4300:4300 tadween-landing
```

The image installs only this app's dependencies (no Prisma, no other workspace apps), builds with `BUILD_STANDALONE=1` (Next's `output: 'standalone'`) and runs the standalone server on port 4300.

## Where things are

- `src/content/en.ts`, `src/content/ar.ts`: all copy.
- `src/lib/channels.ts`: the networks that get a page, with facts taken from the app's provider code (character limits from `maxLength()`, comment support, editor type). `src/content/channels.en.ts` and `channels.ar.ts` hold each page's words. To add a network, add a row to `CHANNELS` and an entry in both copy files; the route, sitemap entry, Open Graph card and related links follow.
- `src/lib/aiClients.ts`: the AI clients that get a page at the top level (`/chatgpt`, `/ar/claude-code`), each with its connection methods, the exact snippets and the vendor docs that back them. `src/content/aiClients.en.ts` and `aiClients.ar.ts` hold the words, one line per step. A client is listed only when its vendor documents adding your own remote MCP server; `docs/tadween/ai-client-pages-notes.md` has the checks and the clients left out. The build fails if a slug matches another route (a folder or file in `src/app` or `public`, or a name in `RESERVED_SEGMENTS`) or if a copy file’s steps don’t match the snippets; the checks are in `src/lib/clientRoutes.ts`, which only the `[client]` routes import.
- `src/lib/routes.ts`, `src/lib/seo.ts`, `src/lib/jsonld.ts`: paths, per-page metadata (canonical and hreflang), and schema.org data (Organization, SoftwareApplication, Product with offers, FAQPage, BreadcrumbList).
- `src/app/og/[card]/route.tsx`: Open Graph images, generated at build time. They're in English for both languages, because the image renderer can't shape Arabic. The Arabic is written for Egyptian and Gulf readers in Modern Standard Arabic, not translated word for word.
- `src/components/sections.tsx`: hero, the four-step flow, social proof (placeholders), features, channels, agent, steps, Arabic, FAQ, CTA and footer. These are server components. `pages.tsx` composes them into pages.
- `src/components/PricingTable.tsx`: tiers, monthly or yearly, EGP or USD, the compare table and the FAQ.
- `src/lib/motion/engine.ts`: GSAP word reveals, the pinned flow, reveals, tilt cards, the Arabic card flip and the CTA clip-path. It loads after hydration with a dynamic import.
- `src/lib/motion/hero3d.ts`: the three.js week of tiles (one `InstancedMesh`). It's a separate chunk. A CSS poster of the same grid shows until the first frame is drawn, and stays if WebGL is unavailable. The scene renders only while it's on screen and the tab is visible, with the DPR capped at 1.75. Its colours come from the theme tokens.
- `src/app/tokens.css`, `src/app/landing.css`: design tokens (light and dark) and the ported component styles.

Light and dark follow `prefers-color-scheme` until the visitor uses the toggle, which is then remembered. `prefers-reduced-motion` gets the finished states with no scroll effects.

`@opentelemetry/api` is a dev dependency only to pin Next's optional peer to the version the rest of the workspace resolves. Without it, adding this app would re-resolve that peer across the lockfile.

## Licence

Tadween is built on [Postiz](https://github.com/gitroomhq/postiz-app) and is open source under AGPL-3.0. Keep the credit in the footer.
