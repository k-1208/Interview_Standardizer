import { GEMINI_MODEL, geminiClient } from '../config/gemini.js';
import { buildResumeParsingPrompt } from '../utils/prompt.js';
import { extractJsonFromModelText, jsonToStringArray } from '../utils/helper.js';
import { s3 } from '../config/aws.js';
import {GetObjectCommand} from "@aws-sdk/client-s3";
import { PDFParse } from 'pdf-parse';

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
  const parser = new PDFParse({data: buffer});
  const result = await parser.getText();

  await parser.destroy();

  return result;
};


export const parseResume = async (pdfText: string) => {
  const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await model.generateContent(buildResumeParsingPrompt(pdfText));
  const text = result.response.text();
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
          const safeConfidence =
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

