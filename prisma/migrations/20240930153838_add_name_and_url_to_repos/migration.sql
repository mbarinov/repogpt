/*
  Warnings:

  - You are about to drop the column `repositoryId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `vector` on the `Repository` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[url]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.
  - Made the column `namespace` on table `Document` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `url` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_repositoryId_fkey";

-- DropIndex
DROP INDEX "Repository_name_idx";

-- DropIndex
DROP INDEX "Repository_name_key";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "repositoryId",
ALTER COLUMN "namespace" SET NOT NULL;

-- AlterTable
ALTER TABLE "Repository" DROP COLUMN "vector",
ADD COLUMN     "url" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Repository_url_key" ON "Repository"("url");

-- CreateIndex
CREATE INDEX "Repository_url_idx" ON "Repository"("url");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_namespace_fkey" FOREIGN KEY ("namespace") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
