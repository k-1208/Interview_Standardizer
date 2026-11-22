const BACKEND_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// The auth token lives only in an httpOnly cookie set by the API, so page scripts
// (and any injected script) can never read it. We only keep a non-secret hint that a
// session probably exists, to decide whether calling /api/auth/me is worthwhile.
const SESSION_HINT_KEY = 'has_session';
const LEGACY_TOKEN_KEY = 'auth_token';

const safeStorage = (fn: (storage: Storage) => void) => {
	if (typeof window === 'undefined') return;
	try {
		fn(window.localStorage);
	} catch {
		// storage unavailable (private mode etc.) — the cookie still works
	}
};

export const hasSessionHint = () => {
	if (typeof window === 'undefined') return false;
	try {
		// Purge tokens stored by older versions of the app.
		window.localStorage.removeItem(LEGACY_TOKEN_KEY);
		return window.localStorage.getItem(SESSION_HINT_KEY) === '1';
	} catch {
		return true;
	}
};

export const setSessionHint = () => safeStorage((storage) => storage.setItem(SESSION_HINT_KEY, '1'));

export const clearSessionHint = () =>
	safeStorage((storage) => {
		storage.removeItem(SESSION_HINT_KEY);
		storage.removeItem(LEGACY_TOKEN_KEY);
	});

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
}

export interface RegisterInput {
	name?: string;
	organizationName?: string;
	email: string;
	password: string;
	inviteToken?: string;
}

export interface LoginInput {
	email: string;
	password: string;
}

const request = async <T>(path: string, init?: RequestOptions): Promise<T> => {
	const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'ngrok-skip-browser-warning': 'true',
			'X-Requested-With': 'XMLHttpRequest',
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
	setSessionHint();
	return data;
};

export const login = async (input: LoginInput) => {
	const data = await request<AuthPayload>('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(input),
	});
	setSessionHint();
	return data;
};

export const logout = async () => {
	try {
		return await request<{ message?: string }>('/api/auth/logout', {
			method: 'POST',
			requireData: false,
		});
	} finally {
		clearSessionHint();
	}
};

export const me = async () => {
	return request<MeResponse>('/api/auth/me', {
		method: 'GET',
	});
};

