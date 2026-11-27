import dotenv from 'dotenv';
import { installProcessHandlers } from './utils/processHandlers.js';
import { assertStartupSettings } from './config/startupChecks.js';

dotenv.config();
installProcessHandlers('worker');

try {
  assertStartupSettings();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const { startPdfWorker, stopPdfWorker } = await import('./service/queue/pdf.worker.js');
const { startEmailWorker, stopEmailWorker } = await import('./service/queue/email.worker.js');

startPdfWorker();
startEmailWorker();

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}; shutting down workers...`);
  await Promise.all([stopPdfWorker(), stopEmailWorker()]);
  process.exit(0);
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
