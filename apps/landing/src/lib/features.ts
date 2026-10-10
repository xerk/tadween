import type { IconName } from '@/components/icons';
import { FEATURE_SLUGS, PATHS, featurePath, type FeatureSlug } from './routes';

// The facts about each tool page that don't change with the language: its icon and the
// pages it links to under "Related". The words are in content/features.<lang>.ts.

/** A tool page, or the AI agent page, as the menus and related lists name it. */
export type FeatureRef = FeatureSlug | 'agent';

export const FEATURES: Record<FeatureSlug, { icon: IconName; related: FeatureRef[] }> = {
  calendar: { icon: 'calendar-days', related: ['board', 'composer', 'agent'] },
  board: { icon: 'square-kanban', related: ['calendar', 'collaboration', 'composer'] },
  composer: { icon: 'pencil', related: ['media-library', 'signatures-sets', 'calendar'] },
  'media-library': { icon: 'folder-open', related: ['composer', 'agent', 'collaboration'] },
  analytics: { icon: 'chart-column', related: ['calendar', 'board', 'agent'] },
  collaboration: { icon: 'users', related: ['board', 'composer', 'calendar'] },
  'auto-post': { icon: 'rss', related: ['calendar', 'agent', 'signatures-sets'] },
  'signatures-sets': { icon: 'signature', related: ['composer', 'auto-post', 'collaboration'] },
};

/** Every page the Features menu lists, in order: the tools, then the agent. */
export const FEATURE_MENU: FeatureRef[] = [...FEATURE_SLUGS.slice(0, 3), 'agent', ...FEATURE_SLUGS.slice(3)];

export const featureRefPath = (ref: FeatureRef) => (ref === 'agent' ? PATHS.agent : featurePath(ref));
export const featureRefIcon = (ref: FeatureRef): IconName => (ref === 'agent' ? 'bot' : FEATURES[ref].icon);
