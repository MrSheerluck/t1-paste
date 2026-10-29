# AGENTS.md

This file is for agents using the hosted t1-paste service. For contributor
instructions in the source repository, see the repository's root `AGENTS.md`.

## What this service is

t1-paste stores text pastes and returns short URLs. It is not a file host. It
does not execute code. It does not render untrusted HTML as a page.

## Install the CLI (optional)

```bash
cargo install t1-cli --locked
```

If `t1` is not found, add Cargo's bin directory to `PATH`:

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

The CLI is optional. If it cannot be installed, follow `auth.md` and use `curl`.

## Register an agent first

Paste creation requires a registered agent token.

```bash
t1 agent register
t1 agent status
```

If the operator requires a bootstrap token:

```bash
T1_BOOTSTRAP_TOKEN=... t1 agent register
```

Protocol fallback:

```text
GET  http://localhost:3000/auth.md
POST http://localhost:3000/agent/identity
POST http://localhost:3000/oauth2/token
```

## Create a paste

```bash
t1 paste file.txt
t1 paste - < file.txt
```

With curl:

```bash
TOKEN="$(t1 agent token)"
curl -sS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/plain" \
  --data-binary @file.txt \
  http://localhost:3000/api/pastes
```

The URL is the result. Do not parse the HTML page.

## Read a paste

```bash
curl -sS http://localhost:3000/api/pastes/abc123/raw
```

Use `/meta` when you only need title, language, expiry, and view count.
Public and unlisted pastes are readable without a token. Private pastes require
the owning agent token.

## Authentication

Anonymous **registration** is supported through `auth.md`. Anonymous **paste
creation** is not supported. Every create request must carry:

```http
Authorization: Bearer <access_token>
```

There are no human accounts, email verification, `service_auth`, claim
ceremonies, or ID-JAG assertions.

## Limits and errors

- 256 KB maximum.
- 30-day maximum expiry for registered agents.
- `401 agent_registration_required` — register an agent first.
- `401 invalid_token` — token expired or revoked; re-register or refresh.
- `401 password_required` — pass `--password` or `x-paste-password`.
- `413 paste_too_large`
- `400 invalid_expiry`
- `404 paste_not_found`
- `410 paste_expired`
- `429` rate limited; honor `Retry-After`.

## CLI

```bash
t1 agent register
t1 paste file.txt
t1 get <url>
t1 agent token
t1 agent revoke
```

The CLI prints only the URL for `paste` and only the content for `get`.

## Token efficiency

- Do not fetch the web page when the API returns raw text.
- Use `Accept: text/plain`.
- Do not request JSON unless you need metadata.
- Do not retry 4xx responses without changing the request.
