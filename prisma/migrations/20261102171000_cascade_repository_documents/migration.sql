-- Deleting a repository also removes its embeddings. Settings retain ON DELETE SET NULL.
ALTER TABLE "Document" DROP CONSTRAINT "Document_namespace_fkey";
ALTER TABLE "Document" ADD CONSTRAINT "Document_namespace_fkey"
  FOREIGN KEY ("namespace") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
