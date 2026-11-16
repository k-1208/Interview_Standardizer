import { Queue } from 'bullmq';
import { redisConnection, EMAIL_QUEUE_NAME } from '../../config/redis.js';

export interface EmailJobData {
  type:
    | 'workspace-invite'
    | 'interview-link'
    | 'interview-completed-notification'
    | 'candidate-assigned-notification';
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  cc?: string[];
  metadata?: Record<string, unknown>;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const addEmailJob = async (jobData: EmailJobData) => {
  try {
    await emailQueue.add(`email-${jobData.type}`, jobData);
    return { type: jobData.type, to: jobData.to };
  } catch (error) {
    console.error('[emailQueue] Failed to enqueue email job:', error);
    throw error;
  }
};
