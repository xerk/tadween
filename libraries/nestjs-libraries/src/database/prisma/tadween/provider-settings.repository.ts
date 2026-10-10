import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProviderSettingsRepository {
  constructor(
    private _providers: PrismaRepository<'providerSetting'>,
    private _integration: PrismaRepository<'integration'>
  ) {}

  getAll() {
    return this._providers.model.providerSetting.findMany({
      select: {
        identifier: true,
        enabled: true,
        position: true,
      },
    });
  }

  // A live channel of one of `providers` in this workspace, optionally a
  // given account (internalId). `settled` skips a connect that stopped before
  // its page was picked (inBetweenSteps).
  findChannel(
    org: string,
    providers: string[],
    internalId?: string,
    settled = false
  ) {
    return this._integration.model.integration.findFirst({
      where: {
        organizationId: org,
        deletedAt: null,
        providerIdentifier: { in: providers },
        ...(internalId ? { internalId } : {}),
        ...(settled ? { inBetweenSteps: false } : {}),
      },
      select: { id: true },
    });
  }

  async saveAll(
    providers: { identifier: string; enabled: boolean; position: number }[]
  ) {
    for (const p of providers) {
      await this._providers.model.providerSetting.upsert({
        where: { identifier: p.identifier },
        create: p,
        update: { enabled: p.enabled, position: p.position },
        select: { identifier: true },
      });
    }
  }
}
