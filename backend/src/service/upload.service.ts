import type { Express } from 'express';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { RESUME_BUCKET, s3 } from '../config/aws.js';
import { prisma } from '../utils/prismaClient.js';
import { addPdfJob } from './queue/pdf.queue.js';

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export interface UploadedPdfResult {
  originalName: string;
  mimeType: string;
  size: number;
  resumeUrl: string;
  resumeKey: string;
  candidateId: string | null;
}

export const processUploadedPdf = async (
  files: Express.Multer.File[]
): Promise<UploadedPdfResult[]> => {
  if (!RESUME_BUCKET) {
    throw new Error('RESUME_BUCKET is not configured');
  }

  const results: UploadedPdfResult[] = [];

  console.log("upload hit")

  for (const file of files) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExtension = extension === '.pdf';

    if (!isPdfMime && !isPdfExtension) {
      throw new Error('Only PDF files are allowed');
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      throw new Error('File size exceeds 10 MB limit');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('Uploaded file buffer is empty');
    }

    const safeOriginalName = file.originalname.replace(/\s+/g, '-');
    const key = `resumes/${Date.now()}-${safeOriginalName}`;

    const command = new PutObjectCommand({
      Bucket: RESUME_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    const resumeUrl = `https://${RESUME_BUCKET}.s3.amazonaws.com/${key}`;

    const resumeFile = await prisma.resumeFile.create({
      data: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        resumeUrl,
        resumeKey: key,
        status: 'uploaded',
      },
    });

    await addPdfJob({
      fileId: String(resumeFile.id),
      s3Url: resumeUrl,
      s3key: key,
    });

    console.log("📊 Added PDF job:", { fileId: String(resumeFile.id) });

    results.push({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      resumeUrl,
      resumeKey: key,
      candidateId: null,
    });
  }

  return results;
};


export const updateStatus = async (fileId: string, status: 'uploaded' | 'parsing' | 'parsed' | 'failed') => {
  await prisma.resumeFile.update({
    where: { id: Number(fileId) },
    data: { status },
  });
};
