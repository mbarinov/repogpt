-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
-- CreateEnum
CREATE TYPE "RepositoryStatus" AS ENUM ('IMPORTED', 'LOADING', 'NOT_STARTED');

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" SERIAL NOT NULL,
    "openAiKey" TEXT NOT NULL,
    "githubAccessToken" TEXT NOT NULL,
    "selectedRepoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "namespace" TEXT DEFAULT 'default',
    "vector" vector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "repositoryId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RepositoryStatus" NOT NULL,
    "vector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreSettings_selectedRepoId_key" ON "StoreSettings"("selectedRepoId");

-- CreateIndex
CREATE INDEX "StoreSettings_selectedRepoId_idx" ON "StoreSettings"("selectedRepoId");

-- CreateIndex
CREATE INDEX "Document_namespace_idx" ON "Document"("namespace");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_name_key" ON "Repository"("name");

-- CreateIndex
CREATE INDEX "Repository_name_idx" ON "Repository"("name");

-- AddForeignKey
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_selectedRepoId_fkey" FOREIGN KEY ("selectedRepoId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
