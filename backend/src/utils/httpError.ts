import type { Response } from 'express';

/**
 * An expected, user-facing error. The message is safe to show to the client and
 * the status travels with the error, so controllers never match on message text.
 * Anything that is NOT an HttpError is treated as an internal failure: it is logged
 * in full and the client only gets a generic message.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message: string) => new HttpError(401, message);
export const forbidden = (message: string) => new HttpError(403, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;

/**
 * Send an error response. HttpErrors go out as-is; anything else is logged with
 * `context` and replaced by `fallbackMessage` with a 500.
 */
export const sendError = (res: Response, error: unknown, context: string, fallbackMessage: string) => {
  if (isHttpError(error)) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }

  console.error(`[${context}]`, error);
  res.status(500).json({ success: false, message: fallbackMessage });
};
