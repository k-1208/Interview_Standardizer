import { Worker, Job } from "bullmq";
import { connection } from "../../config/redis.js";
import { updateStatus } from "../upload.service.js";
import { parseResumeFile, saveParsedResume } from "../resume.service.js";

const worker = new Worker(
  "pdf-processing",
  async (job: Job) => {
    const { fileId, workspaceId } = job.data;

    console.log(`📄 Processing file: ${fileId}`);

    try {
      // 1. Update DB → processing
      await updateStatus(fileId, "parsing");

      // 2. Extract + parse resume
      const result = await parseResumeFile(Number(fileId));
      console.log("📊 Parsed resume data:", result);
      await job.updateProgress(70);

      // 3. Save parsed data into the candidate tables
      const saved = await saveParsedResume(result.fileId, result.parsed, workspaceId);
      console.log("📝 Saved parsed resume:", saved);

      // 4. Update DB → completed
      await updateStatus(fileId, "parsed");

      console.log(`✅ Done: ${fileId}`, { fileId: result.fileId });
    } catch (error) {
      console.error(`❌ Failed: ${fileId}`, error);
      throw error; 
    }
  },
  {
    connection,
    concurrency: 2, 
  }
);

worker.on("completed", (job) => {
  console.log(`🎉 Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`💥 Job failed: ${job?.id}`, err);
});