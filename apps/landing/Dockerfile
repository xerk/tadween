# Tadween marketing site. Build from the repository root:
#   docker build -f apps/landing/Dockerfile -t tadween-landing \
#     --build-arg NEXT_PUBLIC_APP_URL=https://app.example.com \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://example.com .
#   docker run -p 4300:4300 tadween-landing
# NEXT_PUBLIC_* values are inlined at build time, so pass them as build args.

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.6.1 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/landing/package.json apps/landing/
# Only the landing app's dependencies; skip the monorepo's postinstall (Prisma).
RUN pnpm install --frozen-lockfile --filter tadween-landing --ignore-scripts
COPY apps/landing apps/landing
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MCP_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=1
RUN pnpm --filter tadween-landing build

FROM node:22-alpine
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=4300 HOSTNAME=0.0.0.0
WORKDIR /app
# Next's standalone output: the server plus only the files it traced.
COPY --from=build /repo/apps/landing/.next/standalone ./
COPY --from=build /repo/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=build /repo/apps/landing/public ./apps/landing/public
USER node
EXPOSE 4300
CMD ["node", "apps/landing/server.js"]
