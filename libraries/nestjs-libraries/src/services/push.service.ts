import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { JWT } from 'google-auth-library';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// FCM answers in well under a second; never let it hold up a publish
const FCM_TIMEOUT_MS = 10_000;

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

// Tadween: push notifications to the mobile app through Firebase Cloud
// Messaging (HTTP v1). Off unless FIREBASE_SERVICE_ACCOUNT holds the Firebase
// admin service-account key: its JSON, the JSON in base64, or a path to the file.
@Injectable()
export class PushService {
  private readonly _logger = new Logger(PushService.name);
  private readonly _account = this.readAccount();
  private readonly _client = this._account
    ? new JWT({
        email: this._account.client_email,
        key: this._account.private_key,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      })
    : undefined;

  enabled() {
    return !!this._client;
  }

  // Sends the message to every token. Never throws: a push that can't go out
  // only gets logged. Returns the tokens FCM no longer knows (app uninstalled,
  // token rotated), so the caller can forget them.
  async send(tokens: string[], message: PushMessage): Promise<string[]> {
    if (!this._client || !this._account || !tokens.length) {
      return [];
    }

    let accessToken: string | null | undefined;
    try {
      accessToken = (
        await Promise.race([
          this._client.getAccessToken(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('timed out')),
              FCM_TIMEOUT_MS
            ).unref()
          ),
        ])
      ).token;
    } catch (err) {
      this._logger.error(`FCM auth failed: ${(err as Error).message}`);
      return [];
    }
    if (!accessToken) {
      return [];
    }

    const url = `https://fcm.googleapis.com/v1/projects/${this._account.project_id}/messages:send`;
    const gone: string[] = [];
    await Promise.all(
      tokens.map(async (token) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(FCM_TIMEOUT_MS),
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: message.title, body: message.body },
                data: message.data || {},
                android: { priority: 'high' },
                apns: { payload: { aps: { sound: 'default' } } },
              },
            }),
          });
          if (res.ok) {
            return;
          }
          const text = await res.text();
          if (
            res.status === 404 ||
            text.includes('UNREGISTERED') ||
            (res.status === 400 &&
              text.includes('not a valid FCM registration token'))
          ) {
            gone.push(token);
            return;
          }
          this._logger.warn(
            `FCM send failed (${res.status}): ${text.slice(0, 300)}`
          );
        } catch (err) {
          this._logger.warn(`FCM send failed: ${(err as Error).message}`);
        }
      })
    );
    return gone;
  }

  private readAccount(): ServiceAccount | undefined {
    const value = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    if (!value) {
      return undefined;
    }
    try {
      const json = value.startsWith('{')
        ? value
        : existsSync(value)
        ? readFileSync(value, 'utf8')
        : Buffer.from(value, 'base64').toString('utf8');
      const account = JSON.parse(json) as ServiceAccount;
      if (
        !account.project_id ||
        !account.client_email ||
        !account.private_key
      ) {
        throw new Error('missing project_id, client_email or private_key');
      }
      return account;
    } catch (err) {
      this._logger.error(
        `FIREBASE_SERVICE_ACCOUNT is set but unreadable, push is off: ${
          (err as Error).message
        }`
      );
      return undefined;
    }
  }
}
