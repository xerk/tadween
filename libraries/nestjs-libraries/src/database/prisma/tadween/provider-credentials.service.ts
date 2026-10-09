import {
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { ProviderCredentialsRepository } from '@gitroom/nestjs-libraries/database/prisma/tadween/provider-credentials.repository';
import { PROVIDER_CREDENTIALS } from '@gitroom/nestjs-libraries/database/prisma/tadween/tadween.defaults';

// Provider app credentials (client id / secret…) that a super admin can set from
// the console instead of the server's env vars.
//
// Every provider (upstream Postiz code, 28 files) reads its credentials from
// `process.env.<NAME>` when it builds an auth URL, refreshes a token or posts.
// Instead of rewriting those reads, this service is the one place that resolves
// a credential: console value (decrypted) first, then the deployment's env var,
// and it publishes the result on `process.env` for exactly the names declared in
// PROVIDER_CREDENTIALS. It runs in every process that loads DatabaseModule (the
// backend and the orchestrator's Temporal worker), at start-up and every
// REFRESH_MS, so a saved value reaches all processes without a restart and no
// workflow or activity changes.
//
// Values are encrypted with AuthService.fixedEncryption (keyed by JWT_SECRET,
// like organization API keys and third-party keys) and are never returned to the
// browser: status() only says whether a value is set, where it comes from and,
// for non-secret names, its last 4 characters.

const REFRESH_MS = 60_000;
const MAX_LENGTH = 4096;

// Read once when a module is imported, so a value saved later can't reach them.
// They stay env-only and the console says why.
const ENV_ONLY: Record<string, string> = {
  TELEGRAM_TOKEN: 'Read once when the server starts.',
  NEYNAR_CLIENT_ID: 'The web app reads it too, so it has to be an env var.',
};

const SECRET_NAME = /SECRET|TOKEN|KEY|MNEMONIC|PASSWORD/i;

// The deployment's own values, captured before this service writes anything.
let envSnapshot: Record<string, string | undefined> | null = null;

// Own keys only, so `constructor` & co. are never a provider.
export const hasCredentials = (identifier: string) =>
  Object.prototype.hasOwnProperty.call(PROVIDER_CREDENTIALS, identifier);

export const credentialNames = (identifier?: string) => {
  const specs =
    identifier === undefined
      ? Object.values(PROVIDER_CREDENTIALS)
      : hasCredentials(identifier)
      ? [PROVIDER_CREDENTIALS[identifier]]
      : [];
  return Array.from(
    new Set(specs.flatMap((s) => [...s.required, ...(s.anyOf || []).flat()]))
  );
};

const snapshot = () => {
  if (!envSnapshot) {
    envSnapshot = credentialNames().reduce(
      (all, name) => ({ ...all, [name]: process.env[name] || undefined }),
      {} as Record<string, string | undefined>
    );
  }
  return envSnapshot;
};

export interface CredentialStatus {
  name: string;
  set: boolean;
  source: 'console' | 'env' | null;
  // A console value exists but can't be decrypted (JWT_SECRET changed): the
  // env var is used until it is saved again.
  unreadable: boolean;
  // Looks like a secret (SECRET/TOKEN/KEY…): never shows last4, masked input.
  secret: boolean;
  last4: string | null;
  updatedAt: string | null;
  editable: boolean;
  envOnlyReason: string | null;
  usedBy: string[];
}

@Injectable()
export class ProviderCredentialsService
  implements OnModuleInit, OnModuleDestroy
{
  private _logger = new Logger(ProviderCredentialsService.name);
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _console = new Map<string, { value: string; updatedAt: Date }>();
  private _unreadable = new Set<string>();
  // Refreshes run one after another, so an older read can't win over a save.
  private _queue: Promise<void> = Promise.resolve();

  constructor(private _repository: ProviderCredentialsRepository) {
    snapshot();
  }

  async onModuleInit() {
    await this.refresh();
    this._timer = setInterval(() => {
      this.refresh().catch(() => undefined);
    }, REFRESH_MS);
    this._timer.unref?.();
  }

  onModuleDestroy() {
    if (this._timer) {
      clearInterval(this._timer);
    }
  }

  refresh() {
    this._queue = this._queue.catch(() => undefined).then(() => this.load());
    return this._queue;
  }

  // Never throws: a missing table or an undecryptable row leaves the env value.
  private async load() {
    let rows: { name: string; value: string; updatedAt: Date }[] = [];
    try {
      rows = await this._repository.getAll();
    } catch (e) {
      this._logger.warn('Provider credentials not loaded; using env vars only');
      return;
    }

    const names = credentialNames();
    const next = new Map<string, { value: string; updatedAt: Date }>();
    const unreadable = new Set<string>();
    for (const row of rows) {
      if (!names.includes(row.name) || ENV_ONLY[row.name]) {
        continue;
      }
      try {
        next.set(row.name, {
          value: AuthService.fixedDecryption(row.value),
          updatedAt: row.updatedAt,
        });
      } catch (e) {
        unreadable.add(row.name);
        this._logger.error(
          `Provider credential ${row.name} can't be decrypted (JWT_SECRET changed?); using the env var`
        );
      }
    }
    this._console = next;
    this._unreadable = unreadable;

    const env = snapshot();
    for (const name of names) {
      const value = next.get(name)?.value ?? env[name];
      if (value) {
        process.env[name] = value;
      } else {
        delete process.env[name];
      }
    }
  }

  status(identifier: string): CredentialStatus[] {
    const env = snapshot();
    return credentialNames(identifier).map((name) => {
      const own = this._console.get(name);
      const value = own?.value ?? env[name];
      return {
        name,
        set: !!value,
        source: own ? 'console' : env[name] ? 'env' : null,
        unreadable: this._unreadable.has(name),
        secret: SECRET_NAME.test(name),
        last4:
          value && !SECRET_NAME.test(name) && value.length > 4
            ? value.slice(-4)
            : null,
        updatedAt: own ? own.updatedAt.toISOString() : null,
        editable: !ENV_ONLY[name],
        envOnlyReason: ENV_ONLY[name] || null,
        usedBy: Object.keys(PROVIDER_CREDENTIALS).filter(
          (id) => id !== identifier && credentialNames(id).includes(name)
        ),
      };
    });
  }

  async save(
    identifier: string,
    values: Record<string, string | null>,
    adminId: string
  ) {
    if (!hasCredentials(identifier)) {
      throw new HttpException('This channel type has no app credentials', 400);
    }
    const allowed = credentialNames(identifier);
    const entries = Object.entries(values || {});
    if (!entries.length) {
      throw new HttpException('Nothing to save', 400);
    }
    for (const [name, value] of entries) {
      if (!allowed.includes(name)) {
        throw new HttpException(`${name} isn't a credential of ${identifier}`, 400);
      }
      if (ENV_ONLY[name]) {
        throw new HttpException(`${name} can only be set as an env var`, 400);
      }
      if (value !== null && typeof value !== 'string') {
        throw new HttpException(`${name} must be text`, 400);
      }
      if (value && value.trim().length > MAX_LENGTH) {
        throw new HttpException(`${name} is too long`, 400);
      }
    }

    await this._repository.saveAll(
      entries.map(([name, value]) => {
        const clean = (value || '').trim();
        return {
          name,
          value: clean ? AuthService.fixedEncryption(clean) : null,
        };
      }),
      adminId
    );

    await this.refresh();
    return this.status(identifier);
  }
}
