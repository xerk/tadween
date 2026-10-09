import { Injectable } from '@nestjs/common';

export abstract class AuthProviderAbstract {
  abstract generateLink(query?: any): Promise<string> | string;
  abstract getToken(code: string, redirectUri?: string): Promise<string>;
  abstract getUser(
    providerToken: string
  ): Promise<{ email: string; id: string }> | false;
  async postRegistration(
    providerToken: string,
    orgId: string
  ): Promise<void> {}
  // Whether the instance has what this provider needs to sign people in (its
  // env vars). Read by the public /instance/settings so the sign-in page only
  // shows buttons that work. Providers without configuration stay true.
  isConfigured(): boolean {
    return true;
  }
}

export interface AuthProviderParams {
  provider: string;
}

export function AuthProvider(params: AuthProviderParams) {
  return function (target: any) {
    Injectable()(target);

    const existingMetadata =
      Reflect.getMetadata('auth-provider', AuthProviderAbstract) || [];

    existingMetadata.push({ target, provider: params.provider });

    Reflect.defineMetadata(
      'auth-provider',
      existingMetadata,
      AuthProviderAbstract
    );
  };
}
