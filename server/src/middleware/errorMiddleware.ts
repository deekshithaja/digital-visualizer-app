import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorMiddleware(
  err: Error | AppError | (Error & { code?: number; name?: string }),
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message = err.message || 'An unexpected error occurred.';

  const mongoCode = (err as { code?: number }).code;
  if (mongoCode === 11000) {
    statusCode = 409;
    message = 'A record with this unique value already exists.';
  } else if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoNetworkError') {
    statusCode = 503;
  }

  if (statusCode >= 500) {
    console.error('[API Error]', err);
  }

  res.status(statusCode).json({
    error: message,
    ...(err instanceof AppError && err.details ? { details: err.details } : {}),
  });
}
