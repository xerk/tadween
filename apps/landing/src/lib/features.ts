import type { IconName } from '@/components/icons';
import { FEATURE_SLUGS, PATHS, featurePath, type FeatureSlug } from './routes';
import type { ShotId } from './shots';

// The facts about each tool that don't change with the language: its icon, and the one
// screenshot its section on /features shows (the smaller tools have none, only the icon).
// The words are in content/features.<lang>.ts.

/** A tool, or the AI agent, as the cards name it. */
export type FeatureRef = FeatureSlug | 'agent';

export const FEATURES: Record<FeatureSlug, { icon: IconName; shot?: ShotId }> = {
  calendar: { icon: 'calendar-days', shot: 'calendar-month' },
  board: { icon: 'square-kanban', shot: 'board' },
  composer: { icon: 'pencil', shot: 'composer' },
  'media-library': { icon: 'folder-open' },
  analytics: { icon: 'chart-column', shot: 'analytics' },
  collaboration: { icon: 'users' },
  'auto-post': { icon: 'rss' },
  'signatures-sets': { icon: 'signature' },
};

/** Every card the home page lists, in order: the tools, then the agent. */
export const FEATURE_MENU: FeatureRef[] = [...FEATURE_SLUGS.slice(0, 3), 'agent', ...FEATURE_SLUGS.slice(3)];

export const featureRefPath = (ref: FeatureRef) => (ref === 'agent' ? PATHS.agent : featurePath(ref));
export const featureRefIcon = (ref: FeatureRef): IconName => (ref === 'agent' ? 'bot' : FEATURES[ref].icon);
