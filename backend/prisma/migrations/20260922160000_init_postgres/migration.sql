-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('pending', 'reviewed', 'interviewing', 'completed');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('super_admin', 'admin', 'reviewer');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "ResumeFileStatus" AS ENUM ('uploaded', 'parsing', 'parsed', 'failed');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" SERIAL NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'reviewer',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "workspaceId" INTEGER NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'admin',
    "token" VARCHAR(255) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "organizationName" VARCHAR(200) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "resume" VARCHAR(500),
    "resumeKey" VARCHAR(300),
    "botId" VARCHAR(150),
    "board" VARCHAR(50) NOT NULL,
    "grade10" TEXT NOT NULL,
    "grade12" TEXT NOT NULL,
    "gpa" TEXT NOT NULL,
    "degree" VARCHAR(150) NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'pending',
    "summary" TEXT,
    "aiSummary" TEXT,
    "activities" JSONB NOT NULL,
    "achievements" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "growthAreas" JSONB NOT NULL,
    "skills" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" INTEGER NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_analyses" (
    "id" SERIAL NOT NULL,
    "botId" VARCHAR(150),
    "recordingId" VARCHAR(100),
    "transcriptId" VARCHAR(100),
    "transcriptText" TEXT,
    "summary" TEXT,
    "questionsAsked" JSONB NOT NULL,
    "questionAnswerPairs" JSONB NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcript_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_files" (
    "id" SERIAL NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "resumeUrl" VARCHAR(500) NOT NULL,
    "resumeKey" VARCHAR(300) NOT NULL,
    "status" "ResumeFileStatus" NOT NULL DEFAULT 'uploaded',
    "candidateId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "essays" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "essays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parsed_fields" (
    "id" SERIAL NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "source" VARCHAR(200) NOT NULL,
    "payload" JSONB,
    "candidateId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parsed_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_records" (
    "id" SERIAL NOT NULL,
    "standard" VARCHAR(50) NOT NULL,
    "schoolName" VARCHAR(255) NOT NULL,
    "board" VARCHAR(100) NOT NULL,
    "yearOfPassing" VARCHAR(20) NOT NULL,
    "markingScheme" VARCHAR(100) NOT NULL,
    "obtainedPercentageOrCgpa" VARCHAR(50) NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_subjects" (
    "id" SERIAL NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "maximumMarksOrGrade" VARCHAR(50) NOT NULL,
    "obtainedMarksOrGrade" VARCHAR(50) NOT NULL,
    "academicRecordId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitive_exams" (
    "id" SERIAL NOT NULL,
    "examName" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50),
    "testDate" VARCHAR(20),
    "rollNumber" VARCHAR(100),
    "totalScore" VARCHAR(50),
    "rankOrPercentile" VARCHAR(50),
    "result" VARCHAR(50),
    "candidateId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitive_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_sections" (
    "id" SERIAL NOT NULL,
    "section" VARCHAR(100) NOT NULL,
    "score" VARCHAR(50) NOT NULL,
    "competitiveExamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "question" TEXT NOT NULL,
    "skillEvaluated" VARCHAR(200) NOT NULL,
    "rationale" TEXT NOT NULL,
    "sourceText" TEXT,
    "confidence" INTEGER,
    "tags" JSONB NOT NULL,
    "candidateId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_sessions" (
    "id" VARCHAR(20) NOT NULL,
    "version" VARCHAR(100) NOT NULL,
    "dateGenerated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionCount" INTEGER NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'scheduled',
    "candidateId" INTEGER NOT NULL,
    "generatedById" INTEGER NOT NULL,

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_userId_workspaceId_key" ON "workspace_members"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_workspaceId_email_key" ON "invitations"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "transcript_analyses_candidateId_idx" ON "transcript_analyses"("candidateId");

-- CreateIndex
CREATE INDEX "resume_files_candidateId_idx" ON "resume_files"("candidateId");

-- CreateIndex
CREATE INDEX "academic_records_candidateId_idx" ON "academic_records"("candidateId");

-- CreateIndex
CREATE INDEX "academic_subjects_academicRecordId_idx" ON "academic_subjects"("academicRecordId");

-- CreateIndex
CREATE INDEX "competitive_exams_candidateId_idx" ON "competitive_exams"("candidateId");

-- CreateIndex
CREATE INDEX "exam_sections_competitiveExamId_idx" ON "exam_sections"("competitiveExamId");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_analyses" ADD CONSTRAINT "transcript_analyses_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_files" ADD CONSTRAINT "resume_files_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essays" ADD CONSTRAINT "essays_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_fields" ADD CONSTRAINT "parsed_fields_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_records" ADD CONSTRAINT "academic_records_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_subjects" ADD CONSTRAINT "academic_subjects_academicRecordId_fkey" FOREIGN KEY ("academicRecordId") REFERENCES "academic_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitive_exams" ADD CONSTRAINT "competitive_exams_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_competitiveExamId_fkey" FOREIGN KEY ("competitiveExamId") REFERENCES "competitive_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

