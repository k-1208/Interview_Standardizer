const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface UploadPdfResponse {
  originalName: string;
  mimeType: string;
  size: number;
  resumeUrl: string;
  resumeKey: string;
}

export const uploadPdf = async (file: File, workspaceId: number): Promise<UploadPdfResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/upload/pdf?workspaceId=${encodeURIComponent(String(workspaceId))}`,
    {
    method: "POST",
    credentials: "include",
    headers: {
      "ngrok-skip-browser-warning": "true",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: formData,
    }
  );

  const raw = (await response.json().catch(() => ({}))) as ApiResponse<UploadPdfResponse>;

  if (!response.ok || !raw.success || !raw.data) {
    throw new Error(raw.message || "Failed to upload PDF");
  }

  return raw.data;
};
