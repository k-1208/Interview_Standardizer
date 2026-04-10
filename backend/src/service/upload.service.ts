import type { Express } from 'express';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { RESUME_BUCKET, s3 } from '../config/aws.js';
import { prisma } from '../utils/prismaClient.js';

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export interface UploadedPdfResult {
  originalName: string;
  mimeType: string;
  size: number;
  resumeUrl: string;
  resumeKey: string;
  candidateId: string;
}

export const processUploadedPdf = async (
  file: Express.Multer.File,
  candidateId: string
): Promise<UploadedPdfResult> => {
  if (!RESUME_BUCKET) {
    throw new Error('RESUME_BUCKET is not configured');
  }

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

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      resume: resumeUrl,
      resumeKey: key,
    },
  });

  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    resumeUrl,
    resumeKey: key,
    candidateId,
  };
};
