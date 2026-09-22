import { Queue } from 'bullmq';
import { connection } from '../../config/redis.js';

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

export const emailQueue = new Queue<EmailJobData>('email-dispatch', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const addEmailJob = async (jobData: EmailJobData) => {
  try {
    return await emailQueue.add(`email-${jobData.type}-${Date.now()}`, jobData);
  } catch (error) {
    console.error('[emailQueue] Failed to enqueue email job:', error);
    throw error;
  }
};
