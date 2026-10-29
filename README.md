# t1-paste

A free, open-source, agent-first pastebin.

`t1-paste` gives humans a clean web editor and gives agents a first-class CLI,
raw HTTP endpoints, and machine-readable discovery. It is designed to be
self-hosted with Docker and the same services we use in production.

- Web: https://paste.transistorone.com
- CLI: `t1`
- License: AGPL-3.0

## Status

Working core:

- Anonymous paste creation, reading, raw view, metadata, expiry, passwords, and
  burn-after-read.
- Next.js web app with editor, paste pages, docs, and legal pages.
- Rust CLI for `paste` and `get`.
- Postgres schema, migrations, and seed.
- Docker-first local development.

In progress:

- WorkOS email/password accounts.
- WorkOS Agent Registration and the `auth.md` proxy.
- Dashboard, CLI login, agent claim flow.
- Admin, reports, rate limits, and Turnstile.
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

```bash
cd apps/cli
cargo run -- --api-url http://localhost:8787 paste notes.txt
cargo run -- --api-url http://localhost:8787 get <url>
```

## Repository layout

```text
apps/api      Hono API
apps/web      Next.js web app
apps/cli      Rust CLI
packages/db   Drizzle schema and migrations
packages/shared
packages/emails
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
