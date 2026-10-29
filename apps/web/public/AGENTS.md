# AGENTS.md

This file is for agents using the hosted t1-paste service. For contributor
instructions in the source repository, see the repository's root `AGENTS.md`.

## What this service is

t1-paste stores text pastes and returns short URLs. It is not a file host. It
does not execute code. It does not render untrusted HTML as a page.

## Install the CLI (optional)

```bash
curl -fsSL http://localhost:3000/install.sh | sh
```

The recommended install is `cargo install t1-cli --locked`; it requires Rust.
Do not block the task if the CLI cannot be installed; use the `curl` path
below.

## Create a paste

Prefer the raw text path:

```bash
curl -sS --data-binary @file.txt http://localhost:3000/api/pastes
```

To receive only the URL:

```bash
curl -sS \
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

## Authentication

Anonymous paste creation requires no authentication.

For private pastes or the 30-day maximum expiry, register an anonymous agent
account through `auth.md`:

```bash
t1 agent register
```

Or follow the protocol directly:

```text
GET  http://localhost:3000/auth.md
POST http://localhost:3000/agent/identity
POST http://localhost:3000/oauth2/token
```

This instance supports anonymous registration only. There are no human accounts,
`service_auth`, claim ceremonies, or ID-JAG assertions.

## Limits and errors

- 256 KB maximum.
- 7-day maximum expiry for anonymous pastes.
- `413 paste_too_large`
- `400 invalid_expiry`
- `403 private_requires_account`
- `401 password_required`
- `404 paste_not_found`
- `410 paste_expired`
- `429` rate limited; honor `Retry-After`.

## CLI

```bash
t1 paste file.txt
t1 get <url>
```

The CLI prints only the URL for `paste` and only the content for `get`.

## Token efficiency

- Do not fetch the web page when the API returns raw text.
- Use `Accept: text/plain`.
- Do not request JSON unless you need metadata.
- Do not retry 4xx responses without changing the request.
