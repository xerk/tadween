import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class PlatformSettingsRepository {
  constructor(private _settings: PrismaRepository<'platformSetting'>) {}

  getAll() {
    return this._settings.model.platformSetting.findMany({
      select: {
        key: true,
        value: true,
      },
    });
  }

  set(key: string, value: Prisma.InputJsonValue, updatedBy: string) {
    return this._settings.model.platformSetting.upsert({
      where: { key },
      create: { key, value, updatedBy },
      update: { value, updatedBy },
      select: { key: true },
    });
  }
}
