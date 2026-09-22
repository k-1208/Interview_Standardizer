import type { ProcessErrorArgs, ServiceBusReceivedMessage } from '@azure/service-bus';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serviceBusClient, SERVICE_BUS_QUEUE_NAME } from '../../config/serviceBus.js';
import { updateStatus } from '../upload.service.js';
import { parseResumeFile, saveParsedResume } from '../resume.service.js';
import type { PdfJobData } from './pdf.queue.js';

const receiver = serviceBusClient.createReceiver(SERVICE_BUS_QUEUE_NAME, {
  receiveMode: 'peekLock',
  maxAutoLockRenewalDurationInMs: 15 * 60 * 1000,
});

const processPdfJob = async (message: ServiceBusReceivedMessage) => {
  const { fileId, workspaceId } = message.body as PdfJobData;

  console.log(`📄 Processing file: ${fileId}`);

  try {
    await updateStatus(fileId, 'parsing');

    const result = await parseResumeFile(Number(fileId));
    console.log('📊 Parsed resume data:', result);

    const saved = await saveParsedResume(result.fileId, result.parsed, workspaceId);
    console.log('📝 Saved parsed resume:', saved);

    await updateStatus(fileId, 'parsed');
    console.log(`✅ Done: ${fileId}`, { fileId: result.fileId });
  } catch (error) {
    console.error(`❌ Failed: ${fileId}`, error);
    await updateStatus(fileId, 'failed').catch((statusError) => {
      console.error(`Failed to mark file ${fileId} as failed:`, statusError);
    });
    throw error;
  }
};

let isRunning = false;

export const startPdfWorker = () => {
  if (isRunning) {
    return;
  }

  receiver.subscribe(
    {
      processMessage: processPdfJob,
      processError: async (args: ProcessErrorArgs) => {
        console.error('❌ Service Bus worker error:', args.error);
      },
    },
    {
      maxConcurrentCalls: 2,
      autoCompleteMessages: true,
    }
  );

  isRunning = true;
  console.log(`✅ PDF worker listening on queue "${SERVICE_BUS_QUEUE_NAME}"`);
};

export const stopPdfWorker = async () => {
  if (!isRunning) {
    return;
  }

  console.log('Shutting down PDF worker...');
  await receiver.close();
  await serviceBusClient.close();
  isRunning = false;
};

// Keep the standalone worker command working for local use.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  startPdfWorker();
}
