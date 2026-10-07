import { Injectable } from '@nestjs/common';
import { ProviderSettingsRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-settings.repository';
import {
  IntegrationManager,
  socialIntegrationList,
} from '@gitroom/nestjs-libraries/integrations/integration.manager';
import {
  credentialStatus,
  PROVIDER_PRIORITY,
} from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';

const TTL_MS = 15_000;

type Row = { identifier: string; enabled: boolean; position: number };

@Injectable()
export class ProviderSettingsService {
  private _cache: { at: number; rows: Row[] } | null = null;

  constructor(
    private _repository: ProviderSettingsRepository,
    private _integrationManager: IntegrationManager
  ) {}

  private async rows(): Promise<Row[]> {
    if (this._cache && Date.now() - this._cache.at < TTL_MS) {
      return this._cache.rows;
    }
    try {
      const rows = await this._repository.getAll();
      this._cache = { at: Date.now(), rows };
      return rows;
    } catch (e) {
      // Table not pushed yet: every provider enabled, Postiz order.
      return [];
    }
  }

  // Default position when the admin has not saved an order: LinkedIn first,
  // then Postiz's own order.
  private defaultPosition(identifier: string) {
    const priority = PROVIDER_PRIORITY.indexOf(identifier);
    if (priority > -1) {
      return priority;
    }
    return (
      PROVIDER_PRIORITY.length +
      socialIntegrationList.findIndex((p) => p.identifier === identifier)
    );
  }

  private async resolved() {
    const rows = await this.rows();
    return socialIntegrationList
      .map((p) => {
        const row = rows.find((r) => r.identifier === p.identifier);
        return {
          identifier: p.identifier,
          name: p.name,
          enabled: row ? row.enabled : true,
          position: row ? row.position : this.defaultPosition(p.identifier),
          saved: !!row,
        };
      })
      .sort((a, b) => a.position - b.position);
  }

  // For the admin console: no secret values, only env var names and whether they are set.
  async getAdminProviders() {
    return (await this.resolved()).map((p) => ({
      ...p,
      hiddenByEnv: this._integrationManager.isHiddenProvider(p.identifier),
      credentials: credentialStatus(p.identifier),
    }));
  }

  async isEnabled(identifier: string) {
    const row = (await this.rows()).find((r) => r.identifier === identifier);
    return row ? row.enabled : true;
  }

  // Applied to the "Add channel" list: drop disabled providers and order the rest.
  async apply<T extends { identifier: string }>(list: T[]): Promise<T[]> {
    const resolved = await this.resolved();
    const position = (identifier: string) =>
      resolved.find((r) => r.identifier === identifier)?.position ?? 10_000;
    const enabled = (identifier: string) =>
      resolved.find((r) => r.identifier === identifier)?.enabled ?? true;

    return list
      .filter((p) => enabled(p.identifier))
      .sort((a, b) => position(a.identifier) - position(b.identifier));
  }

  async save(providers: Row[]) {
    const known = socialIntegrationList.map((p) => p.identifier);
    await this._repository.saveAll(
      providers.filter((p) => known.includes(p.identifier))
    );
    this._cache = null;
    return this.getAdminProviders();
  }
}
