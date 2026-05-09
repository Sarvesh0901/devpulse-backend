import rateLimit from 'express-rate-limit';

const json429 = (msg) => (_req, res) =>
  res.status(429).json({ error: msg });

/** Applied to every request */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429('Too many requests. Please try again later.'),
});

/** Strict limit on OAuth endpoints */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429('Too many authentication attempts.'),
});

/** Per-user AI pulse limit (expensive Gemini calls) */
export const pulseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429('AI pulse limit reached. Try again in an hour.'),
});
