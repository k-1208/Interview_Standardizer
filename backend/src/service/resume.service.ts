import { GEMINI_MODEL, geminiClient } from '../config/gemini.js';
import { buildResumeParsingPrompt } from '../utils/prompt.js';
import { extractJsonFromModelText, jsonToStringArray } from '../utils/helper.js';
import { RESUME_BUCKET, s3 } from '../config/aws.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { PDFParse } from 'pdf-parse';
import { prisma } from '../utils/prismaClient.js';
import type { Confidence } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';

type ParsedResume = {
  profile: {
    name: string;
    email: string;
    board: string;
    grade10: string;
    grade12: string;
    gpa: string;
    degree: string;
    summary: string;
    activities: string[];
    achievements: string[];
    strengths: string[];
    growthAreas: string[];
    skills: string[];
    academicRecords: AcademicRecord[];
    competitiveExams: CompetitiveExam[];
  };
  essays: Array<{ title: string; content: string }>;
  parsedFields: Array<{ field: string; value: string; confidence: Confidence; source: string }>;
};

type EnrichedParsedField = {
  field: string;
  value: string;
  confidence: Confidence;
  source: string;
  payload: Prisma.InputJsonValue;
};

type AcademicRecord = {
  standard: string;
  schoolName: string;
  board: string;
  yearOfPassing: string;
  markingScheme: string;
  obtainedPercentageOrCgpa: string;
  subjects: Array<{
    subject: string;
    maximumMarksOrGrade: string;
    obtainedMarksOrGrade: string;
  }>;
};

type CompetitiveExam = {
  examName: string;
  status: string | null;
  testDate: string | null;
  rollNumber: string | null;
  sectionScores: Array<{
    section: string;
    score: string;
  }>;
  totalScore: string | null;
  rankOrPercentile: string | null;
  result: string | null;
};

const buildSummary = (parts: Array<string | null>) => parts.filter(Boolean).join(' | ');

const buildAcademicRecordFieldRows = (records: AcademicRecord[]): EnrichedParsedField[] =>
  records.flatMap((record) => {
    const subjectRows: EnrichedParsedField[] = record.subjects.map((subject) => ({
      field: `${record.standard || 'Academic'} - ${subject.subject || 'Subject'}`,
      value: buildSummary([
        subject.maximumMarksOrGrade ? `Max: ${subject.maximumMarksOrGrade}` : null,
        subject.obtainedMarksOrGrade ? `Obtained: ${subject.obtainedMarksOrGrade}` : null,
      ]),
      confidence: 'low',
      source: 'academicRecords.subjects',
      payload: {
        standard: record.standard,
        schoolName: record.schoolName,
        board: record.board,
        yearOfPassing: record.yearOfPassing,
        markingScheme: record.markingScheme,
        obtainedPercentageOrCgpa: record.obtainedPercentageOrCgpa,
        subject,
      },
    }));

    return [
      {
        field: record.standard || 'Academic Record',
        value: buildSummary([
          record.standard ? `Standard: ${record.standard}` : null,
          record.schoolName ? `School: ${record.schoolName}` : null,
          record.board ? `Board: ${record.board}` : null,
          record.yearOfPassing ? `Year: ${record.yearOfPassing}` : null,
          record.markingScheme ? `Marking Scheme: ${record.markingScheme}` : null,
          record.obtainedPercentageOrCgpa ? `Obtained: ${record.obtainedPercentageOrCgpa}` : null,
        ]),
        confidence: 'low',
        source: 'academicRecords',
        payload: record,
      },
      ...subjectRows,
    ];
  });

const buildCompetitiveExamFieldRows = (exams: CompetitiveExam[]): EnrichedParsedField[] =>
  exams.flatMap((exam) => {
    const sectionRows: EnrichedParsedField[] = exam.sectionScores.map((section) => ({
      field: `${exam.examName || 'Competitive Exam'} - ${section.section || 'Section'}`,
      value: section.score ? `Score: ${section.score}` : '',
      confidence: 'low',
      source: 'competitiveExams.sectionScores',
      payload: {
        examName: exam.examName,
        status: exam.status,
        testDate: exam.testDate,
        rollNumber: exam.rollNumber,
        totalScore: exam.totalScore,
        rankOrPercentile: exam.rankOrPercentile,
        result: exam.result,
        section,
      },
    }));

    return [
      {
        field: exam.examName || 'Competitive Exam',
        value: buildSummary([
          exam.examName ? `Exam: ${exam.examName}` : null,
          exam.status ? `Status: ${exam.status}` : null,
          exam.testDate ? `Test Date: ${exam.testDate}` : null,
          exam.rollNumber ? `Roll Number: ${exam.rollNumber}` : null,
          exam.totalScore ? `Total Score: ${exam.totalScore}` : null,
          exam.rankOrPercentile ? `Rank/Percentile: ${exam.rankOrPercentile}` : null,
          exam.result ? `Result: ${exam.result}` : null,
        ]),
        confidence: 'low',
        source: 'competitiveExams',
        payload: exam,
      },
      ...sectionRows,
    ];
  });

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


export const parseResume = async (pdfText: string): Promise<ParsedResume> => {
  const prompt = buildResumeParsingPrompt(pdfText);

  const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });
  const response = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }],
    }],
    generationConfig: { temperature: 0.7 },
  });
  
  const text = response.response.text();

  const jsonText = extractJsonFromModelText(text);
  const parsed = JSON.parse(jsonText) as {
    profile?: Record<string, unknown>;
    essays?: Array<{ title?: unknown; content?: unknown }>;
    parsedFields?: Array<{ field?: unknown; value?: unknown; confidence?: unknown; source?: unknown }>;
  };
  const profile = parsed.profile || {};
  const safeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const safeArray = (value: unknown) => jsonToStringArray(value);
  const safeNestedArray = (value: unknown) => (Array.isArray(value) ? value : []);

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

  const academicRecords = safeNestedArray(profile.academicRecords).map((record) => ({
    standard: safeString((record as Record<string, unknown>)?.standard),
    schoolName: safeString((record as Record<string, unknown>)?.schoolName),
    board: safeString((record as Record<string, unknown>)?.board),
    yearOfPassing: safeString((record as Record<string, unknown>)?.yearOfPassing),
    markingScheme: safeString((record as Record<string, unknown>)?.markingScheme),
    obtainedPercentageOrCgpa: safeString((record as Record<string, unknown>)?.obtainedPercentageOrCgpa),
    subjects: safeNestedArray((record as Record<string, unknown>)?.subjects).map((subject) => ({
      subject: safeString((subject as Record<string, unknown>)?.subject),
      maximumMarksOrGrade: safeString((subject as Record<string, unknown>)?.maximumMarksOrGrade),
      obtainedMarksOrGrade: safeString((subject as Record<string, unknown>)?.obtainedMarksOrGrade),
    })),
  }));

  const competitiveExams = safeNestedArray(profile.competitiveExams).map((exam) => ({
    examName: safeString((exam as Record<string, unknown>)?.examName),
    status: safeString((exam as Record<string, unknown>)?.status) || null,
    testDate: safeString((exam as Record<string, unknown>)?.testDate) || null,
    rollNumber: safeString((exam as Record<string, unknown>)?.rollNumber) || null,
    sectionScores: safeNestedArray((exam as Record<string, unknown>)?.sectionScores).map((section) => ({
      section: safeString((section as Record<string, unknown>)?.section),
      score: safeString((section as Record<string, unknown>)?.score),
    })),
    totalScore: safeString((exam as Record<string, unknown>)?.totalScore) || null,
    rankOrPercentile: safeString((exam as Record<string, unknown>)?.rankOrPercentile) || null,
    result: safeString((exam as Record<string, unknown>)?.result) || null,
  }));

  const academicRecordFields = buildAcademicRecordFieldRows(academicRecords);
  const competitiveExamFields = buildCompetitiveExamFieldRows(competitiveExams);

  const result = {
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
      academicRecords,
      competitiveExams,
    },
    essays,
    parsedFields,
  };

  return postProcess(result);
};

function postProcess(parsed: ParsedResume): ParsedResume {
  const records: AcademicRecord[] = parsed.profile.academicRecords ?? [];
  console.log('records are', records);

  const rec10 = records.find((r: AcademicRecord) => r.standard === '10th');
  const rec12 = records.find((r: AcademicRecord) => r.standard === '12th');

  // Always overwrite — never trust LLM for these two fields
  parsed.profile.grade10 = rec10?.obtainedPercentageOrCgpa ?? '';
  parsed.profile.grade12 = rec12?.obtainedPercentageOrCgpa ?? '';

  if (rec12) {
    parsed.profile.board = rec12.board || parsed.profile.board;
    parsed.profile.gpa = rec12.obtainedPercentageOrCgpa
      ? `${rec12.obtainedPercentageOrCgpa} (${rec12.markingScheme})`
      : '';
  }

  return parsed;
}

const buildEnrichedParsedFields = (parsed: ParsedResume): EnrichedParsedField[] => {
  const parsedFieldRows: EnrichedParsedField[] = parsed.parsedFields.map((field: { field: string; value: string; confidence: Confidence; source: string }) => ({
    field: field.field,
    value: field.value,
    confidence: field.confidence,
    source: field.source,
    payload: { source: 'parsedFields' },
  }));

  const academicRecordRows = buildAcademicRecordFieldRows(parsed.profile.academicRecords);
  const competitiveExamRows = buildCompetitiveExamFieldRows(parsed.profile.competitiveExams);

  return [...parsedFieldRows, ...academicRecordRows, ...competitiveExamRows];
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
  console.log('[saveParsedResume] start', { fileId, workspaceId });

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
    console.error('[saveParsedResume] resume file not found', { fileId });
    throw new Error('Resume file not found');
  }

  if (resumeFile.candidateId) {
    console.warn('[saveParsedResume] resume file already linked', {
      fileId,
      candidateId: resumeFile.candidateId,
    });
    throw new Error('Resume file is already linked to a candidate');
  }

  const email = parsed.profile.email || `unknown+${fileId}@example.local`;
  const name = parsed.profile.name || `Applicant ${fileId}`;

  console.log('[saveParsedResume] creating candidate', {
    fileId,
    workspaceId,
    name,
    email,
  });

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

    console.log('[saveParsedResume] candidate created', {
      fileId,
      candidateId: candidate.id,
    });

    // Save academic records
    if (parsed.profile.academicRecords.length > 0) {
      for (const record of parsed.profile.academicRecords) {
        await tx.academicRecord.create({
          data: {
            standard: record.standard,
            schoolName: record.schoolName,
            board: record.board,
            yearOfPassing: record.yearOfPassing,
            markingScheme: record.markingScheme,
            obtainedPercentageOrCgpa: record.obtainedPercentageOrCgpa,
            candidateId: candidate.id,
            subjects: {
              createMany: {
                data: record.subjects.map((subject) => ({
                  subject: subject.subject,
                  maximumMarksOrGrade: subject.maximumMarksOrGrade,
                  obtainedMarksOrGrade: subject.obtainedMarksOrGrade,
                })),
              },
            },
          },
        });
      }
    }

    // Save competitive exams
    if (parsed.profile.competitiveExams.length > 0) {
      for (const exam of parsed.profile.competitiveExams) {
        await tx.competitiveExam.create({
          data: {
            examName: exam.examName,
            status: exam.status,
            testDate: exam.testDate,
            rollNumber: exam.rollNumber,
            totalScore: exam.totalScore,
            rankOrPercentile: exam.rankOrPercentile,
            result: exam.result,
            candidateId: candidate.id,
            sectionScores: {
              createMany: {
                data: exam.sectionScores.map((section) => ({
                  section: section.section,
                  score: section.score,
                })),
              },
            },
          },
        });
      }
    }

      if (parsed.essays.length > 0) {
        await tx.essay.createMany({
          data: parsed.essays.map((essay: { title: string; content: string }) => ({
            title: essay.title,
            content: essay.content,
            candidateId: candidate.id,
          })),
        });
      }

      const enrichedParsedFields = buildEnrichedParsedFields(parsed);

    if (enrichedParsedFields.length > 0) {
      await tx.parsedField.createMany({
        data: enrichedParsedFields.map((field) => ({
          field: field.field,
          value: field.value,
          confidence: field.confidence,
          source: field.source,
          payload: field.payload,
          candidateId: candidate.id,
        })),
      });
    }

    console.log('[saveParsedResume] updating resumeFile with candidateId', {
      fileId: resumeFile.id,
      candidateId: candidate.id,
    });

    await tx.resumeFile.update({
      where: { id: resumeFile.id },
      data: { candidateId: candidate.id },
    });

    console.log('[saveParsedResume] resumeFile updated', {
      fileId: resumeFile.id,
      candidateId: candidate.id,
    });

    return {
      candidateId: candidate.id,
      fileId: resumeFile.id,
    };
  });
};

