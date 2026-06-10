---
name: breaking-changes
description: Analyze breaking changes between two versions of a public GitHub dependency and produce a tech-debt / upgrade spec. Use when the user wants to know what breaks when upgrading a library (e.g. "what breaks if I bump react from 18 to 19", "is this major version safe to upgrade", "plan the upgrade from X to Y", "analyze breaking changes for <repo>").
---

# Breaking Changes

Turn the release notes between two versions of a GitHub dependency into a concrete,
actionable upgrade plan. The deterministic half — fetching and aggregating the
changelogs — is done by a zero-dependency helper script. **You** supply the analysis;
there is no API key and no external LLM call.

## When to use

The user is on version X of some dependency and is considering (or being forced) to move
to version Y, and wants to know: what breaks, how risky it is, and how to sequence the work.

## Workflow

### 1. Resolve the inputs

You need three things: the dependency's **GitHub repo** (`owner/repo`), the **current**
version, and the **target** version.

- If the user is in a project, infer the current version from `package.json` (the helper
  does this with `--pkg <name>`, stripping `^`/`~`). Confirm the GitHub repo for that
  package if it isn't obvious (check its `repository` field on npm if unsure).
- If they only name a target like "latest" / "newest", omit `--to` — the helper defaults
  to the newest release/tag.
- Tags with or without a leading `v` both work.

### 2. Fetch the changelogs

> In the commands below, **`<skill-dir>` is the directory this skill is installed in** — the
> folder containing this `SKILL.md`. Substitute its absolute path before running (e.g.
> `~/.claude/skills/breaking-changes` for a global install, or `.claude/skills/breaking-changes`
> when installed in a project). Do **not** run the literal string `<skill-dir>`.

Run the helper (Node 18+, no install). Prefer `--json` — it carries the per-release
breaking-change flag and is cleaner to reason over:

```bash
node <skill-dir>/bin/fetch-changelogs.mjs <owner/repo> --from <current> --to <target> --json
```

Convenience forms:

```bash
# Infer --from from the local package.json (great inside a project)
node <skill-dir>/bin/fetch-changelogs.mjs facebook/react --pkg react --json

# Human-readable aggregated markdown instead of JSON
node <skill-dir>/bin/fetch-changelogs.mjs colinhacks/zod --from v3.22.0 --to v3.23.0
```

If the user hits the GitHub rate limit (60 req/hr anon), have them pass `--token <pat>`
or set `GITHUB_TOKEN`. If a repo has no GitHub Releases, the helper falls back to **tags**
(which have no notes) and says so on stderr — in that case lean on the version diff and
the repo's commit history rather than expecting rich changelogs.

### 3. Produce the tech-debt specification

Analyze the fetched releases and write a **comprehensive tech-debt specification in
markdown**, suitable for team handoff. Follow this framing:

1. **Identify every breaking change** that requires code modifications — removed/renamed
   functions, changed APIs, behavioral shifts, deprecations, dropped platform/runtime
   support. Classify each as one of: `API` · `Behavior` · `Dependencies` · `Security` · `Tooling`.

2. **Write the spec** with:
   - An overview of the upgrade scope and risks.
   - Clear, ordered action items for developers.
   - "Before → after" code examples where the changelog gives you enough to show them.
   - A **complexity rating** — Low / Medium / High — justified by the number and severity
     of breaking changes, the size of the user's project, and the integration surface area.

3. **Make context-aware recommendations**, especially:
   - If an *earlier* version in the range carries a security fix but a *later* one piles on
     refactors, suggest upgrading to the safe intermediate version first.
   - If the jump is too big for one sprint, propose an **iterative path** (e.g. v1 → v2 → v3)
     broken into phases.
   - Call out where dependency updates can be **decoupled or parallelized** across modules.

4. **Tailor to project size:**
   - Small projects → favor direct upgrades, especially for security/stability.
   - Large/monolithic codebases → emphasize phased upgrades, feature flags / migration
     toggles, and a documentation + communication plan.

5. Where applicable, note common pitfalls for this specific upgrade and any opportunities to
   delete deprecated code or simplify architecture while you're in there.

Keep it clear, technically accurate, and pragmatic. If you have access to the user's actual
codebase, ground the action items in their real call sites rather than generic advice.

## Notes

- The helper is pure data: it never calls an LLM and needs no API key. All intelligence is yours.
- Run `node <skill-dir>/bin/fetch-changelogs.mjs --help` for the full flag list.

## Known limitations

These are inherited from the original implementation — be aware when interpreting output:

- **Tags fallback is unreliable for large repos.** When a repo has no GitHub Releases, the
  helper falls back to **tags**, but only inspects the first 50 tags **in GitHub's API
  order, which is not chronological** (e.g. `golang/go` returns ancient `weekly.*` tags
  first). For repos with many tags, your requested range may simply not be in that window —
  you'll get a "tag not found" error. The fallback is dependable only for repos with rich
  Releases or relatively few tags. If you hit this, fetch the tag/commit range directly with
  `git` or `gh api` instead. The tags path is also **request-heavy** (one commit lookup per
  tag, up to 50) — set `GITHUB_TOKEN` before using it.
- **Range ordering assumes chronological releases.** The range is sliced by `published_at`.
  A back-ported patch published *after* a later major (e.g. a `v3.22.5` security release cut
  after `v4.0.0`) can land in the wrong slice position and skew the range. Sanity-check the
  emitted version list before trusting the analysis.
- **`--pkg` doesn't resolve scoped / monorepo tags.** It infers a bare version like `1.2.3`
  from `package.json`; repos that tag as `pkg@1.2.3` or `@scope/pkg@1.2.3` won't match. Pass
  `--from` explicitly for those.
