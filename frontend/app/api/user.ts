const BACKEND_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

export const getProfile = async (workspaceId?: number): Promise<any> => {
	const parsedId = workspaceId === undefined || workspaceId === null ? NaN : Number(workspaceId);
	const hasValidId = Number.isFinite(parsedId) && parsedId > 0;

	const url = hasValidId
		? `${BACKEND_BASE_URL}/api/user/profile?workspaceId=${encodeURIComponent(String(parsedId))}`
		: `${BACKEND_BASE_URL}/api/user/profile`;

	const response = await fetch(url, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'ngrok-skip-browser-warning': 'true',
			'X-Requested-With': 'XMLHttpRequest',
		},
	});

	const raw = (await response.json().catch(() => ({}))) as ApiResponse<any>;

	if (!response.ok || !raw.success) {
		throw new Error(raw.message || 'Request failed');
	}

	return raw.data;
};

