import { Agent, buildConnector } from 'undici';
import axios, { AxiosInstance } from 'axios';
import dns from 'node:dns';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { isBlockedIp } from './webhook.url.validator';

// Pins DNS resolution: every resolved IP is checked with `isBlockedIp` and
// the caller connects to that same set. Closes the TOCTOU window
// `isSafePublicHttpsUrl` alone leaves open (see GHSA-f7jj-p389-4w45).
function ssrfSafeLookup(
  hostname: string,
  options: any,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: any,
    family?: number
  ) => void
) {
  if (net.isIP(hostname)) {
    const family = net.isIP(hostname);
    if (isBlockedIp(hostname)) {
      return callback(new Error('Blocked IP'), '', 0);
    }
    return options && (options as any).all
      ? callback(null, [{ address: hostname, family }] as any, family)
      : callback(null, hostname, family);
  }

  dns.lookup(hostname, options, (err, address: any, family: any) => {
    if (err) return callback(err, '', 0);
    if (Array.isArray(address)) {
      for (const entry of address) {
        if (isBlockedIp(entry.address)) {
          return callback(new Error('Blocked IP'), '', 0);
        }
      }
      return callback(null, address as any, 0);
    }
    if (isBlockedIp(address)) {
      return callback(new Error('Blocked IP'), '', 0);
    }
    callback(null, address, family);
  });
}

// The `lookup` hook only runs for hostnames that need DNS resolution: Node's
// net.connect skips it for literal-IP hosts (http://169.254.169.254/,
// http://[::1]/), so a literal private/loopback IP would bypass the guard.
// Every connection (redirect hops included) also goes through this check.
function isBlockedLiteralHost(hostname?: string | null) {
  const host = (hostname || '').replace(/^\[|\]$/g, '');
  return net.isIP(host) !== 0 && isBlockedIp(host);
}

const pinnedConnector = buildConnector({ lookup: ssrfSafeLookup });

export const ssrfSafeDispatcher = new Agent({
  connect(options, callback) {
    if (isBlockedLiteralHost(options.hostname)) {
      return callback(new Error('Blocked IP'), null);
    }
    return pinnedConnector(options, callback);
  },
});

// axios can't use an undici dispatcher, but Node's http(s) agents accept the
// same `lookup` hook, so axios requests (providers that need form-data /
// stream uploads) get the identical pinned-DNS guard as `this.fetch`.
// The agents' createConnection runs for every socket, literal-IP hosts and
// redirect hops included, so it gets the same literal-IP check.
function guardLiteralHosts<T extends http.Agent>(agent: T): T {
  const createConnection = (agent as any).createConnection.bind(agent);
  (agent as any).createConnection = (options: any, callback: any) => {
    if (isBlockedLiteralHost(options.host)) {
      callback(new Error('Blocked IP'));
      return undefined;
    }
    return createConnection(options, callback);
  };
  return agent;
}

const ssrfSafeAxios = axios.create({
  httpAgent: guardLiteralHosts(
    new http.Agent({ lookup: ssrfSafeLookup } as http.AgentOptions)
  ),
  httpsAgent: guardLiteralHosts(
    new https.Agent({
      lookup: ssrfSafeLookup,
    } as https.AgentOptions)
  ),
});

// Self-hosters legitimately connect Postiz to WordPress/Mastodon/Lemmy/Listmonk
// instances that live on a private network (e.g. the same Docker network or VPC).
// Setting DISABLE_SSRF_PROTECTION=true opts those deployments out of the IP
// guard. It stays ON by default so the hosted product is protected.
export function getSsrfSafeDispatcher(): Agent | undefined {
  return process.env.DISABLE_SSRF_PROTECTION === 'true'
    ? undefined
    : ssrfSafeDispatcher;
}

export function getSsrfSafeAxios(): AxiosInstance {
  return process.env.DISABLE_SSRF_PROTECTION === 'true' ? axios : ssrfSafeAxios;
}
