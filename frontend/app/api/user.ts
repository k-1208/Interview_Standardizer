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

export const getProfile = async (): Promise<any> => {
	const token = getStoredToken();
	const response = await fetch(`${BACKEND_BASE_URL}/api/user/profile`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	});

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<any>;

	if (!response.ok || !raw.success) {
		throw new Error(raw.message || 'Request failed');
	}

	return raw.data;
};

