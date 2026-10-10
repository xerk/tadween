import { MORE_AI_CLIENTS } from './aiClients';
import { OTHER_CHANNELS } from './channels';
import { FEATURE_SLUGS, PATHS, channelPath, clientPath, featurePath } from './routes';

// Permanent redirects for pages the site no longer has, built from the same lists that
// replaced them so they can't drift: each tool page is now a section of /features, the
// networks without a page are listed on /channels, and the AI clients without a page are
// named on /ai-agent. next.config.ts imports this file, so keep its imports relative.

const RETIRED: { source: string; destination: string }[] = [
  // The developers page was retired before; old links land on the features overview.
  { source: '/developers', destination: PATHS.features },
  ...FEATURE_SLUGS.map((slug) => ({ source: `${PATHS.features}/${slug}`, destination: featurePath(slug) })),
  ...OTHER_CHANNELS.map((c) => ({ source: channelPath(c.slug), destination: `${PATHS.channels}#${c.slug}` })),
  ...MORE_AI_CLIENTS.map((c) => ({ source: clientPath(c.slug), destination: `${PATHS.agent}#clients` })),
];

/** Every retired URL in both languages, as 308s. */
export const retiredRedirects = () =>
  RETIRED.flatMap(({ source, destination }) => [
    { source, destination, permanent: true },
    { source: `/ar${source}`, destination: `/ar${destination}`, permanent: true },
  ]);
