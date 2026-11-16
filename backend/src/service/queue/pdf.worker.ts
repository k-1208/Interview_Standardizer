import { Worker, type Job } from 'bullmq';
import { redisConnection, PDF_QUEUE_NAME } from '../../config/redis.js';
import { updateStatus } from '../upload.service.js';
import { parseResumeFile, saveParsedResume } from '../resume.service.js';
import type { PdfJobData } from './pdf.queue.js';

const processPdfJob = async (job: Job<PdfJobData>) => {
  const { fileId, workspaceId } = job.data;

  console.log(`📄 Processing file: ${fileId} (attempt ${job.attemptsMade + 1})`);

  try {
    await updateStatus(fileId, 'parsing');

    const result = await parseResumeFile(Number(fileId));
    console.log('📊 Parsed resume data:', result);

    const saved = await saveParsedResume(result.fileId, result.parsed, workspaceId);
    console.log('📝 Saved parsed resume:', saved);

    await updateStatus(fileId, 'parsed');
    console.log(`✅ Done: ${fileId}`, { fileId: result.fileId });
  } catch (error) {
    console.error(`❌ Failed: ${fileId}`, error);
    await updateStatus(fileId, 'failed').catch((statusError) => {
      console.error(`Failed to mark file ${fileId} as failed:`, statusError);
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
    lockDuration: 15 * 60 * 1000,
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
