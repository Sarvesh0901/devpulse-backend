import jwt from 'jsonwebtoken';

/**
 * Verifies the devpulse_token httpOnly cookie.
 * Attaches decoded payload to req.user.
 */
export const requireAuth = (req, res, next) => {
  // Check cookie first, then Authorization header
  let token = req.cookies?.devpulse_token;
  
  const authHeader = req.headers.authorization;
  if (!token && authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

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
