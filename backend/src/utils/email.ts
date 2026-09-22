interface InterviewEmailTemplateData {
	candidateName: string;
	jobTitle: string;
	campaignName: string;
	interviewLink: string;
}

interface WorkspaceInviteTemplateData {
	inviteeEmail: string;
	workspaceName: string;
	inviterName: string;
	inviteLink: string;
}

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

export const generateInterviewEmailTemplate = (data: InterviewEmailTemplateData) => {
	const candidateName = (data.candidateName || 'Candidate').trim();
	const jobTitle = (data.jobTitle || 'the role').trim();
	const campaignName = (data.campaignName || 'Interview Campaign').trim();
	const interviewLink = (data.interviewLink || '').trim();

	const safeCandidateName = escapeHtml(candidateName);
	const safeJobTitle = escapeHtml(jobTitle);
	const safeCampaignName = escapeHtml(campaignName);
	const safeInterviewLink = escapeHtml(interviewLink);

	const subject = `Interview Invitation: ${jobTitle}`;

	const htmlContent = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${escapeHtml(subject)}</title>
		<style>
			body {
				margin: 0;
				padding: 0;
				background: #f4f7fb;
				color: #1f2937;
				font-family: Arial, sans-serif;
				line-height: 1.6;
			}
			.container {
				max-width: 640px;
				margin: 24px auto;
				background: #ffffff;
				border: 1px solid #e5e7eb;
				border-radius: 12px;
				overflow: hidden;
			}
			.header {
				background: linear-gradient(135deg, #0f766e, #0ea5a4);
				color: #ffffff;
				padding: 28px 24px;
				text-align: center;
			}
			.header h1 {
				margin: 0;
				font-size: 24px;
			}
			.content {
				padding: 28px 24px;
			}
			.info-box {
				margin: 20px 0;
				padding: 14px;
				background: #f0fdfa;
				border-left: 4px solid #0ea5a4;
				border-radius: 8px;
			}
			.button-wrap {
				text-align: center;
				margin: 24px 0;
			}
			.button {
				display: inline-block;
				background: #0f766e;
				color: #ffffff !important;
				text-decoration: none;
				font-weight: 700;
				padding: 12px 24px;
				border-radius: 8px;
			}
			.link-box {
				margin-top: 10px;
				padding: 10px;
				background: #f9fafb;
				border: 1px dashed #cbd5e1;
				border-radius: 8px;
				word-break: break-all;
				font-family: monospace;
				font-size: 12px;
				color: #0f766e;
			}
			.footer {
				border-top: 1px solid #e5e7eb;
				padding: 16px 24px 24px;
				font-size: 12px;
				color: #6b7280;
				text-align: center;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<h1>Interview Invitation</h1>
			</div>
			<div class="content">
				<p>Hello <strong>${safeCandidateName}</strong>,</p>
				<p>
					You are invited to continue the hiring process for
					<strong>${safeJobTitle}</strong>.
				</p>

				<div class="info-box">
					<p style="margin: 4px 0;"><strong>Campaign:</strong> ${safeCampaignName}</p>
					<p style="margin: 4px 0;"><strong>Role:</strong> ${safeJobTitle}</p>
				</div>

				<p>Please use the button below to start your interview:</p>

				<div class="button-wrap">
					<a class="button" href="${safeInterviewLink}" target="_blank" rel="noopener noreferrer">
						Start Interview
					</a>
				</div>

				<p style="margin-bottom: 8px;">If the button does not work, use this link:</p>
				<div class="link-box">${safeInterviewLink}</div>

				<p style="margin-top: 24px;">
					We look forward to learning more about you. Best of luck.
				</p>

				<p style="margin-top: 20px;">
					Regards,<br />
					<strong>Recruitment Team</strong>
				</p>
			</div>
			<div class="footer">
				This is an automated invitation email. Please do not reply directly.<br />
				&copy; ${new Date().getFullYear()} Recruitment Team
			</div>
		</div>
	</body>
</html>
`;

	const textContent = `Hello ${candidateName},

You are invited to continue the hiring process for ${jobTitle}.

Campaign: ${campaignName}
Role: ${jobTitle}

Start your interview here:
${interviewLink}

We look forward to learning more about you.

Regards,
Recruitment Team

This is an automated invitation email. Please do not reply directly.`;

	return {
		subject,
		htmlContent,
		textContent,
	};
};

export const generateWorkspaceInviteEmailTemplate = (data: WorkspaceInviteTemplateData) => {
	const inviteeEmail = (data.inviteeEmail || 'there').trim();
	const workspaceName = (data.workspaceName || 'your workspace').trim();
	const inviterName = (data.inviterName || 'A team member').trim();
	const inviteLink = (data.inviteLink || '').trim();

	const safeInviteeEmail = escapeHtml(inviteeEmail);
	const safeWorkspaceName = escapeHtml(workspaceName);
	const safeInviterName = escapeHtml(inviterName);
	const safeInviteLink = escapeHtml(inviteLink);

	const subject = `Workspace Invitation: ${workspaceName}`;

	const htmlContent = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${escapeHtml(subject)}</title>
		<style>
			body {
				margin: 0;
				padding: 0;
				background: #f8fafc;
				color: #111827;
				font-family: Arial, sans-serif;
				line-height: 1.6;
			}
			.container {
				max-width: 640px;
				margin: 24px auto;
				background: #ffffff;
				border: 1px solid #e5e7eb;
				border-radius: 12px;
				overflow: hidden;
			}
			.header {
				background: linear-gradient(135deg, #0f766e, #14b8a6);
				color: #ffffff;
				padding: 28px 24px;
				text-align: center;
			}
			.header h1 {
				margin: 0;
				font-size: 22px;
			}
			.content {
				padding: 28px 24px;
			}
			.info-box {
				margin: 20px 0;
				padding: 14px;
				background: #f0fdfa;
				border-left: 4px solid #14b8a6;
				border-radius: 8px;
			}
			.button-wrap {
				text-align: center;
				margin: 24px 0;
			}
			.button {
				display: inline-block;
				background: #0f766e;
				color: #ffffff !important;
				text-decoration: none;
				font-weight: 700;
				padding: 12px 24px;
				border-radius: 8px;
			}
			.link-box {
				margin-top: 10px;
				padding: 10px;
				background: #f9fafb;
				border: 1px dashed #cbd5e1;
				border-radius: 8px;
				word-break: break-all;
				font-family: monospace;
				font-size: 12px;
				color: #0f766e;
			}
			.footer {
				border-top: 1px solid #e5e7eb;
				padding: 16px 24px 24px;
				font-size: 12px;
				color: #6b7280;
				text-align: center;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<h1>Workspace Invitation</h1>
			</div>
			<div class="content">
				<p>Hello <strong>${safeInviteeEmail}</strong>,</p>
				<p>
					<strong>${safeInviterName}</strong> invited you to join
					<strong>${safeWorkspaceName}</strong>.
				</p>

				<div class="info-box">
					<p style="margin: 4px 0;"><strong>Workspace:</strong> ${safeWorkspaceName}</p>
				</div>

				<p>Click the button below to accept your invitation:</p>

				<div class="button-wrap">
					<a class="button" href="${safeInviteLink}" target="_blank" rel="noopener noreferrer">
						Accept Invitation
					</a>
				</div>

				<p style="margin-bottom: 8px;">If the button does not work, use this link:</p>
				<div class="link-box">${safeInviteLink}</div>
			</div>
			<div class="footer">
				This is an automated invitation email. Please do not reply directly.
			</div>
		</div>
	</body>
</html>
`;

	const textContent = `Hello ${inviteeEmail},

${inviterName} invited you to join ${workspaceName}.

Accept your invitation here:
${inviteLink}

This is an automated invitation email. Please do not reply directly.`;

	return {
		subject,
		htmlContent,
		textContent,
	};
};

interface InterviewCompletedTemplateData {
	candidateName: string;
	workspaceName: string;
	summarySnippet: string;
	candidateId: number;
	portalUrl: string;
}

interface CandidateAssignedTemplateData {
	reviewerName: string;
	candidateName: string;
	workspaceName: string;
	candidateId: number;
	portalUrl: string;
}

export const generateInterviewCompletedNotificationTemplate = (data: InterviewCompletedTemplateData) => {
	const candidateName = (data.candidateName || 'Candidate').trim();
	const workspaceName = (data.workspaceName || 'Workspace').trim();
	const summarySnippet = (data.summarySnippet || 'Interview transcript analysis complete. Log in to review full details.').trim();
	const portalUrl = (data.portalUrl || '').trim();

	const safeCandidateName = escapeHtml(candidateName);
	const safeWorkspaceName = escapeHtml(workspaceName);
	const safeSummarySnippet = escapeHtml(summarySnippet);
	const safePortalUrl = escapeHtml(portalUrl);

	const subject = `[Interview Complete] ${candidateName} — ${workspaceName}`;

	const htmlContent = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${escapeHtml(subject)}</title>
		<style>
			body { margin: 0; padding: 0; background: #f8fafc; color: #1e293b; font-family: Arial, sans-serif; line-height: 1.6; }
			.container { max-width: 640px; margin: 24px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
			.header { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; padding: 24px; text-align: center; }
			.header h1 { margin: 0; font-size: 22px; }
			.content { padding: 24px; }
			.summary-card { margin: 16px 0; padding: 16px; background: #f1f5f9; border-left: 4px solid #4f46e5; border-radius: 8px; font-size: 14px; }
			.button-wrap { text-align: center; margin: 24px 0; }
			.button { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 8px; }
			.footer { border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; }
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<h1>Interview Analysis Ready</h1>
			</div>
			<div class="content">
				<p>Hello Team,</p>
				<p>The automated interview for <strong>${safeCandidateName}</strong> in <strong>${safeWorkspaceName}</strong> has completed and transcript analysis is available.</p>
				
				<div class="summary-card">
					<strong>AI Summary Snippet:</strong><br />
					${safeSummarySnippet}
				</div>

				<div class="button-wrap">
					<a class="button" href="${safePortalUrl}" target="_blank" rel="noopener noreferrer">View Full Candidate Profile</a>
				</div>
			</div>
			<div class="footer">
				Automated notification from Interview Standardizer.
			</div>
		</div>
	</body>
</html>
`;

	const textContent = `Interview Analysis Ready: ${candidateName} (${workspaceName})\n\nAI Summary:\n${summarySnippet}\n\nReview candidate profile:\n${portalUrl}`;

	return { subject, htmlContent, textContent };
};

export const generateCandidateAssignedTemplate = (data: CandidateAssignedTemplateData) => {
	const reviewerName = (data.reviewerName || 'Reviewer').trim();
	const candidateName = (data.candidateName || 'Candidate').trim();
	const workspaceName = (data.workspaceName || 'Workspace').trim();
	const portalUrl = (data.portalUrl || '').trim();

	const safeReviewerName = escapeHtml(reviewerName);
	const safeCandidateName = escapeHtml(candidateName);
	const safeWorkspaceName = escapeHtml(workspaceName);
	const safePortalUrl = escapeHtml(portalUrl);

	const subject = `[Candidate Assigned] ${candidateName} — ${workspaceName}`;

	const htmlContent = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${escapeHtml(subject)}</title>
		<style>
			body { margin: 0; padding: 0; background: #f8fafc; color: #1e293b; font-family: Arial, sans-serif; line-height: 1.6; }
			.container { max-width: 640px; margin: 24px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
			.header { background: linear-gradient(135deg, #0284c7, #06b6d4); color: #ffffff; padding: 24px; text-align: center; }
			.header h1 { margin: 0; font-size: 22px; }
			.content { padding: 24px; }
			.button-wrap { text-align: center; margin: 24px 0; }
			.button { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 8px; }
			.footer { border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; }
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">
				<h1>New Candidate Assignment</h1>
			</div>
			<div class="content">
				<p>Hello <strong>${safeReviewerName}</strong>,</p>
				<p>You have been assigned as the primary reviewer for candidate <strong>${safeCandidateName}</strong> in <strong>${safeWorkspaceName}</strong>.</p>
				
				<div class="button-wrap">
					<a class="button" href="${safePortalUrl}" target="_blank" rel="noopener noreferrer">Review Candidate Profile</a>
				</div>
			</div>
			<div class="footer">
				Automated notification from Interview Standardizer.
			</div>
		</div>
	</body>
</html>
`;

	const textContent = `Hello ${reviewerName},\n\nYou have been assigned candidate ${candidateName} in ${workspaceName}.\n\nReview profile: ${portalUrl}`;

	return { subject, htmlContent, textContent };
};

