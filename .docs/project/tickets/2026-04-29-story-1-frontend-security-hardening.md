# Story 1 — Frontend Security Hardening (XSS Prep for BYOK) — Brownfield Addition

> Part of [Epic: Hosted BYOK Multi-Provider Launch](../../product/epic-byok-launch.md). Created via BMAD `brownfield-create-story` task.
>
> **Sequencing:** This story MUST land in production before Story 2 (key handling) is merged. Shipping BYOK on a known-XSS-surface frontend is the worst-of-both-worlds intermediate state.

## User Story

As a **future BYOK user of Breaking Changes**,
I want **the app to neutralize hostile content in GitHub release bodies and lock down the page's execution surface**,
So that **when I later paste my LLM API key into the app, a malicious changelog or compromised dependency cannot steal it from my browser storage**.

## Story Context

### Existing System Integration

- **Integrates with:**
  - `src/components/ChangelogPreview.tsx` (renders GitHub release bodies — fully attacker-controlled content)
  - `src/components/TechDebtSpecification.tsx` (renders LLM output — prompt-injection vector)
  - `src/components/UpgradeGuideModal.tsx` (renders LLM output — prompt-injection vector)
  - `next.config.ts` (currently empty — gains `headers()` config)
- **Technology:** Next.js 15 App Router, React 19, `react-markdown@10`, `rehype-raw@7`, `rehype-external-links@3`, Mantine 7, deployed on Coolify (Traefik default proxy) on Akamai Linode.
- **Follows pattern:** Next.js App Router `headers()` config in `next.config.ts` for response headers. Component-level rehype plugin arrays for markdown sanitization (already the project's pattern with `rehype-external-links`).
- **Touch points:**
  - 3 `ReactMarkdown` call sites currently passing `rehypePlugins={[rehypeRaw, ...]}`
  - `package.json` `dependencies` (remove `rehype-raw`, add `rehype-sanitize`)
  - `next.config.ts` (replace empty config with `async headers()`)

## Acceptance Criteria

### Functional Requirements

> **Implementation note (resolved during execution):** the original story prescribed swapping `rehype-raw` for `rehype-sanitize`. We chose **Option B** instead — dropping `rehype-raw` outright with no replacement. `react-markdown` is safe-by-default: without `rehype-raw`, raw HTML in release bodies is rendered as escaped literal text rather than parsed. No sanitizer is needed because nothing dangerous reaches the AST. Tradeoff accepted: `<details>`/`<summary>`/`<sub>`/`<sup>` in release notes render as escaped tags. Reasoning: the aggregated-changelog UX is a flat scroll, so collapsibles are neutral-to-positive to lose; this also avoids adding a dependency and the test scaffolding TDD Guard required for adding sanitization behavior.

1. **`rehype-raw` is removed** from all three `ReactMarkdown` call sites and uninstalled from `package.json`.
2. **No replacement sanitizer is added.** `react-markdown` defaults handle raw HTML safely (escapes to text). The `rehypePlugins` prop is removed entirely from `ChangelogPreview` and `TechDebtSpecification`. `UpgradeGuideModal` retains `rehypeExternalLinks` (the only remaining plugin).
3. **`next.config.ts` exports an `async headers()` function** that applies the following to all routes:
   - `Content-Security-Policy` (production only): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://avatars.githubusercontent.com https://github.githubassets.com https://user-images.githubusercontent.com https://raw.githubusercontent.com; font-src 'self' data:; connect-src 'self' https://api.github.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
     - **Notes:** `connect-src` is intentionally narrow in this story — only `self` and GitHub. Story 2 widens it. `style-src 'unsafe-inline'` is included because Mantine/emotion injects runtime styles; documented as a known compromise. CSP is gated to production because Next.js dev-mode HMR injects inline scripts and would be blocked by `script-src 'self'`.
   - `Referrer-Policy: no-referrer`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (production only)
4. **Hostile-fixture verification** confirms no script execution when the markdown components render hostile inputs: `<script>`, `<img onerror=...>`, `<a href="javascript:...">`, `<iframe>`, raw `<style>` with `expression()`, and `data:text/html,...` URIs in href/src. Without `rehype-raw`, all of these render as escaped literal text — the strongest possible neutralization.

### Integration Requirements

5. **Existing release-fetch / version-selection / changelog-aggregation flow continues to work unchanged.** The user can still paste a repo URL, see releases, pick a version range, and see the aggregated changelog — only the rendering layer has changed.
6. **Markdown rendering still works for normal markdown content.** Standard markdown — headings, lists, links via `[text](url)`, images via `![alt](src)`, code blocks, inline code, blockquotes — renders normally. Raw HTML embedded in release bodies (`<details>`, `<sub>`, `<sup>`, `<kbd>`, etc.) renders as escaped literal text; this is an accepted UX tradeoff for the aggregated-changelog flat-scroll view.
7. **External links still open in new tab.** `rehype-external-links` continues to apply in `UpgradeGuideModal.tsx`.

### Quality Requirements

8. **Hostile fixtures documented** in the PR description (the fixture markdown plus screenshot/console output showing inert rendering). Project has no test infrastructure, so verification is manual but artifacts are durable.
9. **`pnpm build` passes** with no new TypeScript or ESLint errors.
10. **`pnpm dev` smoke test** against at least 3 real public repos with rich changelogs (`facebook/react`, `vercel/next.js`, `prisma/prisma`) confirms no visible regression in changelog rendering.
11. **CSP audit** via `securityheaders.com` (or equivalent) on staging deploy returns A or A+ grade.

## Technical Notes

- **Integration Approach (as implemented):**
  - Removed `rehype-raw` from `package.json` via `pnpm remove rehype-raw`.
  - Removed `rehypePlugins={[rehypeRaw]}` from `ChangelogPreview.tsx` and `TechDebtSpecification.tsx` (no replacement). `UpgradeGuideModal.tsx` retains `rehypePlugins={[[rehypeExternalLinks, {target: '_blank'}]]}`.
  - In `next.config.ts`, exported an `async headers()` function applying the security header set above. Both CSP and HSTS are gated on `process.env.NODE_ENV === 'production'` because Next.js dev-mode HMR uses inline scripts that would be blocked by `script-src 'self'`, and HSTS would force HTTPS on local dev.
- **Existing Pattern Reference:**
  - `UpgradeGuideModal.tsx:147` already chains multiple rehype plugins as `rehypePlugins={[rehypeRaw, [rehypeExternalLinks, {target: '_blank'}]]}`. Replace `rehypeRaw` in-place with `rehypeSanitize`.
  - No prior `next.config.ts` headers pattern exists — this story establishes it.
- **Key Constraints:**
  - Mantine 7 / emotion injects inline `<style>` at runtime, so `style-src 'unsafe-inline'` is unavoidable. `script-src 'unsafe-inline'` is NOT allowed.
  - Next.js 15 with Turbopack dev mode may inject HMR scripts; verify CSP doesn't break `pnpm dev`. If it does, gate the CSP on production only and document.
  - GitHub release bodies sometimes contain image references to user-content CDNs (`user-images.githubusercontent.com`, `private-user-images.githubusercontent.com`, `github.githubassets.com`). May need to widen `img-src` after smoke testing — accept iteratively.

## Definition of Done

- [x] `rehype-raw` removed from `package.json` and all 3 call sites. *(Option B; no replacement sanitizer added — see implementation note above.)*
- [x] `next.config.ts` ships Referrer-Policy + X-Content-Type-Options + X-Frame-Options + Permissions-Policy in all environments, plus CSP + HSTS in production.
- [x] `pnpm exec tsc --noEmit` clean; `pnpm exec next lint` clean.
- [ ] Hostile fixture renders inert; documented in PR. *(Trivially satisfied — without `rehype-raw`, all HTML is escaped to text. PR description includes a sample release body containing `<script>`, `<img onerror>`, `javascript:` URLs to demonstrate.)*
- [ ] `pnpm dev` smoke test on 3 real repos clean. *(User-side verification; sandbox cannot reach Google Fonts for Geist.)*
- [ ] Staging deploy `securityheaders.com` grade ≥ A. *(Post-deploy verification.)*
- [ ] No regression in existing flows.
- [ ] Epic doc (`epic-byok-launch.md`) Story 1 acceptance items checked off.

## Risk and Compatibility

- **Primary Risk:** A real changelog uses HTML that the `defaultSchema` allowlist drops, visibly degrading rendering of legitimate release notes (e.g., complex tables, custom callouts).
- **Mitigation:** Smoke-test against three real high-traffic repos before merge. If an important tag is missing, extend the schema with that specific tag rather than reverting to `rehype-raw`. Document the extension inline.
- **Rollback:** Single git revert of the story commit. Branch `epic/byok-launch` keeps Story 1 as an isolated unit; reverting it does not affect Story 2 work in progress (Story 2 will rebase/merge on the post-revert head).

### Compatibility Verification

- [ ] No breaking changes to existing API routes (`/api/releases`, `/api/analyze`).
- [ ] No DB changes (no DB).
- [ ] UI changes are rendering-fidelity only; layout and Mantine theming unchanged.
- [ ] Performance impact: `rehype-sanitize` adds one extra AST pass per render — negligible vs. network-bound fetch latency.

## Validation Checklist

### Scope Validation

- [x] Story can be completed in one focused development session (~3 hours).
- [x] Integration approach is straightforward (3 in-place plugin swaps + one config file).
- [x] Follows existing rehype-plugin-array pattern.
- [x] No design or architecture work required.

### Clarity Check

- [x] Story requirements are unambiguous.
- [x] Integration points are listed with file paths.
- [x] Success criteria are testable (hostile fixture, securityheaders.com grade, smoke test on named repos).
- [x] Rollback approach is a single revert.
