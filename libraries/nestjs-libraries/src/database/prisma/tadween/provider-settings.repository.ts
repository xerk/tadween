import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProviderSettingsRepository {
  constructor(private _providers: PrismaRepository<'providerSetting'>) {}

  getAll() {
    return this._providers.model.providerSetting.findMany({
      select: {
        identifier: true,
        enabled: true,
        position: true,
      },
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
