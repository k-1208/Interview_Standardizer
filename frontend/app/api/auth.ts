const BACKEND_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const AUTH_TOKEN_KEY = 'auth_token';

export const getStoredToken = () => {
	if (typeof window === 'undefined') return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setStoredToken = (token: string) => {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearStoredToken = () => {
	if (typeof window === 'undefined') return;
	window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

export interface AuthUser {
	id: number;
	name: string;
	organizationName?: string;
	email: string;
	createdAt?: string;
}

export interface WorkspaceSummary {
	id: number;
	name: string;
	slug: string;
}

export interface WorkspaceMembership {
	role: string;
	joinedAt: string;
	workspace: WorkspaceSummary;
}

export interface MeResponse {
	id: number;
	name: string;
	email: string;
	createdAt: string;
	workspaces: WorkspaceMembership[];
}

interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

interface RequestOptions extends RequestInit {
	requireData?: boolean;
}

interface AuthPayload {
	user: AuthUser;
	token: string;
}

export interface RegisterInput {
	name: string;
	organizationName: string;
	email: string;
	password: string;
}

export interface LoginInput {
	email: string;
	password: string;
}

const request = async <T>(path: string, init?: RequestOptions): Promise<T> => {
	const token = getStoredToken();
	const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(init?.headers || {}),
		},
		...init,
	});

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<T>;

	if (!response.ok || !raw.success) {
		throw new Error(raw.message || 'Authentication request failed');
	}

	const requireData = init?.requireData ?? true;

	if (requireData && raw.data === undefined) {
		throw new Error('Invalid response from authentication server');
	}

	return raw.data as T;
};

export const register = async (input: RegisterInput) => {
	const data = await request<AuthPayload>('/api/auth/register', {
		method: 'POST',
		body: JSON.stringify(input),
	});
	setStoredToken(data.token);
	return data;
};

export const login = async (input: LoginInput) => {
	const data = await request<AuthPayload>('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(input),
	});
	setStoredToken(data.token);
	return data;
};

export const logout = async () => {
	try {
		return await request<{ message?: string }>('/api/auth/logout', {
			method: 'POST',
			requireData: false,
		});
	} finally {
		clearStoredToken();
	}
};

export const me = async () => {
	return request<MeResponse>('/api/auth/me', {
		method: 'GET',
	});
};

