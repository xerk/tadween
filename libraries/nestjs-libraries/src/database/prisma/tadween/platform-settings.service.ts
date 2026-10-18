import { Injectable } from '@nestjs/common';
import { PlatformSettingsRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.repository';
import {
  AccessSettings,
  BRAND_LINK_KEYS,
  Branding,
  brandingDefaults,
  DEFAULT_ACCESS,
  DEFAULT_FOUNDER_CAP,
  DEFAULT_YEARLY_DISCOUNT_PERCENT,
  FEATURE_KEYS,
  FeatureKey,
  featureDefaultsFromEnv,
  REGISTRATION_MODES,
  RegistrationMode,
  registrationModeFromEnv,
} from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';

const KEYS = {
  registration: 'registration',
  features: 'features',
  branding: 'branding',
  billing: 'billing',
  access: 'access',
} as const;

// Settings are read on hot paths (sign-up, every page load), so they are kept
// in memory for a few seconds. A save clears the cache on this process; other
// processes pick the change up when their copy expires.
const TTL_MS = 15_000;

@Injectable()
export class PlatformSettingsService {
  private _cache: { at: number; values: Record<string, any> } | null = null;

  constructor(private _repository: PlatformSettingsRepository) {}

  private async values(): Promise<Record<string, any>> {
    if (this._cache && Date.now() - this._cache.at < TTL_MS) {
      return this._cache.values;
    }
    try {
      const rows = await this._repository.getAll();
      const values = rows.reduce(
        (all, row) => ({ ...all, [row.key]: row.value }),
        {} as Record<string, any>
      );
      this._cache = { at: Date.now(), values };
      return values;
    } catch (e) {
      // Table not pushed yet (fresh deploy before `prisma db push`): behave like Postiz.
      return {};
    }
  }

  private async save(key: string, value: any, userId: string) {
    await this._repository.set(key, value, userId);
    this._cache = null;
  }

  async getRegistrationMode(): Promise<RegistrationMode> {
    const stored = (await this.values())[KEYS.registration]?.mode;
    return REGISTRATION_MODES.includes(stored) ? stored : registrationModeFromEnv();
  }

  async getFeatures(): Promise<Record<FeatureKey, boolean>> {
    const stored = (await this.values())[KEYS.features] || {};
    const defaults = featureDefaultsFromEnv();
    return FEATURE_KEYS.reduce(
      (all, key) => ({
        ...all,
        [key]: typeof stored[key] === 'boolean' ? stored[key] : defaults[key],
      }),
      {} as Record<FeatureKey, boolean>
    );
  }

  async getBranding(): Promise<Branding> {
    return {
      ...brandingDefaults(),
      ...((await this.values())[KEYS.branding] || {}),
    };
  }

  // Only what the admin actually saved (no defaults), for places where an
  // unsaved value must keep the existing env-driven behaviour (emails).
  async getSavedBranding(): Promise<Partial<Branding>> {
    return (await this.values())[KEYS.branding] || {};
  }

  // Percent off 12 monthly payments when paying yearly (default 17).
  async getYearlyDiscountPercent(): Promise<number> {
    const stored = (await this.values())[KEYS.billing]?.yearlyDiscountPercent;
    return Number.isInteger(stored) && stored >= 0 && stored <= 90
      ? stored
      : DEFAULT_YEARLY_DISCOUNT_PERCENT;
  }

  async setYearlyDiscountPercent(percent: number, userId: string) {
    return this.save(
      KEYS.billing,
      {
        ...((await this.values())[KEYS.billing] || {}),
        yearlyDiscountPercent: percent,
      },
      userId
    );
  }

  // The founder offer's window: open for the first `cap` paying workspaces
  // (counted from `startsAt`, all time when unset) and until `endsAt` when
  // set. cap 0 = no founder offer.
  async getFounderWindow(): Promise<{
    cap: number;
    startsAt: string | null;
    endsAt: string | null;
  }> {
    const stored = (await this.values())[KEYS.billing]?.founder || {};
    const date = (value: unknown) =>
      typeof value === 'string' && !isNaN(Date.parse(value)) ? value : null;
    return {
      cap:
        Number.isInteger(stored.cap) && stored.cap >= 0
          ? stored.cap
          : DEFAULT_FOUNDER_CAP,
      startsAt: date(stored.startsAt),
      endsAt: date(stored.endsAt),
    };
  }

  async setFounderWindow(
    founder: { cap: number; startsAt: string | null; endsAt: string | null },
    userId: string
  ) {
    return this.save(
      KEYS.billing,
      {
        ...((await this.values())[KEYS.billing] || {}),
        founder: {
          cap: founder.cap,
          startsAt: founder.startsAt || null,
          endsAt: founder.endsAt || null,
        },
      },
      userId
    );
  }

  // Payments switch, free plan, cap and early-access cutoff, with defaults for
  // anything not saved. Values that don't parse fall back to the default.
  async getAccess(): Promise<AccessSettings> {
    const stored = (await this.values())[KEYS.access] || {};
    const free = stored.freePlan || {};
    const count = (value: unknown, fallback: number, min = 0) =>
      Number.isInteger(value) && (value as number) >= min
        ? (value as number)
        : fallback;
    return {
      payments:
        typeof stored.payments === 'boolean'
          ? stored.payments
          : DEFAULT_ACCESS.payments,
      freePlan: {
        enabled:
          typeof free.enabled === 'boolean'
            ? free.enabled
            : DEFAULT_ACCESS.freePlan.enabled,
        channels: count(free.channels, DEFAULT_ACCESS.freePlan.channels),
        members: count(free.members, DEFAULT_ACCESS.freePlan.members, 1),
        aiCredits: count(free.aiCredits, DEFAULT_ACCESS.freePlan.aiCredits),
      },
      cap:
        stored.cap === null
          ? null
          : count(stored.cap, DEFAULT_ACCESS.cap as number),
      cutoff:
        typeof stored.cutoff === 'string' && !isNaN(Date.parse(stored.cutoff))
          ? stored.cutoff
          : null,
    };
  }

  async setAccess(access: AccessSettings, userId: string) {
    return this.save(
      KEYS.access,
      {
        ...((await this.values())[KEYS.access] || {}),
        payments: access.payments,
        freePlan: {
          enabled: access.freePlan.enabled,
          channels: access.freePlan.channels,
          members: access.freePlan.members,
          aiCredits: access.freePlan.aiCredits,
        },
        cap: access.cap,
        cutoff: access.cutoff,
      },
      userId
    );
  }

  // Stamps the early-access cutoff the first time any process boots with this
  // setting, so every workspace that exists at deploy time keeps full access.
  // Never overwrites a saved setting (several processes boot at once).
  async ensureAccessCutoff() {
    const stored = (await this.values())[KEYS.access];
    if (stored?.cutoff) {
      return;
    }
    const cutoff = new Date().toISOString();
    if (stored) {
      // saved from /admin before any boot stamped it
      return this.save(KEYS.access, { ...stored, cutoff }, 'system');
    }
    await this._repository.createIfMissing(KEYS.access, { cutoff }, 'system');
    this._cache = null;
  }

  // What any visitor may read: no secrets, nothing per-user. `ai.available`
  // only says whether an OpenAI key is set, so the app can hide the assistant
  // instead of mounting it against a runtime that can't answer.
  async getPublicSettings() {
    const [mode, features, branding] = await Promise.all([
      this.getRegistrationMode(),
      this.getFeatures(),
      this.getBranding(),
    ]);
    return {
      registration: { mode },
      features,
      branding,
      ai: { available: !!process.env.OPENAI_API_KEY },
    };
  }

  setRegistrationMode(mode: RegistrationMode, userId: string) {
    return this.save(KEYS.registration, { mode }, userId);
  }

  async setFeatures(features: Record<string, boolean>, userId: string) {
    const current = await this.getFeatures();
    const next = FEATURE_KEYS.reduce(
      (all, key) => ({
        ...all,
        [key]: typeof features[key] === 'boolean' ? features[key] : current[key],
      }),
      {} as Record<FeatureKey, boolean>
    );
    return this.save(KEYS.features, next, userId);
  }

  setBranding(branding: Branding, userId: string) {
    return this.save(
      KEYS.branding,
      {
        instanceName: branding.instanceName,
        supportEmail: branding.supportEmail || '',
        defaultLanguage: branding.defaultLanguage,
        defaultTimezone: branding.defaultTimezone || '',
        ...BRAND_LINK_KEYS.reduce(
          (all, key) => ({ ...all, [key]: (branding[key] || '').trim() }),
          {} as Record<string, string>
        ),
      },
      userId
    );
  }
}
