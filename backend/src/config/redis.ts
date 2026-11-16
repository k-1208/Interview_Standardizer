import type { ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const PDF_QUEUE_NAME = process.env.PDF_QUEUE_NAME || 'pdf-processing';
export const EMAIL_QUEUE_NAME = process.env.EMAIL_QUEUE_NAME || 'email-dispatch';

// BullMQ workers use blocking commands, so retries-per-request must be disabled.
export const redisConnection: ConnectionOptions = {
  url: redisUrl,
  maxRetriesPerRequest: null,
};
