import { Worker, type Job } from 'bullmq';
import { redisConnection, PDF_QUEUE_NAME } from '../../config/redis.js';
import { prisma } from '../../utils/prismaClient.js';
import { updateStatus } from '../upload.service.js';
import { parseResumeFile, saveParsedResume } from '../resume.service.js';
import type { PdfJobData } from './pdf.queue.js';

const processPdfJob = async (job: Job<PdfJobData>) => {
  const { fileId, workspaceId } = job.data;

  const attempt = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? 1;
  console.log(`📄 Processing file: ${fileId} (attempt ${attempt}/${maxAttempts})`);

  // Idempotency: a previous attempt may have saved the candidate and then failed
  // before marking the file parsed. Don't parse again — just finish the job.
  const existing = await prisma.resumeFile.findUnique({
    where: { id: Number(fileId) },
    select: { candidateId: true },
  });
  if (!existing) {
    console.warn(`⚠️ Resume file ${fileId} no longer exists; skipping job`);
    return;
  }
  if (existing.candidateId) {
    console.log(`↩️ File ${fileId} already linked to candidate ${existing.candidateId}; marking parsed`);
    await updateStatus(fileId, 'parsed');
    return;
  }

  try {
    await updateStatus(fileId, 'parsing');

    const result = await parseResumeFile(Number(fileId));
    console.log('📊 Parsed resume data:', result);

    const saved = await saveParsedResume(result.fileId, result.parsed, workspaceId);
    console.log('📝 Saved parsed resume:', saved);

    await updateStatus(fileId, 'parsed');
    console.log(`✅ Done: ${fileId}`, { fileId: result.fileId });
  } catch (error) {
    const isFinalAttempt = attempt >= maxAttempts;
    console.error(`❌ Failed: ${fileId} (attempt ${attempt}/${maxAttempts})`, error);
    // Only show "failed" once retries are exhausted; until then it's waiting to retry.
    await updateStatus(fileId, isFinalAttempt ? 'failed' : 'uploaded').catch((statusError) => {
      console.error(`Failed to update status for file ${fileId}:`, statusError);
    });
    throw error;
  }
};

let worker: Worker<PdfJobData> | null = null;

export const startPdfWorker = () => {
  if (worker) {
    return;
  }

  worker = new Worker<PdfJobData>(PDF_QUEUE_NAME, processPdfJob, {
    connection: redisConnection,
    concurrency: 2,
    // Comfortably above the S3 download + Gemini parse timeout (GEMINI_PARSE_TIMEOUT_MS).
    lockDuration: 5 * 60 * 1000,
  });

  worker.on('error', (error) => {
    console.error('❌ PDF worker error:', error);
  });

  console.log(`✅ PDF worker listening on queue "${PDF_QUEUE_NAME}"`);
};

export const stopPdfWorker = async () => {
  if (!worker) {
    return;
  }

  console.log('Shutting down PDF worker...');
  await worker.close();
  worker = null;
};
