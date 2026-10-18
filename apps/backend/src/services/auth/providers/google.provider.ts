import { google } from 'googleapis';
import { HttpException } from '@nestjs/common';
import {
  AuthProvider,
  AuthProviderAbstract,
} from '@gitroom/backend/services/auth/providers.interface';

const defaultRedirect = () =>
  `${process.env.FRONTEND_URL}/integrations/social/youtube`;

// Sign-in can use its own Google OAuth client (GOOGLE_LOGIN_CLIENT_ID /
// GOOGLE_LOGIN_CLIENT_SECRET) and falls back to the YouTube channel client,
// which is what Postiz always used.
const credentials = () =>
  process.env.GOOGLE_LOGIN_CLIENT_ID && process.env.GOOGLE_LOGIN_CLIENT_SECRET
    ? {
        clientId: process.env.GOOGLE_LOGIN_CLIENT_ID,
        clientSecret: process.env.GOOGLE_LOGIN_CLIENT_SECRET,
      }
    : {
        clientId: process.env.YOUTUBE_CLIENT_ID,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
      };

const makeClient = (redirectUri: string) =>
  new google.auth.OAuth2({
    ...credentials(),
    redirectUri,
  });

// Tadween: the mobile app's native Google sign-in sends the ID token from
// authenticate(). Google access tokens are opaque, so a JWT here is an ID token.
const isIdToken = (token: string) =>
  /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token);

// ID tokens from the iOS app carry the iOS client id as audience, listed in
// GOOGLE_LOGIN_NATIVE_AUDIENCES next to the sign-in client
const audiences = () => [
  credentials().clientId!,
  ...(process.env.GOOGLE_LOGIN_NATIVE_AUDIENCES || '')
    .split(',')
    .map((p) => p.trim())
    .filter((f) => f),
];

// verifyIdToken checks the signature against Google's cached certs, the
// issuer, the expiry and the audience
const verifyIdToken = async (idToken: string) => {
  try {
    const ticket = await makeClient('').verifyIdToken({
      idToken,
      audience: audiences(),
    });
    const payload = ticket.getPayload();
    if (payload?.sub && payload.email && payload.email_verified) {
      return payload;
    }
  } catch (e) {}

  throw new HttpException('Google sign-in failed, please sign in again', 400);
};

const largePicture = (picture?: string | null) =>
  // Google serves the photo at 96px unless asked for a size
  picture?.replace(/=s\d+-c$/, '=s256-c') || undefined;

@AuthProvider({ provider: 'GOOGLE' })
export class GoogleProvider extends AuthProviderAbstract {
  override isConfigured() {
    const { clientId, clientSecret } = credentials();
    return !!clientId && !!clientSecret;
  }

  generateLink(query?: { redirect_uri?: string; state?: string }) {
    const redirectUri = query?.redirect_uri || defaultRedirect();
    return makeClient(redirectUri).generateAuthUrl({
      access_type: 'online',
      prompt: 'consent',
      state: query?.state || 'login',
      redirect_uri: redirectUri,
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
  }

  async getToken(code: string, redirectUri?: string) {
    // Tadween: the mobile app's native Google sign-in sends redirect_uri
    // "native" with either an ID token (one account prompt), which getUser
    // verifies, or, from older builds, a server auth code that Google only
    // accepts exchanged with an empty redirect_uri
    const native = redirectUri === 'native';
    if (native && isIdToken(code)) {
      await verifyIdToken(code);
      return code;
    }

    const client = makeClient(native ? '' : redirectUri || defaultRedirect());
    try {
      const { tokens } = native
        ? await client.getToken({ code, redirect_uri: '' })
        : await client.getToken(code);
      return tokens.access_token!;
    } catch (err: any) {
      // The code is single use and short lived (callback reloaded or too slow)
      if (err?.response?.data?.error === 'invalid_grant') {
        throw new HttpException(
          'Google sign-in expired, please sign in again',
          400
        );
      }
      throw err;
    }
  }

  async getUser(providerToken: string) {
    // the ID token is verified again because it is sent back from the client
    // as the providerToken during registration
    if (isIdToken(providerToken)) {
      const payload = await verifyIdToken(providerToken);
      return {
        id: payload.sub,
        email: payload.email!,
        name: payload.name || undefined,
        picture: largePicture(payload.picture),
      };
    }

    const client = makeClient(defaultRedirect());
    client.setCredentials({ access_token: providerToken });
    const { data } = await google
      .oauth2({ version: 'v2', auth: client })
      .userinfo.get();

    return {
      id: data.id!,
      email: data.email!,
      name: data.name || undefined,
      picture: largePicture(data.picture),
    };
  }
}
