import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { ManifestV3Export } from '@crxjs/vite-plugin';
import { defineConfig, BuildOptions } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { stripDevIcons, crxI18n } from './custom-vite-plugins';
import manifest from './manifest.json';
import devManifest from './manifest.dev.json';
import pkg from './package.json';
import { providers } from './src/providers/provider.registry';

const isDev = process.env.NODE_ENV === 'development';
// set this flag to true, if you want localization support
const localize = false;

const merge = isDev ? devManifest : ({} as ManifestV3Export);

// The Tadween app origin this build talks to (FRONTEND_URL), shared by
// host_permissions and externally_connectable
const frontendUrl: string =
  import.meta.env?.FRONTEND_URL || process?.env?.FRONTEND_URL || '';
const frontendOrigin = (() => {
  try {
    return frontendUrl ? new URL(frontendUrl).origin : '';
  } catch (e) {
    return '';
  }
})();

export const baseManifest = {
  ...manifest,
  host_permissions: [
    frontendUrl + '/*',
    (import.meta.env?.NEXT_PUBLIC_BACKEND_URL || process?.env?.NEXT_PUBLIC_BACKEND_URL || '') + '/*',
    ...providers.map(p => p.hostPermission)
  ],
  permissions: [...(manifest.permissions || [])],
  // Tadween: only this instance's app may talk to the extension (was *.postiz.com)
  externally_connectable: {
    matches: [
      ...manifest.externally_connectable.matches,
      ...(frontendOrigin ? [frontendOrigin + '/*'] : []),
    ],
  },
  version: pkg.version,
  ...merge,
  ...(localize
    ? {
        name: '__MSG_extName__',
        description: '__MSG_extDescription__',
        default_locale: 'en',
      }
    : {}),
} as ManifestV3Export;

export const baseBuildOptions: BuildOptions = {
  sourcemap: isDev,
  emptyOutDir: !isDev,
};

export default defineConfig({
  envPrefix: ['NEXT_PUBLIC_', 'FRONTEND_URL', 'NEXT_PUBLIC_BACKEND_URL'],
  plugins: [
    tsconfigPaths(),
    react(),
    stripDevIcons(isDev),
    crxI18n({ localize, src: './src/locales' }),
  ],
  publicDir: resolve(__dirname, 'public'),
});
