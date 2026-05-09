/**
 * Centralised error handler — never leaks stack traces in production.
 */
export const errorHandler = (err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = err.statusCode || 500;

  console.error(`[ERROR ${statusCode}] ${err.message}`);

  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}
