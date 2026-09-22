import { serviceBusClient, SERVICE_BUS_QUEUE_NAME } from '../../config/serviceBus.js';

export type PdfJobData = {
  fileId: string;
  s3Url: string;
  s3key: string;
  workspaceId: number;
};

const sender = serviceBusClient.createSender(SERVICE_BUS_QUEUE_NAME);

export const addPdfJob = async (data: PdfJobData) => {
  await sender.sendMessages({
    body: data,
    contentType: 'application/json',
    applicationProperties: {
      jobName: 'parse-pdf',
    },
  });

  return { fileId: data.fileId };
};
