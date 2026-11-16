import { Queue } from 'bullmq';
import { redisConnection, PDF_QUEUE_NAME } from '../../config/redis.js';

export type PdfJobData = {
  fileId: string;
  s3Url: string;
  s3key: string;
  workspaceId: number;
};

export const pdfQueue = new Queue<PdfJobData>(PDF_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const addPdfJob = async (data: PdfJobData) => {
  await pdfQueue.add('parse-pdf', data);
  return { fileId: data.fileId };
};
