import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

// Encrypted provider app credentials set from the super-admin console. Only the
// service decrypts `value`; nothing here returns it to a controller.
@Injectable()
export class ProviderCredentialsRepository {
  constructor(private _credentials: PrismaRepository<'providerCredential'>) {}

  getAll() {
    return this._credentials.model.providerCredential.findMany({
      select: { name: true, value: true, updatedAt: true },
    });
  }

  upsert(name: string, value: string, updatedBy: string) {
    return this._credentials.model.providerCredential.upsert({
      where: { name },
      create: { name, value, updatedBy },
      update: { value, updatedBy },
      select: { name: true },
    });
  }

  remove(name: string) {
    return this._credentials.model.providerCredential.deleteMany({
      where: { name },
    });
  }
}
