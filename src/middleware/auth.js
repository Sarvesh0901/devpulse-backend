import jwt from 'jsonwebtoken';

/**
 * Verifies the devpulse_token httpOnly cookie.
 * Attaches decoded payload to req.user.
 */
export const requireAuth = (req, res, next) => {
  const token = req.cookies?.devpulse_token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    req.user = payload;
    next();
  } catch {
    res.clearCookie('devpulse_token');
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
};
