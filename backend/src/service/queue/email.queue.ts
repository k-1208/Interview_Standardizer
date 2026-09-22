import { serviceBusClient, SERVICE_BUS_EMAIL_QUEUE_NAME } from '../../config/serviceBus.js';

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
  cc?: string[];
  metadata?: Record<string, unknown>;
}

const sender = serviceBusClient.createSender(SERVICE_BUS_EMAIL_QUEUE_NAME);

export const addEmailJob = async (jobData: EmailJobData) => {
  try {
    await sender.sendMessages({
      body: jobData,
      contentType: 'application/json',
      applicationProperties: {
        jobName: `email-${jobData.type}`,
      },
    });

    return { type: jobData.type, to: jobData.to };
  } catch (error) {
    console.error('[emailQueue] Failed to enqueue email job:', error);
    throw error;
  }
};
