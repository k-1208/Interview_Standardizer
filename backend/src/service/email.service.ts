import nodemailer from 'nodemailer';
import { prisma } from '../utils/prismaClient.js';
import dotenv from 'dotenv';
import { generateInterviewEmailTemplate } from '../utils/email.js';

dotenv.config();

type HttpError = Error & { statusCode: number };

const createHttpError = (message: string, statusCode: number): HttpError => {
	const err = new Error(message) as HttpError;
	err.statusCode = statusCode;
	return err;
};

const createTransporter = () => {
	const config = {
		host: process.env.SMTP_HOST || 'smtp.gmail.com',
		port: parseInt(process.env.SMTP_PORT || '587'),
		secure: false, // true for 465, false for other ports
		auth: {
			user: process.env.SMTP_USER || '',
			pass: process.env.SMTP_PASS || '',
		},
	};

	return nodemailer.createTransport(config);
};

const transporter = createTransporter();

export const sendEmail = async (
	subject: string,
	htmlContent: string,
	textContent: string,
	to: string,
	from: string,
	candidateId?: string,
	campaignId?: string,
	cc?: string | string[]
) => {
	// validations check
	if (!subject) throw createHttpError('Email subject is required', 400);
	if (!htmlContent && !textContent) throw createHttpError('Email content is required', 400);
	if (!to) throw createHttpError('Recipient email is required', 400);
	if (!from) throw createHttpError('Sender email is required', 400);
	if (!candidateId) throw createHttpError('Candidate ID is required', 400);

	// Verify candidate exists
	const candidate = await prisma.candidate.findUnique({
		where: { id: candidateId },
	});

	if (!candidate) {
		throw createHttpError('Candidate not found', 404);
	}

	if (campaignId) {
		const campaignDelegate = (prisma as any).campaign;
		if (campaignDelegate?.findUnique) {
			const campaign = await campaignDelegate.findUnique({
				where: { id: campaignId },
			});

			if (!campaign) {
				throw createHttpError('Campaign not found', 404);
			}
		}
	}

	let ccRecipients: string[] = [];
	if (cc) {
		if (Array.isArray(cc)) {
			ccRecipients = cc;
		} else {
			ccRecipients = [cc];
		}
	}

	const uniqueId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

	const mailOptions = {
		from: from || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
		to: to,
		cc: ccRecipients.length > 0 ? ccRecipients : undefined,
		subject: subject,
		text: textContent,
		html: htmlContent,
		headers: {
			'X-unique-id': uniqueId,
		},
	};

	const info = await transporter.sendMail(mailOptions);
	console.log('Email sent:', info.messageId);
};

export const sendInterviewEmail = async (
	candidateEmail: string,
	candidateName: string,
	interviewLink: string,
	campaignName: string,
	jobTitle: string,
	candidateId: string,
	campaignId: string
) => {
	const { subject, htmlContent, textContent } = generateInterviewEmailTemplate({
		candidateName,
		jobTitle,
		campaignName,
		interviewLink,
	});

	const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER!;

	return await sendEmail(
		subject,
		htmlContent,
		textContent,
		candidateEmail,
		from,
		candidateId,
		campaignId
	);
};
