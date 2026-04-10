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
  candidateId: string;
}

export const uploadPdf = async (file: File, candidateId: string): Promise<UploadPdfResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("candidateId", candidateId);

  const response = await fetch(`${BACKEND_BASE_URL}/api/upload/pdf`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const raw = (await response.json().catch(() => ({}))) as ApiResponse<UploadPdfResponse>;

  if (!response.ok || !raw.success || !raw.data) {
    throw new Error(raw.message || "Failed to upload PDF");
  }

  return raw.data;
};
