import type { ProcessErrorArgs, ServiceBusReceivedMessage } from '@azure/service-bus';
import nodemailer from 'nodemailer';
import { serviceBusClient, SERVICE_BUS_EMAIL_QUEUE_NAME } from '../../config/serviceBus.js';
import type { EmailJobData } from './email.queue.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const receiver = serviceBusClient.createReceiver(SERVICE_BUS_EMAIL_QUEUE_NAME, {
  receiveMode: 'peekLock',
  maxAutoLockRenewalDurationInMs: 5 * 60 * 1000,
});

const processEmailJob = async (message: ServiceBusReceivedMessage) => {
  const jobData = message.body as EmailJobData;
  const { to, subject, html, text, from, cc, type } = jobData;
  console.log(`[EmailWorker] Processing ${type} -> To: ${to}`);

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

let isRunning = false;

export const startEmailWorker = () => {
  if (isRunning) {
    return;
  }

  receiver.subscribe(
    {
      processMessage: processEmailJob,
      processError: async (args: ProcessErrorArgs) => {
        console.error('❌ Email worker error:', args.error);
      },
    },
    {
      maxConcurrentCalls: 2,
      autoCompleteMessages: true,
    }
  );

  isRunning = true;
  console.log(`✅ Email worker listening on queue "${SERVICE_BUS_EMAIL_QUEUE_NAME}"`);
};

export const stopEmailWorker = async () => {
  if (!isRunning) {
    return;
  }

  console.log('Shutting down email worker...');
  await receiver.close();
  isRunning = false;
};
