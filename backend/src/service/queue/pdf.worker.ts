import { Worker, Job } from "bullmq";
import { connection } from "../../config/redis.js";
import { updateStatus } from "../upload.service.js";

const worker = new Worker(
  "pdf-processing",
  async (job: Job) => {
    const { fileId, s3Url, s3key } = job.data;

    console.log(`📄 Processing file: ${fileId}`);

    try {
      // 1. Update DB → processing
      await updateStatus(fileId, "parsing");

      

      await new Promise((res) => setTimeout(res, 2000));

      // 4. Save parsed data
      // await saveParsedData(fileId, result);

      // 5. Update DB → completed
      // await updateStatus(fileId, "completed");

      console.log(`✅ Done: ${fileId}`);
    } catch (error) {
      console.error(`❌ Failed: ${fileId}`, error);
      throw error; 
    }
  },
  {
    connection,
    concurrency: 2, // 🔥 parallel processing
  }
);

worker.on("completed", (job) => {
  console.log(`🎉 Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`💥 Job failed: ${job?.id}`, err);
});