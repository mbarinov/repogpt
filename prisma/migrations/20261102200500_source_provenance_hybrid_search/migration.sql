-- Existing embeddings remain usable. Unknown source locations stay NULL until reindexing.
ALTER TABLE "Document"
  ADD COLUMN "context" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "path" TEXT,
  ADD COLUMN "language" TEXT,
  ADD COLUMN "startLine" INTEGER,
  ADD COLUMN "endLine" INTEGER,
  ADD COLUMN "blobSha" TEXT,
  ADD COLUMN "commitSha" TEXT,
  ADD CONSTRAINT "Document_source_lines_check" CHECK (
    ("startLine" IS NULL AND "endLine" IS NULL) OR
    ("startLine" IS NOT NULL AND "endLine" IS NOT NULL AND "startLine" > 0 AND "endLine" >= "startLine")
  );

-- Explicit 'simple' config makes the generated expression immutable and preserves code words.
-- Index both exact tokens and split camelCase/acronym/snake_case/path words. Generated values
-- backfill legacy rows and remain correct for all writers, not only this application's indexer.
ALTER TABLE "Document" ADD COLUMN "searchVector" TSVECTOR GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce("path", '') || ' ' || "content" || ' ' || "context" || ' ' ||
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce("path", '') || ' ' || "content" || ' ' || "context",
          '([A-Z])([A-Z][a-z])', '\1 \2', 'g'),
        '([a-z0-9])([A-Z])', '\1 \2', 'g'),
      '[_/.-]+', ' ', 'g')
  )
) STORED;
CREATE INDEX "Document_searchVector_idx" ON "Document" USING GIN ("searchVector");
