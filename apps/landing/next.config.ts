import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The pnpm workspace hoists node_modules to the repo root; trace files from there.
  outputFileTracingRoot: path.join(here, '../..'),
  turbopack: { root: path.join(here, '../..') },
  // `BUILD_STANDALONE=1` emits .next/standalone for the Docker image.
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,
  // Next's own @swc/helpers sits nested under next/ in the hoisted workspace, and file
  // tracing misses its ESM build; include it so the standalone server starts.
  outputFileTracingIncludes: { '/*': ['../../node_modules/next/node_modules/@swc/helpers/**/*'] },
  // The developers page was retired; old links land on the features overview.
  async redirects() {
    return [
      { source: '/developers', destination: '/features', permanent: true },
      { source: '/ar/developers', destination: '/ar/features', permanent: true },
    ];
  },
  experimental: {
    // Two root layouts (English and Arabic) need one 404 for unmatched URLs.
    globalNotFound: true,
  },
};

export default nextConfig;
