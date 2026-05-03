import { Queue } from "bullmq";
import { connection } from "../../config/redis.js";

export const pdfQueue = new Queue("pdf-processing", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const addPdfJob = async (data: {
  fileId: string;
  s3Url: string;
  s3key: string;
  workspaceId: number;
}) => {
  return await pdfQueue.add("parse-pdf", data);
};