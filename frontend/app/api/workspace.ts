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
