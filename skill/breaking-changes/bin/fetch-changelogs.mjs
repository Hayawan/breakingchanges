#!/usr/bin/env node
// fetch-changelogs.mjs — the "dumb" deterministic half of Breaking Changes.
// Zero dependencies (Node 18+ global fetch). NO LLM here: it fetches and
// aggregates release notes between two versions of a public GitHub repo and
// prints them. The host agent supplies the analysis (see ../SKILL.md).
//
// Usage:
//   node fetch-changelogs.mjs <owner/repo | github-url> --from <tag> [--to <tag>] [options]
//
// Options:
//   --from <tag>     Current version tag (the one you're on). Required unless --pkg resolves it.
//   --to <tag>       Target version tag (the one you want). Defaults to the latest release/tag.
//   --pkg <name>     Infer --from from the installed version of <name> in ./package.json.
//   --token <pat>    GitHub token (or set GITHUB_TOKEN) to lift the 60 req/hr anon limit.
//   --json           Emit structured ReleaseContext JSON instead of aggregated markdown.
//   -h, --help       Show this help.
//
// Exit codes: 0 ok · 1 usage/not-found/range error · 2 network/API error.

const API = "https://api.github.com";

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests; no network, no process exit).
// ---------------------------------------------------------------------------

// owner/repo or any github.com/<owner>/<repo>[...] URL → { owner, repo } | null
export function parseRepo(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (/^[^/\s]+\/[^/\s]+$/.test(trimmed)) {
    const [owner, repo] = trimmed.split("/");
    return { owner, repo: repo.replace(/\.git$/, "") };
  }
  try {
    const url = new URL(trimmed);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.replace(/\.git$/, "").replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

const BREAKING_PATTERNS = [
  /breaking changes?/i, /\*\*breaking\*\*/i, /BREAKING CHANGE/, /incompatible/i,
  /not backward compatible/i, /dropped support/i, /deprecat(ed|ion)/i,
];
export function detectBreaking(body) {
  return !!body && BREAKING_PATTERNS.some((p) => p.test(body));
}

const DATE = (r) => new Date(r.published_at).getTime();

// Match a user-supplied tag against real tag names, tolerating a leading "v".
export function findTagIndex(items, wanted) {
  const norm = (s) => String(s).replace(/^v/i, "");
  let idx = items.findIndex((r) => r.tag_name === wanted);
  if (idx === -1) idx = items.findIndex((r) => norm(r.tag_name) === norm(wanted));
  return idx;
}

// items are newest-first; returns the inclusive slice between the two tags.
export function sliceBetween(items, from, to) {
  const fromIdx = findTagIndex(items, from);
  const toIdx = findTagIndex(items, to);
  if (fromIdx === -1) throw new RangeError(`--from tag "${from}" not found among releases/tags`);
  if (toIdx === -1) throw new RangeError(`--to tag "${to}" not found among releases/tags`);
  const [start, end] = fromIdx > toIdx ? [toIdx, fromIdx] : [fromIdx, toIdx];
  return items.slice(start, end + 1);
}

export function aggregateMarkdown(items) {
  return [...items]
    .sort((a, b) => DATE(a) - DATE(b)) // chronological, oldest → newest
    .map((r) => `## ${r.tag_name || r.name}\n\n${r.body || "No release notes available"}\n`)
    .join("\n\n---\n\n");
}

export function releaseContext(items) {
  return [...items]
    .sort((a, b) => DATE(a) - DATE(b))
    .map((r) => ({
      version: r.tag_name,
      name: r.name || r.tag_name,
      published_at: r.published_at,
      breaking_change_detected: !!r.breaking_change,
      body: r.body || "No release notes available",
    }));
}

// ---------------------------------------------------------------------------
// CLI / network layer (only runs when invoked directly).
// ---------------------------------------------------------------------------

function die(msg, code = 1) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(code);
}

function usage() {
  process.stdout.write(
    `Fetch and aggregate GitHub release notes between two versions.\n\n` +
    `  node fetch-changelogs.mjs <owner/repo | url> --from <tag> [--to <tag>] [--pkg <name>] [--token <pat>] [--json]\n`
  );
}

function parseArgs(argv) {
  const opts = { json: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--from": opts.from = argv[++i]; break;
      case "--to": opts.to = argv[++i]; break;
      case "--pkg": opts.pkg = argv[++i]; break;
      case "--token": opts.token = argv[++i]; break;
      case "--json": opts.json = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      default:
        if (a.startsWith("--")) die(`Unknown option: ${a}`, 1);
        positional.push(a);
    }
  }
  opts.target = positional[0];
  return opts;
}

async function inferVersionFromPackageJson(name) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  let raw;
  try {
    raw = await readFile(join(process.cwd(), "package.json"), "utf8");
  } catch {
    die("--pkg given but no package.json in the current directory", 1);
  }
  const pkg = JSON.parse(raw);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  const range = deps[name];
  if (!range) die(`--pkg "${name}" not found in package.json dependencies`, 1);
  return String(range).replace(/^[\^~>=<\s]+/, "").trim(); // ^1.2.3 → 1.2.3
}

function headers(token) {
  const h = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "breaking-changes-skill",
  };
  const resolved = token ?? process.env.GITHUB_TOKEN;
  if (resolved) h.Authorization = `Bearer ${resolved}`;
  return h;
}

function hasNextPage(linkHeader) {
  return !!linkHeader && linkHeader.includes('rel="next"');
}

async function getPaged(path, token) {
  const out = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${API}${path}&per_page=100&page=${page}`, { headers: headers(token) });
    if (!res.ok) {
      if (res.status === 404) die(`repository not found`, 1);
      if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")
        die(`GitHub API rate limit exceeded — pass --token or set GITHUB_TOKEN`, 2);
      die(`GitHub API error: ${res.status} ${res.statusText}`, 2);
    }
    const batch = await res.json();
    out.push(...batch);
    if (batch.length === 0 || !hasNextPage(res.headers.get("link"))) break;
    page++;
  }
  return out;
}

// Releases first; if a repo publishes none, fall back to tags (dated via commit lookup).
async function fetchReleaseLikeItems(owner, repo, token) {
  const releases = await getPaged(`/repos/${owner}/${repo}/releases?`, token);
  if (releases.length > 0) {
    return releases
      .map((r) => ({
        tag_name: r.tag_name,
        name: r.name || r.tag_name,
        published_at: r.published_at,
        body: r.body || "",
        breaking_change: detectBreaking(r.body),
      }))
      .sort((a, b) => DATE(b) - DATE(a));
  }

  process.stderr.write(`note: no GitHub Releases for ${owner}/${repo}; falling back to tags\n`);
  const tags = (await getPaged(`/repos/${owner}/${repo}/tags?`, token)).slice(0, 50);
  const dated = await Promise.all(
    tags.map(async (t) => {
      let date = new Date(0).toISOString();
      try {
        const res = await fetch(t.commit.url, { headers: headers(token) });
        if (res.ok) {
          const d = await res.json();
          date = d.commit?.committer?.date || d.commit?.author?.date || date;
        }
      } catch { /* keep epoch fallback */ }
      return {
        tag_name: t.name,
        name: t.name,
        published_at: date,
        body: `This is a tag (${t.name}) without release notes.`,
        breaking_change: false,
      };
    })
  );
  return dated.sort((a, b) => DATE(b) - DATE(a));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.target) {
    usage();
    process.exit(opts.help ? 0 : 1);
  }

  const repo = parseRepo(opts.target);
  if (!repo) die(`could not parse "<owner/repo | url>" from "${opts.target}"`, 1);

  if (!opts.from && opts.pkg) opts.from = await inferVersionFromPackageJson(opts.pkg);
  if (!opts.from) die(`--from is required (or pass --pkg <name> to infer it from package.json)`, 1);

  const items = await fetchReleaseLikeItems(repo.owner, repo.repo, opts.token);
  if (items.length === 0) die(`no releases or tags found for ${repo.owner}/${repo.repo}`, 1);

  const to = opts.to ?? items[0].tag_name; // newest
  let between;
  try {
    between = sliceBetween(items, opts.from, to);
  } catch (e) {
    die(e.message, 1);
  }

  if (opts.json) {
    process.stdout.write(
      JSON.stringify(
        { repo: `${repo.owner}/${repo.repo}`, from: opts.from, to, count: between.length, releases: releaseContext(between) },
        null,
        2
      ) + "\n"
    );
  } else {
    process.stdout.write(
      `# Changelogs for ${repo.owner}/${repo.repo}: ${opts.from} → ${to}\n` +
      `# ${between.length} release(s) in range\n\n` +
      aggregateMarkdown(between) + "\n"
    );
  }
}

// Run main() only when executed directly, not when imported by the test file.
import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => die(err?.message || String(err), 2));
}
