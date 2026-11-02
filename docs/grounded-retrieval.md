# Source-aware indexing and hybrid retrieval

## Source identity

An import resolves the requested/default GitHub branch **once** through the commit API. Its immutable tree is traversed, then each file is fetched by blob SHA. These are distinct values:

- `commitSha`: the repository snapshot used in GitHub `/blob/<commit>/path#Lx-Ly` links;
- `blobSha`: the individual file's content identity, never substituted for a commit;
- `path`, `language`, `startLine`, `endLine`: source location attached to every new chunk.

Line ranges are computed from offsets into the original file, before whitespace trimming or invalid-character cleanup. CRLF, leading blank lines, repeated text and Unicode are covered by tests. A chunk that splits a very long single line may share its line range with another chunk; retrieval must not discard distinct fragments simply because those ranges are equal.

## Chunk boundaries and limits

TS/JS uses the existing TypeScript compiler's syntax parser, without executing repository code. Top-level functions, classes and export/declaration boundaries are retained where possible. Large classes split at members; oversized symbols fall back to bounded spans with enclosing-symbol context. Imports provide bounded background context. Declaration-only or malformed input that the parser cannot handle falls back safely instead of aborting the whole import.

Markdown is split at section headings outside fenced code blocks. Other languages retain a safe bounded text fallback; this is not an all-language compiler framework.

Each embedding input is at most **4,000 characters**, including at most **800 characters** of separate import/enclosing context and its separator. Context is stored separately from the cited source span; it is not attributed to that span's line numbers. Existing file, repository and 10,000-chunk limits remain in force. No per-chunk language-model calls or summaries are added.

## Hybrid search

PostgreSQL supplies two bounded candidate sets, each scoped to the selected repository before ranking/limiting:

1. cosine similarity against the existing pgvector embeddings;
2. `simple`-configuration full-text search over content, path and context, retaining full identifiers and adding split camelCase/snake_case/path terms.

A stored generated `tsvector` and GIN index support lexical lookup, including old rows. Exact identifier/path/error-string occurrences improve lexical ordering. Queries and repository IDs remain bound SQL parameters, not interpolated query syntax.

Reciprocal rank fusion combines candidate **ranks**, not incompatible cosine and lexical scores. Code-shaped queries give lexical ranks more weight; natural-language queries use equal weights. Duplicate IDs and strongly overlapping source evidence are removed, with deterministic tie-breaking and a final maximum of six chunks. Distinct fragments of an oversized single line are retained.

The fixed regression corpus checks function names, paths, error strings, camel/snake splitting, natural-language semantic retrieval, generic distractors and other-repository isolation. Its embeddings are deterministic fixtures: it is a ranking regression suite, **not** a measured real-world retrieval-quality benchmark.

## Citations and trust boundary

The server generates citation IDs and immutable GitHub URLs only from validated retrieved metadata. Source excerpts remain untrusted model input. The model is asked to reference `[S1](#source-S1)`; the UI resolves only IDs supplied by the server. Invented URLs and unknown citation IDs are not clickable source evidence. Model-generated remote images are not fetched.

“Retrieved sources” means evidence supplied to the model, not a guarantee that every claim in the answer is supported. Users still need to inspect the source. Import/enclosing context is explicitly labeled as outside the cited span.

## Existing indexes / migration

Run `pnpm db:migrate` and `pnpm db:generate` after updating (back up the database first).

- The additive migration keeps existing text and vectors. New source fields are nullable, with no guessed paths, commits or line numbers.
- The generated lexical index backfills existing content, so old indexes remain searchable.
- Answers using legacy excerpts show an explicit source-location warning. Refresh that repository from **Repositories → Repository settings → Refresh index** to obtain source-aware chunks and links.
- Refresh uses the selected/default branch at the time it runs. It is not an automatic background upgrade, and normal embedding API charges apply.
- New documents replace the previous index in one transaction only after loading, splitting and every embedding batch succeeds. Failed refreshes retain the previous queryable index.
- Index creation/backfill can lock and scan the existing Document table. This is a bounded local single-user application, not a zero-downtime production migration.

## TDD evidence

Tests were written and executed before the corresponding behavior:

- Initial chunking suite: nine failing cases for semantic boundaries, original lines, import context, oversized symbols, Markdown, legacy metadata and shared budgets; then green.
- Snapshot loader: two failing commit/tree-resolution tests before implementation; then green.
- Additional chunking cycle: declaration-only `.d.ts` failure, duplicated import context and large exported declarations reproduced by three red tests, then fixed.
- Citation/UI cycle: missing helper plus failing tests for invented clickable URLs and absent legacy notice; then green. Additional incomplete-provenance and malformed-Unicode path cases were reproduced and fixed.
- Retrieval cycle: new normalization/fusion tests and old-signature mismatch were red before implementation. Additional same-line deduplication and combined-budget regressions were red before fixes.
- Real PostgreSQL tests cover atomic rollback/cascade, metadata persistence, old-table migration/backfill, parameterization, repository isolation and the fixed ranking corpus.
- AI SDK integration exercises real SSE serialization/parsing of server-issued source metadata. Browser scenarios cover link grounding, unknown-link suppression, legacy notices and clearing/switching source state.

No real provider credentials or paid model calls are used by these checks. Local browser execution is unavailable in this environment; the existing GitHub Actions Chromium job verifies browser behavior.
