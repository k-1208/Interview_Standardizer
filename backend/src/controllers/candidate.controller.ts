import { sendError } from '../utils/httpError.js';
import type { Request, Response } from 'express';
import {
	getCandidateDetail,
	getCandidates,
	getCandidateTranscriptAnalysis,
	assignCandidateReviewer,
	softDeleteCandidate,
} from '../service/candidate.service.js';

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
	} catch (error) {
		sendError(res, error, 'candidate/getCandidateById', 'Failed to load candidate');
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
	} catch (error) {
		sendError(res, error, 'candidate/listCandidates', 'Failed to load candidates');
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
	} catch (error) {
		sendError(res, error, 'candidate/getCandidateTranscript', 'Failed to load transcript analysis');
	}
}

export async function assignReviewer(req: Request, res: Response): Promise<void> {
	if (!req.user?.userId) {
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	const candidateId = Number(req.params.id);
	const { workspaceId, reviewerId } = req.body || {};

	if (!Number.isFinite(candidateId) || candidateId <= 0) {
		res.status(400).json({ success: false, message: 'Valid candidate id is required' });
		return;
	}

	if (!workspaceId || !reviewerId) {
		res.status(400).json({ success: false, message: 'workspaceId and reviewerId are required' });
		return;
	}

	try {
		const data = await assignCandidateReviewer({
			userId: req.user.userId,
			workspaceId: Number(workspaceId),
			candidateId,
			reviewerId: Number(reviewerId),
		});

		res.status(200).json({ success: true, data });
	} catch (error) {
		sendError(res, error, 'candidate/assignReviewer', 'Failed to assign reviewer');
	}
}

export async function deleteCandidate(req: Request, res: Response): Promise<void> {
	if (!req.user?.userId) {
		res.status(401).json({ success: false, message: 'Unauthorized' });
		return;
	}

	const candidateId = Number(req.params.id);
	const workspaceId = Number(req.query.workspaceId ?? req.body?.workspaceId);

	if (!Number.isFinite(candidateId) || candidateId <= 0) {
		res.status(400).json({ success: false, message: 'Valid candidate id is required' });
		return;
	}

	if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
		res.status(400).json({ success: false, message: 'Valid workspaceId is required' });
		return;
	}

	try {
		const data = await softDeleteCandidate({
			userId: req.user.userId,
			workspaceId,
			candidateId,
		});

		res.status(200).json({ success: true, data });
	} catch (error) {
		sendError(res, error, 'candidate/deleteCandidate', 'Failed to delete candidate');
	}
}
