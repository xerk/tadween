import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuthProviderAbstract } from '@gitroom/backend/services/auth/providers.interface';

@Injectable()
export class AuthProviderManager {
  constructor(private _moduleRef: ModuleRef) {}

  getProvider(provider: string): AuthProviderAbstract {
    const metadata =
      Reflect.getMetadata('auth-provider', AuthProviderAbstract) || [];

    const found = metadata.find(
      (m: any) => m.provider === provider
    );

    if (!found) {
      throw new Error(`Auth provider ${provider} not found`);
    }

    return this._moduleRef.get(found.target, { strict: false });
  }

  // { google: true, github: false, ... } for every registered provider.
  // Booleans only: client ids and secrets never leave the backend.
  getConfigured(): Record<string, boolean> {
    const metadata =
      Reflect.getMetadata('auth-provider', AuthProviderAbstract) || [];

    return metadata.reduce(
      (all: Record<string, boolean>, m: any) => ({
        ...all,
        [m.provider.toLowerCase()]: this.getProvider(m.provider).isConfigured(),
      }),
      {} as Record<string, boolean>
    );
  }
}
