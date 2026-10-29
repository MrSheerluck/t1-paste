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
```

Until then:

```bash
vp install
vp check
vp test
```

## Code style

- TypeScript is strict.
- Validate every trust boundary with Zod.
- Keep pure logic in packages/shared.
- Do not put server-only code in client components.
- Do not commit secrets.
- Add tests for behavior changes.

## Commits

- Keep commits small and focused.
- Use a clear prefix such as phase 3: add pastes schema or a conventional commit message.
- Do not commit generated build output or local environment files.

## Pull requests

- Explain what changed and why.
- Include a test plan.
- Link the relevant issue.
- Make sure CI is green.

## License

By contributing, you agree that your contributions are licensed under AGPL-3.0.
