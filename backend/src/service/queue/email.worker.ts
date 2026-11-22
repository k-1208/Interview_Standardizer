import { Worker, type Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { redisConnection, EMAIL_QUEUE_NAME } from '../../config/redis.js';
import type { EmailJobData } from './email.queue.js';
import { maskEmail } from '../../utils/redact.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const processEmailJob = async (job: Job<EmailJobData>) => {
  const jobData = job.data;
  const { to, subject, html, text, from, cc, type } = jobData;
  console.log(`[EmailWorker] Processing ${type} -> To: ${maskEmail(to)}`);

  const mailFrom = from || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  if (!to) {
    throw new Error('[EmailWorker] Recipient email is required');
  }

  const info = await transporter.sendMail({
    from: mailFrom,
    to,
    cc,
    subject,
    html,
    text,
  });

  console.log(`[EmailWorker] Email sent successfully! MessageId: ${info.messageId}`);
};

let worker: Worker<EmailJobData> | null = null;

export const startEmailWorker = () => {
  if (worker) {
    return;
  }

  worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: redisConnection,
    concurrency: 2,
  });

  worker.on('error', (error) => {
    console.error('❌ Email worker error:', error);
  });

  console.log(`✅ Email worker listening on queue "${EMAIL_QUEUE_NAME}"`);
};

export const stopEmailWorker = async () => {
  if (!worker) {
    return;
  }

  console.log('Shutting down email worker...');
  await worker.close();
  worker = null;
};
