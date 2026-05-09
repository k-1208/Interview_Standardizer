import type { Request, Response } from 'express';
import { getCandidateDetail, getCandidates, getCandidateTranscriptAnalysis } from '../service/candidate.service.js';

export async function getCandidateById(req: Request, res: Response): Promise<void> {
	if (!req.user?.userId) {
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	const candidateId = Number(req.params.id);
	const workspaceId = Number(req.query.workspaceId);

	if (!Number.isFinite(candidateId) || candidateId <= 0) {
		res.status(400).json({ success: false, message: 'Valid candidate id is required' });
		return;
	}

	if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
		res.status(400).json({ success: false, message: 'Valid workspaceId is required' });
		return;
	}

	try {
		const data = await getCandidateDetail({
			userId: req.user.userId,
			workspaceId,
			candidateId,
		});

		res.status(200).json({ success: true, data });
	} catch (error: any) {
		const message = error?.message || 'Failed to load candidate';
		const statusCode =
			message === 'User does not have access to this workspace'
				? 403
				: message === 'Candidate not found in this workspace'
					? 404
					: 500;
		res.status(statusCode).json({ success: false, message });
	}
}

export async function listCandidates(req: Request, res: Response): Promise<void> {
	if (!req.user?.userId) {
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	const workspaceId = Number(req.query.workspaceId);

	if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
		res.status(400).json({ success: false, message: 'Valid workspaceId is required' });
		return;
	}

	try {
		const data = await getCandidates({
			userId: req.user.userId,
			workspaceId,
		});

		res.status(200).json({ success: true, data });
	} catch (error: any) {
		const message = error?.message || 'Failed to load candidates';
		const statusCode =
			message === 'User does not have access to this workspace' ? 403 : 500;
		res.status(statusCode).json({ success: false, message });
	}
}

export async function getCandidateTranscript(req: Request, res: Response): Promise<void> {
	if (!req.user?.userId) {
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	const candidateId = Number(req.params.id);
	const workspaceId = Number(req.query.workspaceId);

	if (!Number.isFinite(candidateId) || candidateId <= 0) {
		res.status(400).json({ success: false, message: 'Valid candidate id is required' });
		return;
	}

	if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
		res.status(400).json({ success: false, message: 'Valid workspaceId is required' });
		return;
	}

	try {
		const data = await getCandidateTranscriptAnalysis({
			userId: req.user.userId,
			workspaceId,
			candidateId,
		});

		res.status(200).json({ success: true, data });
	} catch (error: any) {
		const message = error?.message || 'Failed to load transcript analysis';
		const statusCode =
			message === 'User does not have access to this workspace'
				? 403
				: message === 'Candidate not found in this workspace'
					? 404
					: 500;
		res.status(statusCode).json({ success: false, message });
	}
}