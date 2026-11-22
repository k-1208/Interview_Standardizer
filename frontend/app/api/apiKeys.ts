const BACKEND_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type ApiKeyProvider = 'gemini' | 'recall';

export interface WorkspaceApiKey {
	provider: ApiKeyProvider;
	label: string;
	description: string;
	/** workspace = own key; server = using the server default; none = not configured */
	source: 'workspace' | 'server' | 'none';
	/** Only ever a masked value such as "AIza••••••••x9Qk" — the full key is never sent. */
	maskedValue: string | null;
	updatedAt: string | null;
	updatedBy: { id: number; name: string } | null;
}

export interface WorkspaceApiKeysResponse {
	encryptionConfigured: boolean;
	keys: WorkspaceApiKey[];
}

interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
	const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
		...init,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'ngrok-skip-browser-warning': 'true',
			'X-Requested-With': 'XMLHttpRequest',
		},
	});
	const raw = (await response.json().catch(() => ({}))) as ApiResponse<T>;
	if (!response.ok || !raw.success) {
		throw new Error(raw.message || 'Request failed');
	}
	return raw.data as T;
};

export const getWorkspaceApiKeys = (workspaceId: number) =>
	request<WorkspaceApiKeysResponse>(`/api/workspaces/${workspaceId}/api-keys`);

export const updateWorkspaceApiKey = (workspaceId: number, provider: ApiKeyProvider, value: string) =>
	request<{ provider: ApiKeyProvider; maskedValue: string }>(`/api/workspaces/${workspaceId}/api-keys/${provider}`, {
		method: 'PUT',
		body: JSON.stringify({ value }),
	});

export const removeWorkspaceApiKey = (workspaceId: number, provider: ApiKeyProvider) =>
	request<{ provider: ApiKeyProvider; removed: boolean }>(`/api/workspaces/${workspaceId}/api-keys/${provider}`, {
		method: 'DELETE',
	});
