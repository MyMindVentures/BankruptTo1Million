import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { handleJourneyRoute } from './journey-routing.mjs';

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const distDir = resolve('dist');
const indexFile = join(distDir, 'index.html');
const githubOwner = process.env.GITHUB_OWNER || 'MyMindVentures';
const githubRepo = process.env.GITHUB_REPO || 'BankruptTo1Million';
const githubApiBaseUrl = (process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/$/, '');
const impactCacheTtlMs = Number(process.env.IMPACT_CACHE_TTL_MS || 15 * 60 * 1000);
let impactCache = null;

function isBotUser(user) {
  const login = String(user?.login || '').toLowerCase();
  return user?.type === 'Bot' || login.includes('[bot]') || login.endsWith('-bot') || login === 'dependabot';
}

async function fetchGitHub(path) {
  const response = await fetch(`${githubApiBaseUrl}/repos/${githubOwner}/${githubRepo}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'BankruptTo1Million-impact-dashboard',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub API request failed: ${response.status}`);
  return response.json();
}

async function fetchAllPages(path, maxPages = 5, arrayKey = '') {
  const records = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const pageResponse = await fetchGitHub(`${path}${separator}per_page=100&page=${page}`);
    const pageRecords = arrayKey && pageResponse ? pageResponse[arrayKey] : pageResponse;
    if (!Array.isArray(pageRecords) || pageRecords.length === 0) break;
    records.push(...pageRecords);
    if (pageRecords.length < 100) break;
  }
  return records;
}

function labelNames(item) {
  return Array.isArray(item.labels) ? item.labels.map((label) => String(label.name || '').toLowerCase()) : [];
}

function categoryFor(item) {
  const title = String(item.title || '').toLowerCase();
  const labels = labelNames(item);
  if (labels.some((label) => label.includes('bug')) || title.includes('fix') || title.includes('bug')) return 'Bug fix';
  if (labels.some((label) => label.includes('backend') || label.includes('api')) || title.includes('backend') || title.includes('api') || title.includes('server')) return 'Backend';
  if (labels.some((label) => label.includes('feature') || label.includes('enhancement')) || title.includes('feature') || title.includes('add ')) return 'Feature';
  if (labels.some((label) => label.includes('accessibility')) || title.includes('accessibility') || title.includes('a11y')) return 'Accessibility';
  if (labels.some((label) => label.includes('ui') || label.includes('design')) || title.includes('ui')) return 'UI';
  return 'Contribution';
}

function ensureContributor(map, user) {
  if (!user?.login) return null;
  if (!map.has(user.login)) {
    map.set(user.login, {
      login: user.login,
      displayName: user.name || user.login,
      avatarUrl: user.avatar_url || '',
      profileUrl: user.html_url || `https://github.com/${user.login}`,
      implementedIssues: [],
      mergedPullRequests: [],
      reviewsPerformed: 0,
      featuresCompleted: 0,
      bugFixesCompleted: 0,
      firstContributionDate: undefined,
      mostRecentContributionDate: undefined,
      badges: [],
      isBot: isBotUser(user),
    });
  }
  return map.get(user.login);
}

function applyContributionDates(contributor, dateValue) {
  if (!dateValue) return;
  if (!contributor.firstContributionDate || new Date(dateValue) < new Date(contributor.firstContributionDate)) contributor.firstContributionDate = dateValue;
  if (!contributor.mostRecentContributionDate || new Date(dateValue) > new Date(contributor.mostRecentContributionDate)) contributor.mostRecentContributionDate = dateValue;
}

function addBadges(contributor) {
  const totalIssues = contributor.implementedIssues.length;
  const badges = [];
  if (contributor.mergedPullRequests.length > 0 || totalIssues > 0) badges.push({ label: 'Founding Builder', criteria: 'At least one verified merged PR or implemented issue in the early repository.' });
  if (contributor.mergedPullRequests.length === 1 || totalIssues === 1) badges.push({ label: 'First Contribution', criteria: 'Exactly one verified contribution so far.' });
  if (contributor.bugFixesCompleted > 0) badges.push({ label: 'Bug Hunter', criteria: 'At least one merged or closed item categorized as a bug fix.' });
  if (contributor.featuresCompleted > 0) badges.push({ label: 'UI Builder', criteria: 'At least one feature or UI-oriented merged contribution.' });
  if (contributor.mergedPullRequests.some((pr) => pr.category === 'Backend') || contributor.implementedIssues.some((issue) => issue.category === 'Backend')) badges.push({ label: 'Backend Builder', criteria: 'A verified contribution is labeled or titled as backend, API or server work.' });
  if (contributor.implementedIssues.some((issue) => issue.category === 'Accessibility') || contributor.mergedPullRequests.some((pr) => pr.category === 'Accessibility')) badges.push({ label: 'Accessibility Champion', criteria: 'A verified contribution is labeled or titled for accessibility.' });
  if (totalIssues >= 10) badges.push({ label: '10 Issues Implemented', criteria: 'At least ten unique implemented issues are attributed to this contributor.' });
  if (totalIssues >= 25) badges.push({ label: '25 Issues Implemented', criteria: 'At least twenty-five unique implemented issues are attributed to this contributor.' });
  if (totalIssues >= 100) badges.push({ label: '100 Issues Implemented', criteria: 'At least one hundred unique implemented issues are attributed to this contributor.' });
  contributor.badges = badges;
}

async function buildImpactData() {
  const [issues, pulls, workflowRuns] = await Promise.all([
    fetchAllPages('/issues?state=all'),
    fetchAllPages('/pulls?state=closed'),
    fetchAllPages('/actions/runs?status=completed', 2, 'workflow_runs').catch(() => []),
  ]);
  const realIssues = issues.filter((issue) => !issue.pull_request);
  const closedIssues = realIssues.filter((issue) => issue.state === 'closed');
  const mergedPulls = pulls.filter((pull) => pull.merged_at);
  const contributors = new Map();
  const issueNumbersAttributed = new Set();

  for (const pull of mergedPulls) {
    const contributor = ensureContributor(contributors, pull.user);
    if (!contributor) continue;
    const category = categoryFor(pull);
    contributor.mergedPullRequests.push({ number: pull.number, title: pull.title || `Pull request #${pull.number}`, url: pull.html_url, category, mergedAt: pull.merged_at });
    if (category === 'Feature' || category === 'UI') contributor.featuresCompleted += 1;
    if (category === 'Bug fix') contributor.bugFixesCompleted += 1;
    applyContributionDates(contributor, pull.merged_at);
    const linkedNumbers = new Set(String(pull.body || '').match(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)?.map((match) => Number(match.match(/\d+/)?.[0])) || []);
    for (const issueNumber of linkedNumbers) {
      const issue = closedIssues.find((candidate) => candidate.number === issueNumber);
      if (!issue || issueNumbersAttributed.has(issue.number)) continue;
      const issueCategory = categoryFor(issue);
      contributor.implementedIssues.push({ number: issue.number, title: issue.title || `Issue #${issue.number}`, url: issue.html_url, state: issue.state, category: issueCategory, closedAt: issue.closed_at });
      if (issueCategory === 'Feature' || issueCategory === 'UI') contributor.featuresCompleted += 1;
      if (issueCategory === 'Bug fix') contributor.bugFixesCompleted += 1;
      applyContributionDates(contributor, issue.closed_at);
      issueNumbersAttributed.add(issue.number);
    }
  }

  for (const issue of closedIssues) {
    if (issueNumbersAttributed.has(issue.number)) continue;
    const assignees = Array.isArray(issue.assignees) && issue.assignees.length ? issue.assignees : issue.user ? [issue.user] : [];
    for (const assignee of assignees) {
      const contributor = ensureContributor(contributors, assignee);
      if (!contributor) continue;
      const category = categoryFor(issue);
      contributor.implementedIssues.push({ number: issue.number, title: issue.title || `Issue #${issue.number}`, url: issue.html_url, state: issue.state, category, closedAt: issue.closed_at });
      if (category === 'Feature' || category === 'UI') contributor.featuresCompleted += 1;
      if (category === 'Bug fix') contributor.bugFixesCompleted += 1;
      applyContributionDates(contributor, issue.closed_at);
    }
    issueNumbersAttributed.add(issue.number);
  }

  const pullReviewLists = await Promise.all(mergedPulls.map((pull) => fetchAllPages(`/pulls/${pull.number}/reviews`, 2).catch(() => [])));
  const reviewedPullsByContributor = new Map();
  for (const reviews of pullReviewLists) {
    const reviewAuthors = new Set();
    for (const review of reviews) {
      if (!review?.user?.login || isBotUser(review.user)) continue;
      reviewAuthors.add(review.user.login);
      ensureContributor(contributors, review.user);
    }
    for (const login of reviewAuthors) reviewedPullsByContributor.set(login, (reviewedPullsByContributor.get(login) || 0) + 1);
  }
  for (const [login, reviewCount] of reviewedPullsByContributor.entries()) {
    const contributor = contributors.get(login);
    if (contributor) contributor.reviewsPerformed = reviewCount;
  }

  const contributorList = Array.from(contributors.values()).map((contributor) => { addBadges(contributor); return contributor; }).sort((a, b) => (b.mergedPullRequests.length + b.implementedIssues.length) - (a.mergedPullRequests.length + a.implementedIssues.length));
  const successfulWorkflowRuns = workflowRuns.filter((run) => run.conclusion === 'success');
  return {
    source: `https://github.com/${githubOwner}/${githubRepo}`,
    refreshedAt: new Date().toISOString(),
    cacheTtlMinutes: Math.round(impactCacheTtlMs / 60000),
    stale: false,
    stats: {
      totalIssues: realIssues.length,
      openIssues: realIssues.filter((issue) => issue.state === 'open').length,
      closedIssues: closedIssues.length,
      featuresCompleted: closedIssues.filter((issue) => ['Feature', 'UI', 'Backend'].includes(categoryFor(issue))).length + mergedPulls.filter((pull) => ['Feature', 'UI', 'Backend'].includes(categoryFor(pull))).length,
      bugFixesCompleted: closedIssues.filter((issue) => categoryFor(issue) === 'Bug fix').length + mergedPulls.filter((pull) => categoryFor(pull) === 'Bug fix').length,
      mergedPullRequests: new Set(mergedPulls.map((pull) => pull.number)).size,
      testsPassed: successfulWorkflowRuns.length,
    },
    contributors: contributorList.filter((contributor) => !contributor.isBot),
    bots: contributorList.filter((contributor) => contributor.isBot),
    attributionRules: [
      'GitHub issues are counted from the public repository issues API; pull requests returned in the issues endpoint are removed from issue totals.',
      'Merged pull requests are counted once by unique pull request number.',
      'Implemented issues are attributed first through closing keywords in merged pull request bodies, then through closed issue assignees or the closer-visible issue author when no assignee exists.',
      'Feature, bug, UI, backend and accessibility categories are inferred from GitHub labels and titles when labels are absent.',
      'Reviews are counted from public pull request review records once per reviewed pull request per reviewer.',
      'Successful completed GitHub Actions workflow runs are counted as passed verification checks when workflow data is publicly available.',
      'Bot accounts are excluded from the public Wall of Founding Builders and reported separately.',
      `Server data is cached for ${Math.round(impactCacheTtlMs / 60000)} minutes to reduce GitHub rate-limit risk.`,
    ],
  };
}

async function sendImpactData(response) {
  const now = Date.now();
  try {
    if (!impactCache || now - impactCache.createdAt > impactCacheTtlMs) impactCache = { createdAt: now, data: await buildImpactData() };
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' });
    response.end(JSON.stringify({ ...impactCache.data, stale: now - impactCache.createdAt > impactCacheTtlMs }));
  } catch (error) {
    if (impactCache) {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' });
      response.end(JSON.stringify({ ...impactCache.data, stale: true, warning: error instanceof Error ? error.message : 'Unknown GitHub synchronization error' }));
      return;
    }
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    response.end(JSON.stringify({ message: error instanceof Error ? error.message : 'Unknown GitHub synchronization error' }));
  }
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function sendFile(response, filePath) {
  const stream = createReadStream(filePath);
  response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream', 'Cache-Control': filePath === indexFile ? 'no-cache' : 'public, max-age=31536000, immutable' });
  stream.pipe(response);
  stream.on('error', () => { response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Internal server error'); });
}

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
  if (url.pathname === '/api/impact') { void sendImpactData(response); return; }
  if (url.pathname === '/api/journey-route') { void handleJourneyRoute(request, response); return; }

  const decodedPath = decodeURIComponent(url.pathname);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const requestedFile = resolve(distDir, `.${safePath}`);
  const isInsideDist = requestedFile === distDir || requestedFile.startsWith(`${distDir}${sep}`);
  if (isInsideDist && existsSync(requestedFile) && statSync(requestedFile).isFile()) { sendFile(response, requestedFile); return; }
  if (existsSync(indexFile)) { sendFile(response, indexFile); return; }
  response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Production build not found. Run npm run build before starting the server.');
}).listen(port, host, () => console.log(`Serving ${distDir} on http://${host}:${port}`));
