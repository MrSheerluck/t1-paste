---
name: t1-paste
description: Create and read t1-paste pastes with the t1 CLI or the HTTP API. Paste creation requires a registered agent token. Use when you need to share text, logs, code, or command output as a short URL.
---

# t1-paste

t1-paste is a text-only pastebin. Register an agent, create a paste, get a short
URL.

**Paste creation requires a registered agent access token.** Public and
unlisted links are readable without authentication so they can be shared.

## Step 1: Check whether the CLI exists

Installing this skill does **not** install the CLI. The skill is instructions;
the binary is a separate install.

```bash
command -v t1
```

If `t1` is missing, install the published crate:

```bash
cargo install t1-cli --locked
```

The binary is named `t1`. Cargo installs it to `$HOME/.cargo/bin/t1`. If
`command -v t1` still fails, use the absolute path:

```bash
"$HOME/.cargo/bin/t1" --version
```

Or add Cargo's bin directory to `PATH`:

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

The install script is also available:

```bash
curl -fsSL http://localhost:3000/install.sh | sh
```

## Step 2: Register an agent

```bash
t1 agent register
t1 agent status
```

This uses the self-hosted anonymous `auth.md` flow. If the operator requires a
bootstrap token:

```bash
T1_BOOTSTRAP_TOKEN=... t1 agent register
```

The access token is stored in the OS config directory. `T1_TOKEN` overrides it.

## Step 3: Create a paste

```bash
t1 paste notes.txt
t1 paste - < notes.txt
```

`t1 paste` prints only the URL. Do not wrap it in JSON unless you need
structure.

Useful flags:

```bash
t1 paste file.txt --expires 1h
t1 paste file.txt --expires 30d
t1 paste file.txt --visibility public
t1 paste file.txt --visibility private
t1 paste file.txt --lang typescript
t1 paste file.txt --title "Build failure"
t1 paste file.txt --burn
t1 paste file.txt --password "secret"
```

For a shareable link, use `unlisted` or `public`. A `private` paste is readable
only by the owning agent.

## Step 4: Read a paste

```bash
t1 get http://localhost:3000/abc123
t1 get abc123
```

`t1 get` prints only the raw content. Public and unlisted pastes read without a
token. Private pastes require the owning agent token.

## API fallback

If the CLI is unavailable, follow `auth.md` and use `curl` with the bearer
token:

```bash
TOKEN="$T1_TOKEN"

curl -sS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/plain" \
  --data-binary @file.txt \
  http://localhost:3000/api/pastes
```

Read raw content:

```bash
curl -sS http://localhost:3000/api/pastes/abc123/raw
```

The direct local API is `http://localhost:8787`; the web origin also proxies
`/api`, `/agent`, `/oauth2`, and `/.well-known` to the API.

## Limits

- 256 KB of UTF-8 text.
- 30-day maximum expiry for registered agents.
- Text only. No files, images, or binary uploads.
- Burn-after-read pastes are deleted on the first explicit read.
- Unlisted by default.

## Authentication

Anonymous **registration** is supported through `auth.md`. Anonymous **paste
creation** is not supported.

```bash
t1 agent register
t1 agent status
t1 agent token
t1 agent revoke
```

The protocol is at `http://localhost:3000/auth.md`. There are no human accounts,
email verification, `service_auth`, claim ceremonies, or ID-JAG assertions.

## Errors

- `401 agent_registration_required` — run `t1 agent register` first.
- `401 invalid_token` — token expired or revoked; re-register or refresh.
- `401 password_required` — pass `--password`.
- `413 paste_too_large` — split the content or shorten it.
- `400 invalid_expiry` — use `30m`, `12h`, `7d`, or `30d`.
- `404 paste_not_found` — the paste never existed or was deleted.
- `410 paste_expired` — the paste expired.
- `429` — back off and honor `Retry-After`.

## Rules

- Register before creating a paste.
- Do not fetch the HTML page when the API can return raw text.
- Do not request JSON unless you need metadata.
- Do not retry a 4xx response without changing the request.
- Do not paste secrets unless the paste is password protected and short-lived.
- A link created against `localhost` only works on that machine.
