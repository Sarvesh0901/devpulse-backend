import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { pulseLimiter } from '../middleware/rateLimiter.js';
import { GitHubService } from '../services/github.js';
import { generatePulseSummary } from '../services/gemini.js';
import { withCache } from '../services/cache.js';
import { calculateHealthScore } from '../utils/healthScore.js';

const router = express.Router();

// All API routes require a valid JWT
router.use(requireAuth);

// ── Param validation ──────────────────────────────────────────────────────────
const repoParamSchema = z.object({
  owner: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
  repo: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/),
});

function validateRepo(req, res, next) {
  const result = repoParamSchema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid repository parameters.' });
  }
  next();
}

// ── GET /api/repos ────────────────────────────────────────────────────────────
router.get('/repos', async (req, res, next) => {
  try {
    const gh = new GitHubService(req.user.access_token);
    const repos = await withCache(
      `repos:${req.user.github_id}`,
      300,
      () => gh.getRepos()
    );
    res.json({ repos });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/repos/:owner/:repo ───────────────────────────────────────────────
router.get('/repos/:owner/:repo', validateRepo, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const gh = new GitHubService(req.user.access_token);
    const data = await withCache(`repo:${owner}/${repo}`, 600, () =>
      gh.getRepo(owner, repo)
    );
    res.json({ repo: data });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/repos/:owner/:repo/commits ──────────────────────────────────────
router.get('/repos/:owner/:repo/commits', validateRepo, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const gh = new GitHubService(req.user.access_token);
    const commits = await withCache(`commits:${owner}/${repo}`, 300, () =>
      gh.getCommits(owner, repo)
    );
    res.json({ commits });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/repos/:owner/:repo/languages ────────────────────────────────────
router.get('/repos/:owner/:repo/languages', validateRepo, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const gh = new GitHubService(req.user.access_token);
    const languages = await withCache(`languages:${owner}/${repo}`, 3600, () =>
      gh.getLanguages(owner, repo)
    );
    res.json({ languages });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/repos/:owner/:repo/contributors ─────────────────────────────────
router.get('/repos/:owner/:repo/contributors', validateRepo, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const gh = new GitHubService(req.user.access_token);
    const contributors = await withCache(`contributors:${owner}/${repo}`, 3600, () =>
      gh.getContributors(owner, repo)
    );
    res.json({ contributors });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/repos/:owner/:repo/health ───────────────────────────────────────
router.get('/repos/:owner/:repo/health', validateRepo, async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const gh = new GitHubService(req.user.access_token);
    const health = await withCache(`health:${owner}/${repo}`, 1800, async () => {
      const [commits, pullRequests, issues, repoData] = await Promise.all([
        gh.getCommits(owner, repo),
        gh.getPullRequests(owner, repo),
        gh.getIssues(owner, repo),
        gh.getRepo(owner, repo),
      ]);
      return calculateHealthScore(commits, pullRequests, issues, repoData);
    });
    res.json({ health });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/repos/:owner/:repo/pulse (AI — rate limited) ────────────────────
router.get(
  '/repos/:owner/:repo/pulse',
  validateRepo,
  pulseLimiter,
  async (req, res, next) => {
    try {
      const { owner, repo } = req.params;
      const gh = new GitHubService(req.user.access_token);
      const pulse = await withCache(`pulse:${owner}/${repo}`, 3600, async () => {
        const commits = await gh.getCommits(owner, repo);
        return generatePulseSummary(commits, repo);
      });
      res.json({ pulse });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
