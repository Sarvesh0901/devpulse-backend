/**
 * Calculates a 0–100 Repository Health Score from GitHub data.
 *
 * Breakdown:
 *  - Commit consistency   25 pts  (unique days with commits in last 50)
 *  - PR turnaround time   30 pts  (faster merge = better)
 *  - Issue resolution     20 pts  (closed / total ratio)
 *  - Recent activity      25 pts  (days since last push)
 */
export function calculateHealthScore(commits, pullRequests, issues, repoData) {
  let score = 0;
  const breakdown = {};

  // 1. Commit consistency (25 pts)
  const commitDays = commits.map((c) =>
    new Date(c.commit.author.date).toDateString()
  );
  const uniqueDays = new Set(commitDays).size;
  const commitScore = Math.min(25, (uniqueDays / 20) * 25);
  score += commitScore;
  breakdown.commitConsistency = Math.round(commitScore);

  // 2. PR turnaround time (30 pts)
  const mergedPRs = pullRequests.filter((pr) => pr.merged_at);
  if (mergedPRs.length > 0) {
    const avgHours =
      mergedPRs.reduce((acc, pr) => {
        const h =
          (new Date(pr.merged_at) - new Date(pr.created_at)) /
          (1000 * 60 * 60);
        return acc + h;
      }, 0) / mergedPRs.length;
    const prScore = Math.min(30, (1 - Math.min(avgHours, 168) / 168) * 30);
    score += prScore;
    breakdown.prTurnaround = Math.round(prScore);
  } else {
    score += 15;
    breakdown.prTurnaround = 15;
  }

  // 3. Issue resolution (20 pts)
  const realIssues = issues.filter((i) => !i.pull_request);
  const closedIssues = realIssues.filter((i) => i.state === 'closed');
  const issueScore =
    realIssues.length > 0
      ? (closedIssues.length / realIssues.length) * 20
      : 10;
  score += issueScore;
  breakdown.issueResolution = Math.round(issueScore);

  // 4. Recent activity (25 pts)
  const daysSinceUpdate =
    (Date.now() - new Date(repoData.pushed_at).getTime()) /
    (1000 * 60 * 60 * 24);
  const activityScore = Math.max(0, ((30 - daysSinceUpdate) / 30) * 25);
  score += activityScore;
  breakdown.recentActivity = Math.round(activityScore);

  const finalScore = Math.min(100, Math.round(score));

  let grade;
  if (finalScore >= 90) grade = 'A+';
  else if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else if (finalScore >= 60) grade = 'C';
  else if (finalScore >= 50) grade = 'D';
  else grade = 'F';

  return { score: finalScore, grade, breakdown };
}
