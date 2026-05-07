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

export interface InviteMemberInput {
	email: string;
	role?: 'super_admin' | 'admin' | 'reviewer';
	workspaceId: number;
}

export const inviteMember = async (input: InviteMemberInput): Promise<any> => {
	const token = getStoredToken();
	const response = await fetch(`${BACKEND_BASE_URL}/api/user/invite`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(input),
	});

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<any>;

	if (!response.ok || !raw.success) {
		throw new Error(raw.message || 'Request failed');
	}

	return raw.data;
};

export const validateInvite = async (tokenValue: string): Promise<any> => {
	const response = await fetch(`${BACKEND_BASE_URL}/api/user/invite/${tokenValue}`, {
		method: 'GET',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<any>;

	if (!response.ok || !raw.success) {
		throw new Error(raw.message || 'Request failed');
	}

	return raw.data;
};

export const acceptInvite = async (tokenValue: string): Promise<any> => {
	const token = getStoredToken();
	const response = await fetch(`${BACKEND_BASE_URL}/api/user/invite/accept`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({ token: tokenValue }),
	});

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<any>;

	if (!response.ok || !raw.success) {
		throw new Error(raw.message || 'Request failed');
	}

	return raw.data;
};


