# Contributing to RepoGPT

Read the [Code of Conduct](CODE_OF_CONDUCT.md), then follow the [README quick start](README.md#quick-start). Use Node.js 24 and the pnpm version pinned in `package.json`.

## Development

```sh
pnpm dev
```

Keep the application on loopback. Use a disposable development database and test credentials; never commit `.env`, API keys, private repository content or database dumps.

Dependency versions and `pnpm-lock.yaml` are committed together. Use stable releases, not canary/beta/RC versions. The Prisma CLI and client must stay on the same version. Node type declarations intentionally track Node 24, not the newest Node major.

## Checks

```sh
pnpm db:generate
pnpm db:migrate
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` combines lint, type checking and unit tests; it does not replace the production build or browser tests. Run affected checks again after changing code. CI starts a fresh PostgreSQL/pgvector service and applies the actual migration history.

Database integration and browser tests require `TEST_DATABASE_URL` pointing to a **dedicated, disposable test database** with pgvector and the migrations applied. They may delete or replace fixture records; never point this variable at your normal database. Set `DATABASE_URL` to that test URL while running `pnpm db:migrate`. CI supplies both variables for its disposable service. Without `TEST_DATABASE_URL`, database integration checks are skipped, not passed.

Tests must not use paid APIs or real credentials. Mock GitHub and OpenAI at their boundaries, and distinguish mocked regressions from live provider reproductions. Cover error and retry paths as well as happy paths: invalid input, rejected imports, failed embeddings, preserved indexes, deletion, settings redaction, and interrupted chat requests. Browser fixture data must be clearly synthetic and never enabled for normal application traffic.

## Database changes

Add a reviewed SQL migration under `prisma/migrations` and update `prisma/schema.prisma` together. Check both a fresh install and an upgrade from the previous schema. Back up valuable data before testing an upgrade. Do not rewrite applied migrations or use `db push` as the documented installation path.

Keep vector SQL parameterized. Do not change the embedding model or its dimensions without a plan to rebuild incompatible vectors. External network calls must finish before the atomic index replacement transaction.

## Formatting

```sh
pnpm format
pnpm format:check
```

Prefer small, understandable modules and explicit error contracts over broad abstractions. Never log provider credentials or private source text. Keep untrusted repository text separate from trusted model instructions.

## Pull requests

Explain what changed, why, and how it was tested. Include exact commands and disclose skipped or failed checks. Add regression tests for fixes. Use screenshots from the running app for visible UI changes; do not fabricate product screenshots.

Use conventional commit messages when practical. Open pull requests as drafts until the checks and review are complete. Publishing a draft is not authorization to merge or deploy.

Report bugs through [GitHub Issues](https://github.com/mbarinov/repogpt/issues), with sanitized reproduction steps. Email [me@maxbarinov.com](mailto:me@maxbarinov.com) for sensitive reports. Contributions are licensed under [MIT](LICENSE).
