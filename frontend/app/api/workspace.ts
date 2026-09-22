const BACKEND_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const AUTH_TOKEN_KEY = 'auth_token';

const getStoredToken = () => {
	if (typeof window === 'undefined') return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

export interface CreatedWorkspace {
	id: number;
	name: string;
	slug: string;
	createdAt?: string;
}

export const createWorkspace = async (name: string): Promise<CreatedWorkspace> => {
	const token = getStoredToken();
	const response = await fetch(`${BACKEND_BASE_URL}/api/workspaces`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'ngrok-skip-browser-warning': 'true',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({ name }),
	});

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<CreatedWorkspace>;

	if (!response.ok || !raw.success || !raw.data) {
		throw new Error(raw.message || 'Failed to create organization');
	}

	return raw.data;
};

export type WorkspaceMemberRole = 'admin' | 'reviewer';

export interface WorkspaceMemberProfile {
	id: number;
	name: string;
	email: string;
	organizationName: string;
	role: string;
	joinedAt: string;
	createdAt?: string;
	assignedCandidateCount?: number;
}

const workspaceMemberRequest = async <T>(
	workspaceId: number,
	userId: number,
	init?: RequestInit
): Promise<T> => {
	const token = getStoredToken();
	const response = await fetch(`${BACKEND_BASE_URL}/api/workspaces/${workspaceId}/members/${userId}`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'ngrok-skip-browser-warning': 'true',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		...init,
	});

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<T>;

	if (!response.ok || !raw.success) {
		throw new Error(raw.message || 'Request failed');
	}

	return raw.data as T;
};

export const getWorkspaceMember = async (
	workspaceId: number,
	userId: number
): Promise<WorkspaceMemberProfile> => {
	return workspaceMemberRequest<WorkspaceMemberProfile>(workspaceId, userId, { method: 'GET' });
};

export const updateWorkspaceMemberRole = async (
	workspaceId: number,
	userId: number,
	role: WorkspaceMemberRole
): Promise<WorkspaceMemberProfile> => {
	return workspaceMemberRequest<WorkspaceMemberProfile>(workspaceId, userId, {
		method: 'PATCH',
		body: JSON.stringify({ role }),
	});
};

export const removeWorkspaceMember = async (workspaceId: number, userId: number): Promise<{ id: number; removed: boolean }> => {
	return workspaceMemberRequest<{ id: number; removed: boolean }>(workspaceId, userId, { method: 'DELETE' });
};
