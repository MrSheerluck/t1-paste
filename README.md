# t1-paste

A free, open-source, agent-first pastebin.

`t1-paste` gives humans a clean web editor and gives agents a first-class CLI,
real agent identities, and machine-readable discovery. It is designed to be
self-hosted with Docker and the same services we use in production.

- Web: https://paste.transistorone.com
- CLI: `t1`
- License: AGPL-3.0

## Status

Early development. The product is being built in phases. APIs, schemas, and
commands will change until the first release.

## What it does

- Create and share text pastes.
- Syntax highlighting, Markdown, raw view, download, QR, and embed.
- Expiry, burn-after-read, password protection, visibility, and tags.
- Human accounts with email/password auth.
- Agent accounts through WorkOS Agent Registration and `auth.md`.
- A Rust CLI designed for low-token agent use.
- Self-hosting with Docker Compose.

## Stack

- Web: Next.js
- API: Hono (Cloudflare Workers and Node)
- Database: Postgres
- Auth: WorkOS AuthKit + WorkOS Agent Registration
- Email: Resend
- CLI: Rust
- Tooling: Vite+, pnpm, Docker

## Repository layout

````text
apps/api      Hono API
apps/web      Next.js web app
apps/cli      Rust CLI
packages/db   Drizzle schema and migrations
packages/shared
packages/emails
packages/sdk
skills/t1-paste
infra         Docker and self-host configuration
Development
The local development environment is Docker-first. Setup instructions will be
added as the stack lands.
Until then:
vp install
vp check
vp test
Contributing
Read CONTRIBUTING.md and AGENTS.md.
Security
Report vulnerabilities privately. See SECURITY.md.
License
AGPL-3.0. See LICENSE.

## Step 4 — Write `CONTRIBUTING.md`

```markdown
# Contributing

Thanks for helping build t1-paste.

## Before you start

- Read `README.md` and `AGENTS.md`.
- Check existing issues before opening a new one.
- For security issues, follow `SECURITY.md` instead of opening a public issue.

## Development

t1-paste is Docker-first. Once the development stack lands:

```bash
docker compose up --build -d
docker compose exec workspace pnpm check
docker compose exec workspace pnpm test
Until then:
vp install
vp check
vp test
Code style
- TypeScript is strict.
- Validate every trust boundary with Zod.
- Keep pure logic in packages/shared.
- Do not put server-only code in client components.
- Do not commit secrets.
- Add tests for behavior changes.
Commits
- Keep commits small and focused.
- Use a clear prefix such as phase 3: add pastes schema or a conventional
commit message.
- Do not commit generated build output or local environment files.
Pull requests
- Explain what changed and why.
- Include a test plan.
- Link the relevant issue.
- Make sure CI is green.
License
By contributing, you agree that your contributions are licensed under
AGPL-3.0.
````
