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
