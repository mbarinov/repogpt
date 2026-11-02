# Maintenance upgrade notes

The modernization replaces the 2024 runtime/tooling baseline. Dependency versions were checked against npm on 2026-11-02, with exact direct versions and a committed lockfile.

| Component                                | Selected release      |
| ---------------------------------------- | --------------------- |
| Node.js                                  | 24.x                  |
| Next.js                                  | 16.4.4                |
| React / React DOM                        | 19.3.1                |
| AI SDK                                   | 7.0.159               |
| LangChain core / OpenAI / text splitters | 1.3.2 / 1.8.0 / 1.0.2 |
| Prisma CLI / client / PostgreSQL adapter | 7.10.1                |
| Tailwind CSS                             | 4.3.3                 |
| pnpm                                     | 12.16.1               |

## Deliberate compatibility choices

- The Prisma `latest` tag resolved to `8.0.0-rc.29` during verification. This project uses **stable 7.10.1** consistently instead of that release candidate.
- ESLint **9.39.5** and TypeScript **6.0.3** are the newest compatible versions selected for the current Next.js ESLint/plugin toolchain. ESLint 10 and TypeScript 7 are not forced through unsupported peer ranges.
- `@types/node` tracks the Node 24 runtime rather than the newest Node major.
- The unused `langchain` and `@langchain/community` umbrella packages were removed. Their current focused core, OpenAI and text-splitting modules provide the LangChain functionality used here. Parameterized SQL handles pgvector instead of an older community Prisma adapter.

## Operational changes

Use the migration commands in the README. The new relationship migration allows deleting a repository and its document vectors together. It does not intentionally discard existing repository data. Back up an existing database before applying any upgrade.

Imports now await indexing rather than reporting success while an untracked background promise is still running. Embeddings are prepared before the database replacement transaction, so failed external requests do not erase a previously working index. This does not make imports durable across process restarts.

GitHub loading uses a bearer token and read-only API calls. The test suite exercises access-denied responses associated with fine-grained tokens, but cannot prove access to a particular private repository or organization. Likewise, invalid embedding input regressions are tested with fixtures; they do not establish the historical root cause of every provider `400` response.

The screenshots are stored in this repository instead of relying on the old inaccessible cloud-storage URLs. See the test documentation for how synthetic fixtures are used; screenshots are not evidence of live provider/API behavior.

## Dependency audit caveat

The 2026-11-02 audit reported no production dependency advisories and one moderate development-only advisory, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), in `minimatch` used by the Next.js ESLint toolchain. Its patched major version is outside those plugins' supported ranges. This upgrade does not force an incompatible major override or suppress the finding; revisit it when the upstream lint plugins support the fixed version.

Peer evidence for the tooling exceptions: `eslint-plugin-import@2.32.0`, `eslint-plugin-jsx-a11y@6.10.2`, and `eslint-plugin-react@7.37.5` accept ESLint only through 9; `typescript-eslint@8.72.1` and its parser accept TypeScript `>=4.8.4 <6.1.0`. `pnpm peers check` passes with the selected versions.
