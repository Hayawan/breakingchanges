# Epic: Hosted BYOK Multi-Provider Launch — Brownfield Enhancement

> Created via BMAD `brownfield-create-epic` task. Scope is intentionally held to 3 stories; CLI variant is recorded under Future Enhancements rather than expanded into a 4th story. If the CLI direction is prioritized, escalate to a full brownfield PRD instead of growing this epic.

---

## Epic Goal

Take Breaking Changes from a single-provider, locally-run app to a publicly hosted, **bring-your-own-key (BYOK)** service that supports the major LLM providers — without introducing a database, an account system, or server-side key storage. Users supply their own API key, scoped to their browser session, and pay their own provider directly.

---

## Epic Description

### Existing System Context

- **Current functionality:** Next.js 15 web app that fetches GitHub releases, lets the user pick a version range, aggregates the changelog, and (per the PRD) summarizes breaking changes via an LLM.
- **Technology stack:** Next.js 15 (App Router, Turbopack), React 19, Mantine 7, TanStack Query 5, `openai` SDK ^4.93, `react-markdown` 10 with `rehype-raw` and `rehype-external-links`, TypeScript 5, pnpm.
- **Hosting:** Coolify (self-managed) on an **Akamai Linode** VPS. Default Coolify install uses **Traefik** as the reverse proxy with stock configuration (no custom log directives). Linode performs infrequent infrastructure backups at the VPS level. This combination affects rollback path, log policy, and sub-processor disclosure in the privacy notice.
- **Integration points:**
  - The single LLM call site (today wired to `openai` directly) — to be abstracted behind a provider-agnostic interface.
  - The markdown renderer for changelog output — currently allows raw HTML through `rehype-raw`, which becomes a same-origin XSS sink once user keys live in browser storage.
  - The Next.js API route(s) that proxy LLM requests — must accept a per-request key without logging or persisting it.
  - GitHub REST API path (anonymous today, 60 req/hr limit) — adjacent concern, optional GitHub PAT field worth folding into the same settings panel.

### Enhancement Details

- **What's being added/changed:**
  1. Replace direct `openai` usage with the **Vercel AI SDK** and add provider adapters for OpenAI, Anthropic, Google, and Mistral (minimum). Add a provider + model selector to the UI.
  2. Harden the frontend against XSS *before* keys are introduced into browser storage: drop or sandbox `rehype-raw`, ship a strict Content-Security-Policy, add the standard security headers, and audit for inline scripts/eval.
  3. Add a settings panel for users to enter and manage their own API key(s). Default storage is `sessionStorage` (cleared on tab close); `localStorage` is opt-in with an explicit warning. Show last-4 of the stored key, provide a one-click clear, and add idle auto-clear.
  4. Server-side `/api/summarize` route forwards the user's key to the chosen provider, sets `Cache-Control: no-store`, and never logs bodies, prompts, completions, or the `Authorization` header.
  5. Publish ToS and Privacy pages reflecting the BYOK model, plus a short user guide on scoping API keys per provider, using a password manager, and self-hosting locally as the most privacy-preserving option.

- **How it integrates:**
  - The provider abstraction replaces the existing single-call site; UI gains a small selector but the rest of the flow (URL → releases → version range → changelog → summary) is unchanged.
  - The settings panel is a Mantine modal/drawer reachable from the header; key state is owned by a small client-only store, never crossed into the React Query cache.
  - The API route signature changes only to accept `provider`, `model`, and an `Authorization` header from the client; no DB, no session, no auth.
  - Legal and guide pages live under `src/app/(legal)/` and are linked from the footer and the first-run modal.

- **Success criteria:**
  - The deployed app accepts an OpenAI, Anthropic, Google, or Mistral key from the user's browser and returns a streamed breaking-changes summary using that key.
  - No user-supplied key is ever written to a server log, error report, analytics event, cache header, or persisted store. Verified by code review and a log-inspection check on staging.
  - CSP is strict (`script-src 'self'`, no `unsafe-inline`, no `unsafe-eval`); markdown rendering does not execute embedded scripts when given a hostile release body fixture.
  - ToS, Privacy, and BYOK guide pages are linked from the footer and surfaced in the first-run modal before the user is ever prompted for a key.

---

## Stories

### Story 1 — Frontend Security Hardening (XSS Prep for BYOK)

Land the hardening work *before* any key ever touches browser storage, so we never ship an intermediate state where `localStorage`/`sessionStorage` holds a key alongside a known same-origin XSS sink.

**In scope:**
- Remove `rehype-raw` from the markdown pipeline, or replace with a strict allowlist (`rehype-sanitize` with a tight schema). Verify with hostile changelog fixtures (script tags, `<img onerror>`, `javascript:` URLs, data URIs).
- Add a strict Content-Security-Policy via `next.config.ts` headers or middleware: `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'` (only if Mantine genuinely requires it; otherwise drop), `connect-src 'self' https://api.github.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.mistral.ai`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`.
- Add `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy` (deny camera/mic/geolocation/payment), `Strict-Transport-Security` for the deployed domain.
- Audit for any inline scripts, `dangerouslySetInnerHTML`, or `eval`-style patterns introduced by dependencies. Ensure analytics/observability (if any) is compatible with the CSP or removed.
- No secrets accepted yet — this story only closes the XSS surface.

**Acceptance:**
- Hostile changelog fixture renders inert text; no script execution observed in headless browser test.
- CSP report-only run on staging produces zero violations from the legitimate app flow.
- Lighthouse / `securityheaders.com`-style audit returns A-grade on the deployed staging URL.

### Story 2 — Multi-Provider AI SDK Migration + BYOK Key Flow

**In scope — Provider abstraction:**
- Add Vercel AI SDK: `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral`. Run dependency score check per `DEPENDENCY.md` before installing.
- Replace direct `openai` call site with a provider-agnostic `streamText`/`generateText` invocation that picks the adapter from a `provider` parameter.
- Add provider + model selector to the comparison UI (Mantine `Select`). Persist selection alongside the key.

**In scope — Key handling:**
- Settings drawer reachable from header. Per-provider key input with paste support, format validation (e.g., `sk-` prefix for OpenAI, `sk-ant-` for Anthropic), and a "test connection" button that pings the provider's lightweight models endpoint.
- Default storage is `sessionStorage`. Opt-in `localStorage` toggle labeled "Remember on this device" with an explicit warning describing the XSS risk in plain language.
- Visible key indicator: provider name + last 4 chars (e.g., `OpenAI ····A3f9`). One-click "Clear key" per provider and "Clear all keys."
- Idle auto-clear: if the tab has been inactive for 24 h (configurable), keys are wiped from `localStorage` on next focus.
- First-run modal explaining: where the key is stored, that it is sent to our server only as a transit proxy, that it is never persisted server-side, and how to revoke at the provider.

**In scope — Server route:**
- `/api/summarize` accepts `provider`, `model`, and an `Authorization: Bearer <user-key>` header.
- Route sets `Cache-Control: no-store, no-cache, must-revalidate`.
- Logging policy enforced in code: no request bodies, no headers, no completions in logs. Sentry / error reporters (if added) configured with `beforeSend` to strip `Authorization`, request body, and any field matching common key prefixes.
- No app-level rate limiting on the proxy route. The upstream GitHub API enforces its own limits (60 req/hr unauth, 5,000 req/hr with PAT), and the LLM call requires a user-supplied key — abuse cost falls on the abuser's own provider account, not ours. If platform-level abuse becomes a real problem, revisit.
- Optional GitHub PAT field in settings, sent only with GitHub requests, same storage rules. Recommended in the BYOK guide as the way to lift the 60 req/hr ceiling.

**Acceptance:**
- A user can paste an OpenAI key, an Anthropic key, a Google key, and a Mistral key, switch between providers, and receive a streamed summary from each.
- Browser DevTools → Application → Storage shows `sessionStorage` populated by default; nothing in `localStorage` unless the user opted in.
- Application code emits no logs containing keys, request bodies, or completions. Verified by code review and a grep of the deployed source.
- Traefik (Coolify default proxy) access-log behavior verified on the actual deployed stack — Traefik does not log access requests by default unless explicitly enabled, so the expected state is "no proxy access logs at all." If access logs *are* found to be enabled, either disable them or confirm the format excludes `Authorization` headers and request bodies. Verified by inspecting `docker logs` for the Traefik container and the application container on staging after a full run-through.

### Story 3 — Terms, Privacy, and BYOK User Guide

**In scope:**
- `src/app/(legal)/terms/page.tsx` — Terms of Service covering: BYOK disclaimer (user is responsible for key custody and any provider charges they incur), proxy-only role, AS-IS / no-warranty, acceptable use, indemnification for misuse, governing law, age gate (**13+**, COPPA minimum), changelog of ToS revisions with effective date.
- `src/app/(legal)/privacy/page.tsx` — Privacy Policy covering:
  - **No application-level logging.** No keys, prompts, completions, or request bodies are written by our code.
  - **Reverse-proxy logs.** Traefik runs with default Coolify configuration; access logs are not enabled. State this plainly — and if the deployed-state check in Story 2 contradicts it, update the policy and the config so they agree.
  - **Infrastructure sub-processor.** **Akamai Linode** operates the underlying VPS. They have hypervisor-level access to the machine but no logical access to application data; subject to their own privacy and security policies (link out).
  - **Backups.** Infrequent VPS-level snapshots taken at the Linode layer may incidentally capture container/disk state. State the cadence (once you decide it) and that they are encrypted at rest per Linode's policy.
  - **Third-party processors invoked at the user's direction.** The LLM provider the user selected (OpenAI / Anthropic / Google / Mistral) and GitHub for release fetches. The user's request to those providers is governed by *their* terms.
  - **GDPR lawful basis** (legitimate interest for service operation), **DSAR contact**, **cookies** (none, ideally — confirm during build).
- `src/app/(legal)/byok-guide/page.tsx` — short, plain-English guide:
  - **Scope your key.** Per-provider instructions for creating a *project-* or *workspace-scoped* key with a low spend cap (OpenAI projects, Anthropic workspaces, Google AI Studio API keys with restrictions, Mistral workspace keys). One screenshot or link per provider.
  - **Use a password manager.** 1Password / Bitwarden / Apple Passwords — paste from manager into the settings field rather than typing or pasting from a notes file. Mention `sessionStorage` default means re-paste each session, which pairs naturally with manager autofill.
  - **Run it locally instead.** Instructions to clone, `pnpm install`, set keys via `.env.local`, and run `pnpm dev`. Note this is the *most* privacy-preserving option because no key ever leaves the user's machine.
  - **Revoke fast if you suspect compromise.** Per-provider revoke links.
- Footer links to Terms, Privacy, BYOK Guide on every page.
- First-run modal (from Story 2) links into the BYOK Guide before the user is asked to paste a key.

**Acceptance:**
- All three pages render with correct content, are linked from the footer, and pass the existing CSP from Story 1.
- BYOK Guide includes per-provider key-scoping instructions with working links to each provider's key-management dashboard.
- Legal review (or self-review with a documented checklist) sign-off recorded in the PR description before merge.

---

## Compatibility Requirements

- [x] Existing GitHub-fetch / version-selection / changelog-aggregation flow remains unchanged.
- [x] No database introduced; no schema concerns.
- [x] UI changes follow existing Mantine patterns; settings drawer mirrors Mantine documentation patterns.
- [x] Performance impact is minimal — provider streaming preserves perceived latency; CSP and rate-limit middleware add negligible overhead.
- [x] Existing `.env.local` flow continues to work for local self-hosted use (Story 3 guide depends on it).

---

## Risk Mitigation

- **Primary Risk:** A user-supplied API key is exfiltrated via XSS (compromised dependency, unsanitized release-body content, or future careless code) once keys live in browser storage. Secondary risk: a key is leaked via server logs, error reporters, or cache headers.
- **Mitigation:**
  - Sequence Story 1 (hardening) *before* Story 2 (key handling). Do not merge Story 2 to main until Story 1 is in production.
  - Default to `sessionStorage`; `localStorage` is opt-in with explicit warning.
  - Strict CSP, no `unsafe-inline`, no third-party scripts without SRI.
  - `react-markdown` without `rehype-raw`, with hostile-fixture tests.
  - Server route enforces no-log policy in code review checklist; staging log audit before launch.
  - Upstream rate limits (GitHub's API quota and the user's own provider quota) naturally cap abuse — no app-level rate-limiter needed.
- **Rollback Plan:**
  - Each story ships behind its own deploy. Story 2 specifically: keep the existing single-provider code path on a feature flag for one release so the BYOK UI can be disabled by env var if a key-handling bug is discovered post-launch.
  - Revert is a Coolify rollback to the previous deployment (git tag or prior image, depending on the deploy mode configured).
  - If a key leak is discovered post-launch: pull the deploy, rotate any logs that may have inadvertently captured key material, notify users via an in-app banner and the GitHub repo, and recommend they revoke at their provider.

---

## Definition of Done

- [ ] All three stories completed with acceptance criteria met.
- [ ] Existing comparison flow verified against at least 3 real repos (e.g., `facebook/react`, `vercel/next.js`, `prisma/prisma`) and produces correct output.
- [ ] Provider matrix verified: OpenAI, Anthropic, Google, Mistral all return streamed summaries from a user-supplied key.
- [ ] Staging log audit confirms zero key leakage.
- [ ] CSP audit returns A-grade.
- [ ] ToS, Privacy, BYOK Guide live and linked.
- [ ] First-run modal renders before any key prompt.
- [ ] Rollback path validated by deploying to staging, toggling the kill-switch env var, and confirming graceful fallback.
- [ ] No regression in existing release-fetch / version-selection / changelog-aggregation flow.
- [ ] PRD (`main-PRD.md`) updated to reflect BYOK model.

---

## Future Enhancements (Out of Scope for This Epic)

- **CLI variant.** Repackage the core engine (URL parsing, GitHub fetch, version-range diff, LLM summarization) as a standalone CLI users can run locally alongside their coding agent — keys come from environment variables or `~/.config/breaking-changes/config`, no browser, no proxy. This is a meaningfully different distribution model and likely warrants its own brownfield PRD: workspace restructure into a monorepo (`packages/core`, `packages/web`, `packages/cli`), npm publishing pipeline, agent-friendly output formats (JSON, NDJSON streaming for piping into Claude Code / Codex / Cursor flows). **Recommendation:** spike a 1-day proof-of-concept after Epic completion to size the workspace refactor before committing to a full PRD.
- **Authenticated GitHub access for private repos** (already noted in `main-PRD.md` § 7).
- **Multi-repo tracking dashboard** (already noted in `main-PRD.md` § 7).
- **Saved comparisons** in browser/localStorage — small surface, easy add-on after BYOK ships.
- **Per-user spend visibility** — pull provider usage endpoints to show estimated cost per comparison.

---

## Story Manager Handoff

> Please develop detailed user stories for this brownfield epic. Key considerations:
>
> - This is an enhancement to an existing system running **Next.js 15 App Router, React 19, Mantine 7, TanStack Query 5, TypeScript 5, pnpm**, hosted on **Coolify on a self-managed VPS** (Traefik or Caddy as the reverse proxy depending on Coolify config).
> - **Integration points:** the single LLM call site (currently `openai` SDK), the markdown renderer (currently `react-markdown` + `rehype-raw`), the `/api/*` route(s), and the Next.js header/middleware config for CSP.
> - **Existing patterns to follow:** Mantine components for all UI surfaces, TanStack Query for server-state caching, Server Components for GitHub fetches where already used, App Router route groups for legal pages.
> - **Critical compatibility requirements:**
>   1. No database, no account system, no server-side key persistence.
>   2. `sessionStorage` is the default for keys; `localStorage` is opt-in only.
>   3. Story 1 (hardening) must ship to production before Story 2 (key handling) is merged.
>   4. Server route must never log keys, prompts, completions, or auth headers.
>   5. CSP must remain strict (`script-src 'self'`, no `unsafe-inline` for scripts).
> - Each story must include verification that the existing release-fetch / version-selection / changelog-aggregation flow remains intact.
>
> The epic should maintain system integrity while delivering a hosted BYOK multi-provider experience that users can trust with their own paid API keys.
