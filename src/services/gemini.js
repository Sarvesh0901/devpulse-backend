import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const FALLBACK_PULSE = (repoName) => ({
  summary: `AI analysis is temporarily unavailable for "${repoName}". This is usually due to free-tier quota limits. Results will appear once the quota resets (typically within a day).`,
  categories: { Feature: [], Fix: [], Refactor: [], Chore: [] },
  insights: ['Gemini API quota exceeded — try again later.'],
  mood: 'Steady',
  error: true,
});

/**
 * Sends last 10 commit messages to Gemini and returns a structured
 * "Daily Pulse" JSON object. Returns a graceful fallback on any error.
 */
export async function generatePulseSummary(commits, repoName) {
  try {
    // gemini-2.0-flash-lite has the highest free-tier RPM limits
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const commitMessages = commits
      .slice(0, 10)
      .map((c) => `- ${c.commit.message.split('\n')[0].trim()}`)
      .join('\n');

    const prompt = `You are a senior engineering analyst reviewing Git history.
Analyze these recent commits for the repository "${repoName}" and return ONLY a raw JSON object (no markdown, no code block).

Commits:
${commitMessages}

Return exactly this JSON shape:
{
  "summary": "<2-3 sentence executive summary>",
  "categories": {
    "Feature": ["<commit description>"],
    "Fix": ["<commit description>"],
    "Refactor": ["<commit description>"],
    "Chore": ["<commit description>"]
  },
  "insights": ["<insight 1>", "<insight 2>"],
  "mood": "<one of: Productive | Steady | Fixing | Refactoring>"
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Strip possible markdown fences
    const jsonStr = raw
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    return JSON.parse(jsonStr);
  } catch (err) {
    const is429 = err?.message?.includes('429') || err?.message?.includes('quota');
    console.warn(`[GEMINI] ${is429 ? 'Quota exceeded' : 'Error'} for "${repoName}":`, err.message);
    return FALLBACK_PULSE(repoName);
  }
}
