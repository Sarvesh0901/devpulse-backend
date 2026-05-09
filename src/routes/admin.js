import express from 'express';
import axios from 'axios';

const router = express.Router();

// ── POST /api/admin/users ──────────────────────────────────────────────────────
router.post('/users', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // Hardcoded simple authentication as requested
    if (username !== 'Sarvesh0901' || password !== 'Sarvesh@404') {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Using Axios to completely bypass Node's built-in fetch (undici) which 
    // causes 50-second IPv6 connection timeouts on some Windows networks.
    const { data } = await axios.get(
      `${process.env.SUPABASE_URL}/rest/v1/user_sessions?select=*&order=last_seen_at.desc`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    res.json({ users: data });
  } catch (err) {
    if (err.response && err.response.status === 404) {
       return res.status(500).json({ error: "Supabase table not found. Please run the SQL schema script!" });
    }
    next(err);
  }
});

export default router;
