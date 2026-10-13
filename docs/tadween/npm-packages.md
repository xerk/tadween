# npm packages

Tadween publishes the same packages Postiz does, renamed. Each one is a fork of
the Postiz package that keeps its code layout, so upstream changes can be
merged in.

| Tadween package | Postiz package | Source | License | Publish |
|---|---|---|---|---|
| `tadween` (CLI, command `tadween`, agent skill) | `postiz` | [xerk/tadween-agent](https://github.com/xerk/tadween-agent) (fork of gitroomhq/postiz-agent) | AGPL-3.0 | tag `v<version>` |
| `dsh-tadween` (DeepSeek Harness bundle) | `dsh-postiz` | xerk/tadween-agent, `plugins/dsh-tadween` | AGPL-3.0 | tag `dsh-v<version>` |
| `@tadween/node` (Node.js SDK) | `@postiz/node` | this repo, `apps/sdk` | AGPL-3.0 | tag `sdk-v<version>` |
| `n8n-nodes-tadween` (n8n community node) | `n8n-nodes-postiz` | [xerk/tadween-n8n](https://github.com/xerk/tadween-n8n) (fork of gitroomhq/postiz-n8n) | MIT | tag `v<version>` |

The fork repos work on the `tadween` branch (their default); `main` stays as
upstream's branch for syncing.

## Addresses

| | Default | Override |
|---|---|---|
| Public API (CLI, SDK, n8n Host) | `https://studio.tadween.app/api` (+ `/public/v1/...`) | `TADWEEN_API_URL`, the SDK's second argument, the n8n credential's Host |
| MCP (plugins, `dsh-tadween`) | `https://studio.tadween.app/mcp-oauth-dynamic` (OAuth), `/mcp` (key) | `baseUrl` on the `tadween` dsh row |
| CLI `auth:login` device flow | `https://cli-auth.tadween.app` | `--auth-server`, `TADWEEN_AUTH_SERVER` |

The API key goes in `TADWEEN_API_KEY`. Settings → API & MCP shows these
commands with the workspace's own addresses.

`cli-auth.tadween.app` is not deployed: `tadween auth:login` only works once
the device-flow server in `xerk/tadween-agent/server` runs there with an OAuth
app created in Tadween. Until then use the API key (the app's guides only
show the key).

`tadween media:list` calls `GET /public/v1/media`, which Postiz added after
the last upstream sync; it returns 404 here until that endpoint is merged.

## Publishing

Every package publishes from GitHub Actions with `npm publish --provenance`,
using the repository secret `NPM_TOKEN`. Run the workflow by hand with
`dry_run` to see the tarball first.

One-time setup:

1. npm: create the account and the `tadween` organization (for `@tadween/node`), with 2FA.
2. npm → Access Tokens: a granular token with read and write on packages (or a classic Automation token).
3. Add it as `NPM_TOKEN` in Settings → Secrets and variables → Actions of `xerk/tadween`, `xerk/tadween-agent` and `xerk/tadween-n8n`.
4. In each fork, open the Actions tab and enable workflows (forks start with them off).

Release: bump `version` in the package's `package.json`, commit, then push the
tag from the table above (for the SDK: `git tag sdk-v1.0.0 && git push origin sdk-v1.0.0`).
