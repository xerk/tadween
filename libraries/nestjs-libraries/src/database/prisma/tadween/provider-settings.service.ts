import { Injectable } from '@nestjs/common';
import { ProviderSettingsRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-settings.repository';
import {
  IntegrationManager,
  socialIntegrationList,
} from '@gitroom/nestjs-libraries/integrations/integration.manager';
import {
  credentialStatus,
  focusProviders,
} from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';
import { ProviderCredentialsService } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-credentials.service';

const TTL_MS = 15_000;

// Returned (400) when someone tries to add a channel type customers can't add.
export const PROVIDER_NOT_AVAILABLE =
  'This channel type is not available. Ask your administrator to turn it on.';

type Row = { identifier: string; enabled: boolean; position: number };

@Injectable()
export class ProviderSettingsService {
  private _cache: { at: number; rows: Row[] } | null = null;

  constructor(
    private _repository: ProviderSettingsRepository,
    private _integrationManager: IntegrationManager,
    private _credentials: ProviderCredentialsService
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
      // Table not pushed yet: the focus networks, Postiz order.
      return [];
    }
  }

  // A saved row wins; without one (never saved, or a provider added after the
  // last save) only the focus networks are on.
  private enabledOf(identifier: string, rows: Row[]) {
    const row = rows.find((r) => r.identifier === identifier);
    return row ? row.enabled : focusProviders().includes(identifier);
  }

  // Default position when the admin has not saved an order: the focus
  // networks in their listed order, then Postiz's own order.
  private defaultPosition(identifier: string) {
    const focus = focusProviders();
    const priority = focus.indexOf(identifier);
    if (priority > -1) {
      return priority;
    }
    return (
      focus.length +
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
          enabled: this.enabledOf(p.identifier, rows),
          position: row ? row.position : this.defaultPosition(p.identifier),
          saved: !!row,
        };
      })
      .sort((a, b) => a.position - b.position);
  }

  // Customers can add a provider only when it is on, its app keys are set and
  // HIDDEN_PROVIDERS doesn't list it. Channels already connected are never
  // checked against this: they keep publishing, refreshing and reconnecting.
  private available(identifier: string, enabled: boolean) {
    return (
      enabled &&
      this._credentials.isConfigured(identifier) &&
      !this._integrationManager.isHiddenProvider(identifier)
    );
  }

  // For the admin console: no secret values, only env var names, whether they
  // are set and where from (console or env).
  async getAdminProviders() {
    const focus = focusProviders();
    return (await this.resolved()).map((p) => ({
      ...p,
      focus: focus.includes(p.identifier),
      defaultPosition: this.defaultPosition(p.identifier),
      hiddenByEnv: this._integrationManager.isHiddenProvider(p.identifier),
      credentials: {
        ...credentialStatus(p.identifier),
        configured: this._credentials.isConfigured(p.identifier),
        fields: this._credentials.status(p.identifier),
      },
    }));
  }

  async isAvailable(identifier: string) {
    return this.available(
      identifier,
      this.enabledOf(identifier, await this.rows())
    );
  }

  // The one connect gate (auth URL and OAuth callback, app and public API).
  // A provider customers can add always passes. Any other provider passes only
  // for a channel this workspace already has:
  // - `refresh`: a reconnect of that channel (it must exist in this workspace,
  //   on this provider or one that MIGRATE_PROVIDERS moves to it);
  // - `accountId` (callback): the account of an existing channel, i.e. its
  //   credentials entered again;
  // - neither (auth URL): the workspace has a channel of this type, so its
  //   credentials can be entered again; the callback then checks the account.
  async canConnect(
    org: string,
    identifier: string,
    refresh?: string,
    accountId?: string
  ) {
    if (await this.isAvailable(identifier)) {
      return true;
    }
    if (refresh) {
      return !!(await this._repository.findChannel(
        org,
        [identifier, ...this._integrationManager.getMigrationSources(identifier)],
        refresh
      ));
    }
    return !!(await this._repository.findChannel(
      org,
      [identifier],
      accountId,
      true
    ));
  }

  // Applied to the "Add channel" list: drop providers customers can't add and
  // order the rest.
  async apply<T extends { identifier: string }>(list: T[]): Promise<T[]> {
    const resolved = await this.resolved();
    const position = (identifier: string) =>
      resolved.find((r) => r.identifier === identifier)?.position ?? 10_000;
    const rows = await this.rows();

    return list
      .filter((p) =>
        this.available(p.identifier, this.enabledOf(p.identifier, rows))
      )
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
