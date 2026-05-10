import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/** Shared cookie options */
const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax', // Must be 'none' for cross-domain Vercel apps
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ── Initiate GitHub OAuth ─────────────────────────────────────────────────────
router.get('/github', authLimiter, (_req, res) => {
  const state = uuidv4();

  // Store state in a short-lived httpOnly cookie (CSRF protection)
  res.cookie('oauth_state', state, { ...cookieOpts, maxAge: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL}/auth/github/callback`,
    scope: 'read:user repo',
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// ── GitHub OAuth Callback ─────────────────────────────────────────────────────
router.get('/github/callback', authLimiter, async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies?.oauth_state;

  // Validate state (CSRF check)
  if (!state || !storedState || state !== storedState) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=state_mismatch`);
  }
  res.clearCookie('oauth_state');

  try {
    // Exchange code → access_token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.BACKEND_URL}/auth/github/callback`,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token, error: ghError } = tokenRes.data;
    if (ghError || !access_token) throw new Error('GitHub token exchange failed');

    // Fetch GitHub profile
    const { data: ghUser } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { id, login, name, avatar_url, bio, public_repos, followers } = ghUser;

    // Upsert session record in Supabase
    await supabase.from('user_sessions').upsert(
      {
        github_id: id,
        github_login: login,
        avatar_url,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'github_id' }
    );

    // Issue signed JWT — access_token stored so backend can call GitHub on user's behalf
    const token = jwt.sign(
      { github_id: id, login, name, avatar_url, bio, public_repos, followers, access_token },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    res.cookie('devpulse_token', token, cookieOpts);
    // Send token in URL as a fail-safe for cross-site cookie blocking
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);
  } catch (err) {
    console.error('[AUTH] Callback error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

// ── Current user ─────────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  // Never expose access_token to the frontend
  const { access_token, iat, exp, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, (_req, res) => {
  res.clearCookie('devpulse_token');
  res.json({ message: 'Logged out successfully.' });
});

export default router;
