import { GROQ_MODEL, groqClient } from '../config/groq.js';
import { buildResumeParsingPrompt } from '../utils/prompt.js';
import { extractJsonFromModelText, jsonToStringArray } from '../utils/helper.js';
import { RESUME_BUCKET, s3 } from '../config/aws.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { PDFParse } from 'pdf-parse';
import { prisma } from '../utils/prismaClient.js';
import type { Confidence } from '../../generated/prisma/enums.js';

type ParsedResume = Awaited<ReturnType<typeof parseResume>>;

const streamToBuffer = async (stream: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const extractText = async (bucket: string, key: string) => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);

  if (!response.Body) throw new Error("Empty S3 object body");

  const buffer = await streamToBuffer(response.Body as NodeJS.ReadableStream);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
};


export const parseResume = async (pdfText: string) => {
  const prompt = buildResumeParsingPrompt(pdfText);

  const response = await groqClient.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
  });
  const text = response.choices[0]?.message?.content || '';

  const jsonText = extractJsonFromModelText(text);
  const parsed = JSON.parse(jsonText) as {
    profile?: Record<string, unknown>;
    essays?: Array<{ title?: unknown; content?: unknown }>;
    parsedFields?: Array<{ field?: unknown; value?: unknown; confidence?: unknown; source?: unknown }>;
  };

  const profile = parsed.profile || {};
  const safeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const safeArray = (value: unknown) => jsonToStringArray(value);

  const essays = Array.isArray(parsed.essays)
    ? parsed.essays
        .map((essay) => ({
          title: safeString(essay?.title),
          content: safeString(essay?.content),
        }))
        .filter((essay) => essay.title || essay.content)
    : [];

  const parsedFields = Array.isArray(parsed.parsedFields)
    ? parsed.parsedFields
        .map((field) => {
          const confidence = field?.confidence;
          const safeConfidence: Confidence =
            confidence === 'high' || confidence === 'medium' || confidence === 'low'
              ? confidence
              : 'low';
          return {
            field: safeString(field?.field),
            value: safeString(field?.value),
            confidence: safeConfidence,
            source: safeString(field?.source),
          };
        })
        .filter((field) => field.field || field.value)
    : [];

  return {
    profile: {
      name: safeString(profile.name),
      email: safeString(profile.email),
      board: safeString(profile.board),
      grade10: safeString(profile.grade10),
      grade12: safeString(profile.grade12),
      gpa: safeString(profile.gpa),
      degree: safeString(profile.degree),
      summary: safeString(profile.summary),
      activities: safeArray(profile.activities),
      achievements: safeArray(profile.achievements),
      strengths: safeArray(profile.strengths),
      growthAreas: safeArray(profile.growthAreas),
      skills: safeArray(profile.skills),
    },
    essays,
    parsedFields,
  };
};

export const parseResumeFile = async (fileId: number) => {

  const resumeFile = await prisma.resumeFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      resumeKey: true,
    },
  });

  if (!resumeFile) {
    throw new Error('Resume file not found');
  }

  const rawText = await extractText(RESUME_BUCKET, resumeFile.resumeKey);
  const parsed = await parseResume(rawText);

  return {
    fileId: resumeFile.id,
    rawText,
    parsed,
    parsedText: JSON.stringify(parsed),
  };
};

export const saveParsedResume = async (
  fileId: number,
  parsed: ParsedResume,
  workspaceId: number
) => {
  const resumeFile = await prisma.resumeFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      resumeUrl: true,
      resumeKey: true,
      candidateId: true,
    },
  });

  if (!resumeFile) {
    throw new Error('Resume file not found');
  }

  if (resumeFile.candidateId) {
    throw new Error('Resume file is already linked to a candidate');
  }

  const email = parsed.profile.email || `unknown+${fileId}@example.local`;
  const name = parsed.profile.name || 'Unknown Candidate';

  return await prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.create({
      data: {
        name,
        email,
        resume: resumeFile.resumeUrl,
        resumeKey: resumeFile.resumeKey,
        board: parsed.profile.board || '',
        grade10: parsed.profile.grade10 || '',
        grade12: parsed.profile.grade12 || '',
        gpa: parsed.profile.gpa || '',
        degree: parsed.profile.degree || '',
        summary: parsed.profile.summary || null,
        activities: parsed.profile.activities,
        achievements: parsed.profile.achievements,
        strengths: parsed.profile.strengths,
        growthAreas: parsed.profile.growthAreas,
        skills: parsed.profile.skills,
        workspaceId,
      },
    });

    if (parsed.essays.length > 0) {
      await tx.essay.createMany({
        data: parsed.essays.map((essay) => ({
          title: essay.title,
          content: essay.content,
          candidateId: candidate.id,
        })),
      });
    }

    if (parsed.parsedFields.length > 0) {
      await tx.parsedField.createMany({
        data: parsed.parsedFields.map((field) => ({
          field: field.field,
          value: field.value,
          confidence: field.confidence,
          source: field.source,
          candidateId: candidate.id,
        })),
      });
    }

    await tx.resumeFile.update({
      where: { id: resumeFile.id },
      data: { candidateId: candidate.id },
    });

    return {
      candidateId: candidate.id,
      fileId: resumeFile.id,
    };
  });
};

