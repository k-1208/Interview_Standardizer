import { Worker, type Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { connection } from '../../config/redis.js';
import type { EmailJobData } from './email.queue.js';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
};

const transporter = createTransporter();

export const emailWorker = new Worker<EmailJobData>(
  'email-dispatch',
  async (job: Job<EmailJobData>) => {
    const { to, subject, html, text, cc, type } = job.data;
    console.log(`[EmailWorker] Processing job ${job.id} (${type})`);

    const mailFrom = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    if (!to) {
      throw new Error('[EmailWorker] Recipient email is required');
    }

    if (!mailFrom) {
      throw new Error('[EmailWorker] SMTP_FROM_EMAIL or SMTP_USER must be configured');
    }

    const mailOptions = {
      from: mailFrom,
      to,
      cc,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailWorker] Email sent successfully! MessageId: ${info.messageId}`);
    return { messageId: info.messageId };
  },
  { connection }
);

emailWorker.on('completed', (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed successfully.`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed with error:`, err);
});
