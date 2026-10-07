import { Injectable } from '@nestjs/common';
import { PlatformSettingsRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/platform-settings.repository';
import {
  BRAND_LINK_KEYS,
  Branding,
  brandingDefaults,
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

  // What any visitor may read: no secrets, nothing per-user.
  async getPublicSettings() {
    const [mode, features, branding] = await Promise.all([
      this.getRegistrationMode(),
      this.getFeatures(),
      this.getBranding(),
    ]);
    return { registration: { mode }, features, branding };
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
