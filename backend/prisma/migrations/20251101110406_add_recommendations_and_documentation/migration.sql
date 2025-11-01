-- AlterTable
ALTER TABLE "CodeIssue" ADD COLUMN     "documentationNeeded" TEXT;

-- AlterTable
ALTER TABLE "CodeReview" ADD COLUMN     "recommendations" JSONB;
