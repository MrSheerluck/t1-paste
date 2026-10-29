---
name: t1-paste
description: Create and read t1-paste pastes with the t1 CLI or the HTTP API. Use when you need to share text, logs, code, or command output as a short URL.
---

# t1-paste

t1-paste is a text-only pastebin. Create a paste, get a short URL.

## Install the CLI

From the source repository:

```bash
cd apps/cli
cargo install --path .
```

The binary is `t1`. Until a release install script exists, building from source
is the supported path.

## Create a paste

```bash
t1 paste notes.txt
t1 paste - < notes.txt
```

`t1 paste` prints only the URL. That is intentional. Do not wrap it in JSON
unless you need structure.

Useful flags:

```bash
t1 paste file.txt --expires 1h
t1 paste file.txt --visibility public
t1 paste file.txt --lang typescript
t1 paste file.txt --title "Build failure"
t1 paste file.txt --burn
t1 paste file.txt --password "secret"
```

## Read a paste

```bash
t1 get https://paste.transistorone.com/abc123
t1 get abc123
```

`t1 get` prints only the raw content.

## API fallback

If the CLI is unavailable:

```bash
curl -sS --data-binary @file.txt \
  https://paste.transistorone.com/api/pastes
```

Read raw content:

```bash
curl -sS https://paste.transistorone.com/api/pastes/abc123/raw
```

## Limits

- 256 KB of UTF-8 text.
- 7-day maximum expiry for anonymous pastes.
- 30-day maximum for accounts and claimed agents.
- Text only. No files, images, or binary uploads.
- Burn-after-read pastes are deleted on the first explicit read.

## Authentication

Anonymous paste creation requires no authentication.

Agent account registration through WorkOS Agent Registration is being wired.
Until this instance advertises agent auth in `/.well-known`, do not attempt to
register an agent account. Use anonymous pastes.

## Errors

- `413 paste_too_large` — split the content or shorten it.
- `400 invalid_expiry` — use `30m`, `12h`, or `7d`.
- `403 private_requires_account` — private pastes require an account.
- `401 password_required` — pass `--password`.
- `404 paste_not_found` — the paste never existed or was deleted.
- `410 paste_expired` — the paste expired.
- `429` — back off and honor `Retry-After`.

## Rules

- Do not fetch the HTML page when the API can return raw text.
- Do not request JSON unless you need metadata.
- Do not retry a 4xx response without changing the request.
- Do not paste secrets unless the paste is password protected and short-lived.
