-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'INFO');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('COMMENT', 'QUESTION', 'SUGGESTION', 'RESOLVED');

-- CreateTable
CREATE TABLE "CodeReview" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "repositoryPath" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commitHash" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "filesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "criticalIssues" INTEGER NOT NULL DEFAULT 0,
    "majorIssues" INTEGER NOT NULL DEFAULT 0,
    "minorIssues" INTEGER NOT NULL DEFAULT 0,
    "estimatedEffort" DOUBLE PRECISION,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "analysisTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeIssue" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "lineEnd" INTEGER,
    "severity" "IssueSeverity" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "codeSnippet" TEXT,
    "suggestion" TEXT,
    "autoFixable" BOOLEAN NOT NULL DEFAULT false,
    "fixCode" TEXT,
    "effort" DOUBLE PRECISION,
    "standard" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "issueId" TEXT,
    "content" TEXT NOT NULL,
    "type" "CommentType" NOT NULL DEFAULT 'COMMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingStandard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingStandard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeReview_userId_createdAt_idx" ON "CodeReview"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CodeReview_status_idx" ON "CodeReview"("status");

-- CreateIndex
CREATE INDEX "CodeIssue_reviewId_severity_idx" ON "CodeIssue"("reviewId", "severity");

-- CreateIndex
CREATE INDEX "CodeIssue_filePath_idx" ON "CodeIssue"("filePath");

-- CreateIndex
CREATE INDEX "ReviewComment_reviewId_idx" ON "ReviewComment"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "CodingStandard_name_key" ON "CodingStandard"("name");

-- CreateIndex
CREATE INDEX "CodingStandard_language_isActive_idx" ON "CodingStandard"("language", "isActive");

-- AddForeignKey
ALTER TABLE "CodeReview" ADD CONSTRAINT "CodeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeIssue" ADD CONSTRAINT "CodeIssue_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "CodeReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "CodeReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
