import fs from 'fs';
import { resolve } from 'path';
import type { PluginOption } from 'vite';

// Match patterns of the app pages allowed to talk to the extension
// (externally_connectable). EXTENSION_ALLOWED_ORIGINS is a comma separated list
// of match patterns (e.g. "https://app.example.com/*,https://*.example.com/*");
// without it, the origin of FRONTEND_URL; without both, localhost only.
export function allowedOrigins(): string[] {
  const list = (process.env.EXTENSION_ALLOWED_ORIGINS || '')
    .split(',')
    .map((match) => match.trim())
    .filter(Boolean);
  if (list.length) {
    return list;
  }

  try {
    if (process.env.FRONTEND_URL) {
      return [new URL(process.env.FRONTEND_URL).origin + '/*'];
    }
  } catch (e) {
    // invalid FRONTEND_URL, fall back to localhost
  }

  return ['http://localhost/*', 'https://localhost/*'];
}

// plugin to write the store manifest (manifest.json + allowed origins +
// package version) into the production build
export function emitManifest(manifest: Record<string, any>): PluginOption {
  return {
    name: 'emit-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(
          {
            ...manifest,
            externally_connectable: { matches: allowedOrigins() },
          },
          null,
          2
        ),
      });
    },
  };
}

// plugin to remove dev icons from prod build
export function stripDevIcons(isDev: boolean) {
  if (isDev) return null;

  return {
    name: 'strip-dev-icons',
    resolveId(source: string) {
      return source === 'virtual-module' ? source : null;
    },
    renderStart(outputOptions: any, inputOptions: any) {
      const outDir = outputOptions.dir;
      fs.rm(resolve(outDir, 'dev-icon-32.png'), () =>
        console.log(`Deleted dev-icon-32.png from prod build`)
      );
      fs.rm(resolve(outDir, 'dev-icon-128.png'), () =>
        console.log(`Deleted dev-icon-128.png from prod build`)
      );
    },
  };
}

// plugin to support i18n
export function crxI18n(options: {
  localize: boolean;
  src: string;
}): PluginOption {
  if (!options.localize) return null;

  const getJsonFiles = (dir: string): Array<string> => {
    const files = fs.readdirSync(dir, { recursive: true }) as string[];
    return files.filter((file) => !!file && file.endsWith('.json'));
  };
  const entry = resolve(__dirname, options.src);
  const localeFiles = getJsonFiles(entry);
  const files = localeFiles.map((file) => {
    return {
      id: '',
      fileName: file,
      source: fs.readFileSync(resolve(entry, file)),
    };
  });
  return {
    name: 'crx-i18n',
    enforce: 'pre',
    buildStart: {
      order: 'post',
      handler() {
        files.forEach((file) => {
          const refId = this.emitFile({
            type: 'asset',
            source: file.source,
            fileName: '_locales/' + file.fileName,
          });
          file.id = refId;
        });
      },
    },
  };
}
