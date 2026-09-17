import { prisma } from '../utils/prismaClient.js';
import { addEmailJob } from './queue/email.queue.js';
import {
  generateInterviewEmailTemplate,
  generateWorkspaceInviteEmailTemplate,
  generateInterviewCompletedNotificationTemplate,
  generateCandidateAssignedTemplate,
} from '../utils/email.js';
import nodemailer from 'nodemailer';

type WorkspaceRole = 'super_admin' | 'admin' | 'reviewer';

/**
 * Fetch member emails and names for given roles within a specific workspace.
 */
export async function getWorkspaceRecipientsByRole(
  workspaceId: number,
  roles: WorkspaceRole[]
) {
  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      role: { in: roles },
    },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role as WorkspaceRole,
  }));
}

/**
 * Dispatch helper with Redis Queue + direct SMTP fallback for high availability.
 */
async function safeEnqueueOrSendEmail(jobData: {
  type:
    | 'workspace-invite'
    | 'interview-link'
    | 'interview-completed-notification'
    | 'candidate-assigned-notification';
  to: string;
  subject: string;
  html: string;
  text: string;
  cc?: string[];
}) {
  try {
    await addEmailJob(jobData);
    console.log(`[NotificationService] Enqueued ${jobData.type} email to ${jobData.to}`);
  } catch (queueErr) {
    console.warn('[NotificationService] Redis queue offline/failed. Falling back to direct SMTP send:', queueErr);
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });

      const mailFrom = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
      await transporter.sendMail({
        from: mailFrom,
        to: jobData.to,
        cc: jobData.cc,
        subject: jobData.subject,
        html: jobData.html,
        text: jobData.text,
      });
      console.log(`[NotificationService] Direct SMTP sent ${jobData.type} email to ${jobData.to}`);
    } catch (smtpErr) {
      console.error('[NotificationService] Direct SMTP fallback failed:', smtpErr);
    }
  }
}

/**
 * Send Workspace Member Invitation Email
 */
export async function sendWorkspaceInviteNotification(data: {
  inviteeEmail: string;
  workspaceName: string;
  inviterName: string;
  inviteLink: string;
  role: WorkspaceRole;
}) {
  const { subject, htmlContent, textContent } = generateWorkspaceInviteEmailTemplate({
    inviteeEmail: data.inviteeEmail,
    workspaceName: data.workspaceName,
    inviterName: data.inviterName,
    inviteLink: data.inviteLink,
  });

  await safeEnqueueOrSendEmail({
    type: 'workspace-invite',
    to: data.inviteeEmail,
    subject: `[Workspace Invite] Join ${data.workspaceName} as ${data.role}`,
    html: htmlContent,
    text: textContent,
  });
}

/**
 * Send Candidate Interview Schedule Email (Candidate recipient + CC to Admins/Assigned Reviewer)
 */
export async function sendInterviewScheduledNotification(data: {
  candidateEmail: string;
  candidateName: string;
  interviewLink: string;
  campaignName: string;
  jobTitle: string;
  workspaceId: number;
}) {
  const { subject, htmlContent, textContent } = generateInterviewEmailTemplate({
    candidateName: data.candidateName,
    jobTitle: data.jobTitle,
    campaignName: data.campaignName,
    interviewLink: data.interviewLink,
  });

  // Collect workspace admins/super_admins for CC
  const adminRecipients = await getWorkspaceRecipientsByRole(data.workspaceId, ['super_admin', 'admin']);
  const ccEmails = Array.from(new Set(adminRecipients.map((r) => r.email).filter(Boolean)));

  const payload: {
    type: 'interview-link';
    to: string;
    subject: string;
    html: string;
    text: string;
    cc?: string[];
  } = {
    type: 'interview-link',
    to: data.candidateEmail,
    subject,
    html: htmlContent,
    text: textContent,
  };

  if (ccEmails.length > 0) {
    payload.cc = ccEmails;
  }

  await safeEnqueueOrSendEmail(payload);
}

/**
 * Send Interview Completed & Analysis Ready Notification to Workspace Super Admins, Admins & Assigned Reviewer
 */
export async function notifyInterviewCompleted(data: {
  candidateId: number;
  workspaceId: number;
  summarySnippet: string;
}) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: data.candidateId },
    select: {
      name: true,
      email: true,
      assignedReviewerId: true,
      assignedReviewer: {
        select: { id: true, name: true, email: true },
      },
      workspace: {
        select: { id: true, name: true },
      },
    },
  });

  if (!candidate) {
    console.error(`[NotificationService] Candidate ${data.candidateId} not found`);
    return;
  }

  // Fetch all super_admins & admins in this tenant workspace
  const workspaceAdmins = await getWorkspaceRecipientsByRole(data.workspaceId, ['super_admin', 'admin']);

  const recipientEmails = new Set<string>();
  workspaceAdmins.forEach((r) => {
    if (r.email) recipientEmails.add(r.email.toLowerCase());
  });

  // If candidate has assigned reviewer, include them
  if (candidate.assignedReviewer?.email) {
    recipientEmails.add(candidate.assignedReviewer.email.toLowerCase());
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const portalUrl = `${frontendUrl}/candidate/${candidate.name.toLowerCase().replace(/\s+/g, '-')}-${data.candidateId}`;

  const template = generateInterviewCompletedNotificationTemplate({
    candidateName: candidate.name,
    workspaceName: candidate.workspace.name,
    summarySnippet: data.summarySnippet,
    candidateId: data.candidateId,
    portalUrl,
  });

  for (const toEmail of Array.from(recipientEmails)) {
    await safeEnqueueOrSendEmail({
      type: 'interview-completed-notification',
      to: toEmail,
      subject: template.subject,
      html: template.htmlContent,
      text: template.textContent,
    });
  }
}

/**
 * Send Candidate Assigned Notification to Reviewer
 */
export async function notifyCandidateAssigned(data: {
  candidateId: number;
  reviewerId: number;
  workspaceId: number;
}) {
  const [candidate, reviewer] = await Promise.all([
    prisma.candidate.findUnique({
      where: { id: data.candidateId },
      select: { name: true, workspace: { select: { name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: data.reviewerId },
      select: { name: true, email: true },
    }),
  ]);

  if (!candidate || !reviewer || !reviewer.email) {
    console.error('[NotificationService] Invalid candidate or reviewer for assignment email');
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const portalUrl = `${frontendUrl}/candidate/${candidate.name.toLowerCase().replace(/\s+/g, '-')}-${data.candidateId}`;

  const template = generateCandidateAssignedTemplate({
    reviewerName: reviewer.name,
    candidateName: candidate.name,
    workspaceName: candidate.workspace.name,
    candidateId: data.candidateId,
    portalUrl,
  });

  await safeEnqueueOrSendEmail({
    type: 'candidate-assigned-notification',
    to: reviewer.email,
    subject: template.subject,
    html: template.htmlContent,
    text: template.textContent,
  });
}
