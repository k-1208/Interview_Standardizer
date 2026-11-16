import dotenv from 'dotenv';
import { startPdfWorker, stopPdfWorker } from './service/queue/pdf.worker.js';
import { startEmailWorker, stopEmailWorker } from './service/queue/email.worker.js';

dotenv.config();

startPdfWorker();
startEmailWorker();

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}; shutting down workers...`);
  await Promise.all([stopPdfWorker(), stopEmailWorker()]);
  process.exit(0);
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
