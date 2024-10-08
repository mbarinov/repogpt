-- AlterEnum
ALTER TYPE "RepositoryStatus" ADD VALUE 'ERROR';

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "error" TEXT;
