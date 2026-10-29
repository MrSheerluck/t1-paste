# AGENTS.md

This file is for coding agents working on the t1-paste repository.

It is not the product's agent-facing documentation. The deployed product will
serve its own `/AGENTS.md` and `/llms.txt` for agents using the pastebin.

## Project

t1-paste is a free, open-source, agent-first pastebin. Humans use a Next.js web
app. Agents use a Rust CLI and machine-readable discovery. The API is Hono,
running on Cloudflare Workers in production and Node for self-hosting.

## Read first

- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `BUILD_PLAN.md` if it exists locally. It is private, gitignored, and must not
  be edited, committed, or referenced in public issues.

## Architecture

- `apps/web` — Next.js web app.
- `apps/api` — Hono API. Keep the core app runtime-agnostic.
- `apps/cli` — Rust CLI.
- `packages/db` — Drizzle schema, migrations, and database client.
- `packages/shared` — runtime-agnostic Zod schemas, types, and pure helpers.
- `packages/emails` — email templates and sending adapter.
- `packages/sdk` — typed API client.
- `skills/t1-paste` — installable agent skill.
- `infra` — Docker and self-host configuration.

## Commands

Docker-first once the development stack lands:

```bash
docker compose up --build -d
docker compose exec workspace pnpm run check
docker compose exec workspace pnpm run typecheck
docker compose exec workspace pnpm run test
docker compose exec api pnpm test
docker compose exec web pnpm test:e2e
```

`vp check` covers formatting and linting. `pnpm run typecheck` runs the
TypeScript compiler per package. Type-aware Oxlint/tsgolint is currently
disabled inside Docker because it runs out of memory; do not re-enable it
without measuring container memory first.

Until then:

```bash
vp install
vp check
pnpm run typecheck
vp test
vp build
```

Do not run app dev servers on the host after the Docker stack exists.

## Code style

- TypeScript strict mode.
- Avoid any unless there is a short comment explaining why.
- Validate HTTP input, environment variables, and external API responses with Zod.
- Keep pure logic in packages/shared.
- Do not import server-only code into client components.
- Prefer small functions and explicit types at package boundaries.

## Product boundaries for v1

Do not add these without an explicit product decision:

- Social login, magic links, passkeys, or MFA.
- Revisions or diff views.
- File, image, or binary uploads.
- Public explore or global content search.
- Comments or reactions.
- Teams or organizations.
- R2, S3, or any blob storage. v1 is Postgres-only.
- MCP server.
- A local auth adapter. WorkOS and Resend are required.

## Limits and defaults:

- Text only, valid UTF-8.
- Maximum 256 KB.
- Default expiry 7 days.
- Maximum expiry 30 days.
- Default visibility unlisted.
- Anonymous pastes are immutable and expire.

## Security rules

- Never commit secrets.
- Never log paste contents, tokens, email codes, or full IP addresses.
- Hash CLI tokens before storage.
- Hash IP addresses before storage.
- Use parameterized queries through Drizzle.
- Sanitize Markdown before rendering.
- Treat WorkOS access tokens as untrusted until signature, issuer, audience, and expiry are verified.
- Keep WorkOS API keys server-side only.

## Testing

- Unit tests for pure logic.
- Integration tests against a real Postgres test database.
- Playwright tests for critical browser flows.
- Rust tests for CLI behavior.
- Run vp check and the relevant tests before proposing a change.

## Commits and pull requests

- Keep commits small.
- Describe what changed, why, and how it was tested.
- Do not include generated build output or local environment files.
