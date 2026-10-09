import {
  PrismaRepository,
  PrismaTransaction,
} from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

// Encrypted provider app credentials set from the super-admin console. Only the
// service decrypts `value`; nothing here returns it to a controller.
@Injectable()
export class ProviderCredentialsRepository {
  constructor(
    private _credentials: PrismaRepository<'providerCredential'>,
    private _transaction: PrismaTransaction
  ) {}

  getAll() {
    return this._credentials.model.providerCredential.findMany({
      select: { name: true, value: true, updatedAt: true },
    });
  }

  // One save from the console: every name is set (encrypted value) or removed
  // together, or none is.
  saveAll(
    changes: { name: string; value: string | null }[],
    updatedBy: string
  ) {
    return this._transaction.model.$transaction(async (tx) => {
      for (const { name, value } of changes) {
        if (value) {
          await tx.providerCredential.upsert({
            where: { name },
            create: { name, value, updatedBy },
            update: { value, updatedBy },
            select: { name: true },
          });
        } else {
          await tx.providerCredential.deleteMany({ where: { name } });
        }
      }
    });
  }
}
