---
name: t1-paste
description: Create and read t1-paste pastes with the t1 CLI or the HTTP API. Use when you need to share text, logs, code, or command output as a short URL.
---

# t1-paste

t1-paste is a text-only pastebin. Create a paste, get a short URL.

## First: check whether the CLI exists

Installing this skill does **not** install the CLI. The skill is instructions;
the binary is a separate install.

```bash
command -v t1
```

If `t1` is missing, **do not block the task on installing Rust**. Use the HTTP
API fallback below. The CLI is an optimization, not a requirement.

If you want the CLI, install it from the source repository:

```bash
git clone https://github.com/MrSheerluck/t1-paste.git
cd t1-paste
cargo install --path apps/cli --locked
```

Cargo installs the binary to `$HOME/.cargo/bin/t1`. If `command -v t1` still
fails, call the absolute path directly:

```bash
"$HOME/.cargo/bin/t1" paste file.txt
```

Or add the directory to `PATH`:

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

For convenience:

```bash
curl -fsSL https://paste.transistorone.com/install.sh | sh
```

The install script still requires `git` and `cargo`. A prebuilt release binary
is not available yet.

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

If the CLI is unavailable, use `curl`. This is the reliable path:

```bash
curl -sS \
  -H "Accept: text/plain" \
  --data-binary @file.txt \
  https://paste.transistorone.com/api/pastes
```

Read raw content:

```bash
curl -sS https://paste.transistorone.com/api/pastes/abc123/raw
```

For the local POC:

```bash
export T1_API_URL=http://localhost:8787
curl -sS -H "Accept: text/plain" \
  --data-binary @file.txt \
  "$T1_API_URL/api/pastes"
```

A link created against `localhost` only works on that machine. Use a tunnel or
deploy the service before sharing a link with someone else.

## Limits

- 256 KB of UTF-8 text.
- 7-day maximum expiry for anonymous pastes.
- 30-day maximum for accounts and claimed agents.
- Text only. No files, images, or binary uploads.
- Burn-after-read pastes are deleted on the first explicit read.

## Authentication

Anonymous paste creation requires no authentication.

For private pastes or 30-day retention, register an anonymous agent through the
self-hosted `auth.md` flow:

```bash
t1 agent register
t1 agent status
```

The CLI follows the protocol at `https://paste.transistorone.com/auth.md`,
stores the access token locally, and refreshes it from the identity assertion
when it expires. There are no human accounts, email verification, or claim
ceremonies on this instance.

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
