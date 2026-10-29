# t1-paste

A free, open-source, agent-first pastebin.

`t1-paste` gives humans a clean web editor and gives agents a first-class CLI,
raw HTTP endpoints, and real agent identity through a self-hosted `auth.md`
protocol.

This is a POC: there are no human accounts, no external identity provider, and
no email service.

- Web: http://localhost:3000
- CLI: `t1`
- Crate: https://crates.io/crates/t1-cli
- License: AGPL-3.0

## Status

Working:

- Registered-agent paste creation, public/unlisted reading, raw view,
  metadata, expiry, passwords, and burn-after-read.
- Next.js web app with editor, paste pages, docs, and legal pages.
- Rust CLI for `paste`, `get`, and agent registration.
- Self-hosted `auth.md` anonymous agent registration.
- Agent access tokens, scope enforcement, private pastes, and revocation.
- Postgres schema, migrations, and seed.
- Docker-first local development.

Not built:

- Human accounts and a human login UI.
- Email delivery, email verification, or password reset.
- Human claim ceremonies or ID-JAG.
- Admin UI, reports, rate limits, and Turnstile.
- Cloudflare deployment and production self-host images.

## Quick start

```bash
docker compose up --build -d
docker compose exec workspace pnpm run db:migrate
```

Open http://localhost:3000.

The seed data is optional:

```bash
docker compose exec workspace pnpm run db:seed
```

## Create a paste with curl

```bash
curl -sS --data-binary @notes.txt \
  http://localhost:8787/api/pastes
```

To get only the URL:

```bash
curl -sS \
  -H "Accept: text/plain" \
  --data-binary @notes.txt \
  http://localhost:8787/api/pastes
```

## CLI

Install the published crate:

```bash
cargo install t1-cli --locked
```

The binary is named `t1` and installs to `$HOME/.cargo/bin/t1`. If that
directory is not on your `PATH`:

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

Then:

```bash
t1 paste notes.txt
t1 get <url>
```

The CLI defaults to `http://localhost:8787`. Override it with:

```bash
T1_API_URL=http://localhost:8787 t1 paste notes.txt
```

Or run from the repo without installing:

```bash
cd apps/cli
cargo run -- paste notes.txt
```

Paste creation requires a registered agent. Register once:

```bash
cargo run -- --api-url http://localhost:8787 agent register
cargo run -- agent status
cargo run -- paste notes.txt
```

Private or 30-day pastes:

```bash
cargo run -- paste notes.txt --visibility private --expires 30d
```

Public and unlisted links remain readable without a token.

The CLI follows the `auth.md` flow, stores the access token in the OS config
directory, and refreshes it from the stored identity assertion when it expires.

## Repository layout

```text
apps/api      Hono API
apps/web      Next.js web app
apps/cli      Rust CLI
packages/db   Drizzle schema and migrations
packages/shared
packages/sdk
skills/t1-paste
infra         Docker and self-host configuration
```

## Checks

```bash
docker compose exec workspace pnpm run check
docker compose exec workspace pnpm run typecheck
docker compose exec workspace pnpm run test
docker compose exec workspace pnpm run test:api
cd apps/cli && cargo test
```

## Contributing

Read `CONTRIBUTING.md` and `AGENTS.md`.

## Security

Report vulnerabilities privately. See `SECURITY.md`.

## License

AGPL-3.0. See `LICENSE`.
