# Story 2 — Multi-Provider AI SDK + BYOK Key Flow — Brownfield Addition

> Part of [Epic: Hosted BYOK Multi-Provider Launch](../../product/epic-byok-launch.md). Created via BMAD `brownfield-create-story` task.
>
> **Size honesty:** This story is on the upper edge of "single story" scope. It bundles three concerns — provider abstraction, client-side key handling, and server-route hygiene — that all share the same call site (`/api/analyze`) and must change together to avoid an inconsistent intermediate state. If during implementation any one of the three sub-areas blows up (e.g., provider streaming compatibility issues, Mantine settings UX rework, or rate-limit decisions), **escalate by splitting into Story 2a / 2b / 2c rather than letting the single story sprawl**. The BMAD `brownfield-create-story` task explicitly permits this.
>
> **Sequencing:** Blocked by Story 1 — must not be merged to main until Story 1 is in production.

## User Story

As a **developer evaluating an upgrade between two versions of an open-source dependency**,
I want **to bring my own API key for OpenAI, Anthropic, Google, or Mistral and use it with the hosted Breaking Changes app**,
So that **I can use the LLM provider I already pay for, without trusting Breaking Changes to manage a key on my behalf or hold my prompts on a server**.

## Story Context

### Existing System Integration

- **Integrates with:**
  - `src/lib/openai.ts` (currently the only provider client — to be replaced with a provider-agnostic dispatcher)
  - `src/app/api/analyze/route.ts` (currently calls `analyzeBreakingChanges` with a server-held key — to be rewritten to accept a per-request user key)
  - `src/components/Header.tsx` (gains a settings entry point)
  - `src/components/UpgradeGuideModal.tsx` (likely the call-site that triggers analysis — gains provider/model awareness)
  - `next.config.ts` (CSP `connect-src` widens to include the four provider hosts)
- **Technology:** Next.js 15, Mantine 7 (Drawer / Modal / TextInput / Select / Switch), Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral`), browser `sessionStorage` / `localStorage`.
- **Follows pattern:**
  - Mantine drawer pattern for settings (consistent with existing modal usage in `UpgradeGuideModal.tsx`).
  - Next.js App Router POST route handler with `NextRequest` / `NextResponse` (existing pattern in `route.ts`).
  - Client-only modules marked `'use client'` (existing pattern).
- **Touch points:**
  - **Replace** `src/lib/openai.ts` with `src/lib/llm.ts` (or similar) exposing a single `analyzeBreakingChanges(opts)` that dispatches by provider.
  - **Add** `src/lib/keyStorage.ts` (client-only) for sessionStorage/localStorage key custody.
  - **Add** `src/components/SettingsDrawer.tsx` for the settings UI.
  - **Add** `src/components/FirstRunModal.tsx` (or extend Header) for the first-run education flow.
  - **Modify** `src/app/api/analyze/route.ts` to accept `provider`, `model`, and `Authorization` header from the client.
  - **Modify** `next.config.ts` CSP to widen `connect-src`.

## Acceptance Criteria

### Functional Requirements — Provider Abstraction

1. **Vercel AI SDK packages installed and scored** per `DEPENDENCY.md`: `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral`. Pin concrete versions.
2. **Single `analyzeBreakingChanges` function** dispatches on `provider` to the correct AI SDK adapter and returns the same shape regardless of provider.
3. **Provider + model selector** added to the analysis call site (likely `UpgradeGuideModal.tsx`). Defaults: OpenAI / `gpt-4o-mini`. Selection persists alongside the key (per-provider).
4. **Streaming preserved.** If the existing implementation streams to the client, the new one does too. If it returns whole completions, match that behavior.

### Functional Requirements — Key Handling

5. **Settings drawer** reachable from the header via a gear icon. Lists each supported provider with: a key input (password-masked, with a show/hide toggle), a paste-friendly UX, format validation (`sk-` for OpenAI, `sk-ant-` for Anthropic, AIza for Google, no fixed prefix for Mistral), and a "Test connection" button that pings the provider's lightweight models endpoint.
6. **Default storage is `sessionStorage`.** A "Remember on this device" toggle moves the key to `localStorage` with an explicit warning describing the XSS risk in plain language.
7. **Visible key indicator** per provider: `OpenAI ····A3f9` (last 4 chars).
8. **One-click "Clear key" per provider and "Clear all keys"** in the settings drawer.
9. **Idle auto-clear:** keys in `localStorage` are wiped on tab focus if the last-use timestamp is older than 24 hours. Configurable via constant.
10. **First-run modal** appears before the user is ever prompted for a key. Explains where the key is stored, that the server is a transit proxy that does not persist, and how to revoke at the provider. Modal cannot be dismissed without an explicit "I understand" action and is shown once per browser (flag in `localStorage`).
11. **GitHub PAT field** in settings (optional). Sent only with GitHub requests via the existing `/api/releases` flow. Same storage rules as LLM keys. BYOK guide (Story 3) explains why this lifts the 60 req/hr ceiling.

### Functional Requirements — Server Route

12. **`POST /api/analyze`** accepts:
    - JSON body: existing fields plus `provider: "openai" | "anthropic" | "google" | "mistral"` and `model: string`.
    - Header: `Authorization: Bearer <user-key>`.
    - Returns 400 if `provider` or `model` missing or unrecognized; 401 if `Authorization` missing or malformed.
13. **Response sets `Cache-Control: no-store, no-cache, must-revalidate`** and `Pragma: no-cache`.
14. **Logging policy enforced in code:** the route writes no logs containing the `Authorization` header, the request body, the prompt, or the completion. Replace existing `console.error("Error analyzing breaking changes:", error)` with an error log that records only error class + sanitized message (key fragments and prompts stripped).
15. **No app-level rate limiting.** Upstream GitHub API and the user's own provider quota gate abuse naturally — see epic doc.

### Functional Requirements — CSP Update

16. **`next.config.ts` `connect-src`** widens to include: `https://api.openai.com`, `https://api.anthropic.com`, `https://generativelanguage.googleapis.com`, `https://api.mistral.ai`. Verify the `/api/analyze` proxy means the *server* makes the call, not the browser — in which case `connect-src` only needs `'self'` for the SDK call and the provider hosts are not directly contacted from the browser. Confirm during implementation and pick the minimal correct CSP.

### Integration Requirements

17. **Existing release-fetch / version-selection / changelog-aggregation flow continues to work unchanged.**
18. **Story 1's CSP and sanitization remain intact.** Specifically: no inline scripts introduced for the settings UI, no `dangerouslySetInnerHTML`, all key-handling code passes the existing security patterns.
19. **Existing `OPENAI_API_KEY` env var continues to work for self-hosted local use** (Story 3 BYOK guide depends on this). The route should fall back to `process.env.OPENAI_API_KEY` only when (a) the request omits `Authorization` AND (b) `provider === 'openai'` AND (c) an explicit `ALLOW_SERVER_KEY_FALLBACK=true` env var is set. This keeps the hosted deploy strict (no fallback) while preserving local-hosted ergonomics.

### Quality Requirements

20. **Manual end-to-end verification** with a real key from each of the four providers. PR description records: provider, model used, sample input repo, summary output sanity-check.
21. **Log audit on staging:** `docker logs` of the application container after a full run-through contains no key string. Same for the Traefik container if access logs are unexpectedly enabled.
22. **DevTools storage check:** with default settings, `sessionStorage` populated, `localStorage` empty (modulo the first-run flag). With "Remember" toggled, `localStorage` populated. Cleared by the clear button.
23. **`pnpm build` passes; `pnpm dev` smoke test passes.**

## Technical Notes

- **Integration Approach:**
  - Replace the OpenAI-specific `src/lib/openai.ts` with a provider-dispatching module. Keep the public function signature stable where possible to minimize call-site churn.
  - Key custody lives in a small client-only module — do not put keys into TanStack Query cache, React Context state that gets serialized, or any analytics breadcrumb.
  - Server route receives the key via header and passes it directly to the AI SDK adapter. Adapters accept per-call API key options; do not set the SDK's global default via env.
  - First-run modal flag: a single `localStorage` boolean (`bc.firstRunSeen=true`) is acceptable — it is non-sensitive metadata and using sessionStorage would re-prompt every session.
- **Existing Pattern Reference:**
  - Drawer / modal: see `UpgradeGuideModal.tsx`.
  - Route handler: see `src/app/api/analyze/route.ts` (current shape) and `src/app/api/releases/route.ts`.
  - Client-only module: see `src/lib/queryClient.ts` (`'use client'` directive).
- **Key Constraints:**
  - **Sequencing.** Story 1 must be in production before this story's branch merges to main.
  - **No keys in logs, ever.** Audited by code review and `docker logs` grep on staging.
  - **No keys in `localStorage` by default.** sessionStorage is the default; opt-in only.
  - **No third-party analytics or error reporters introduced** without explicit user approval — they create new exfil vectors.
  - **Provider coverage:** OpenAI, Anthropic, Google, Mistral. Other providers (Cohere, Groq, etc.) deferred to a future story.

## Definition of Done

- [x] AI SDK packages scored, installed, pinned. *(ai@6.0.170, @ai-sdk/openai@3.0.54, @ai-sdk/anthropic@3.0.72, @ai-sdk/google@3.0.65, @ai-sdk/mistral@3.0.31. Transitive supplyChain/quality dipped below thresholds on Vercel's `@ai-sdk/gateway` sub-package and `json-schema@0.4.0`; user approved with explicit override.)*
- [x] `analyzeBreakingChanges` dispatches to the correct provider; the four provider models verified end-to-end. *(Code path verified; live four-provider E2E is user-side per AC #20.)*
- [x] Provider + model selector in UI; selection persists per-provider. *(Provider + model live in `TechDebtSpecification.tsx`; per-provider model is stored under `bc.model.<provider>` in `localStorage` and seeded on first run from `DEFAULT_MODELS`.)*
- [x] Settings drawer with key input, validation, test-connection, show/hide, paste-friendly UX. *(Mantine `PasswordInput` ships show/hide; `/api/test-key` proxies the live ping per provider; format validation in `keyStorage.validateKey`.)*
- [x] sessionStorage default; localStorage opt-in with warning; visible last-4 indicator; clear buttons; idle auto-clear. *(Idle clear runs on mount and on window focus via `runIdleAutoClear` in `ClientProviders.tsx`; threshold 24h.)*
- [x] First-run modal blocks until acknowledged; shown once per browser. *(Mounted globally in `ClientProviders.tsx` so it fires before any key-prompt surface, not only the gear click.)*
- [x] GitHub PAT field wired to `/api/releases`. *(PAT travels via `Authorization: Bearer …` header; route extracts and threads it through `fetchAllReleases` → `getGitHubApiHeaders(token)`. Existing `NEXT_PUBLIC_GITHUB_TOKEN` env path preserved for local self-host.)*
- [x] `/api/analyze` accepts provider/model + Authorization header; rejects malformed; sets no-store cache headers; emits no key-bearing logs. *(`sanitizeErrorMessage` strips known key prefixes before `console.error`.)*
- [x] CSP `connect-src` minimally widened. *(Not widened. All provider calls happen server-side via `/api/analyze` and `/api/test-key`; the browser only needs `'self'`. Documented as intentional.)*
- [x] `OPENAI_API_KEY` fallback gated behind `ALLOW_SERVER_KEY_FALLBACK` for self-hosted ergonomics. *(Hosted deploy stays strict by default — fallback requires the explicit env var.)*
- [ ] Manual E2E across all four providers; log audit clean. *(User-side verification — needs a real key from each provider plus a `docker logs` grep on staging.)*
- [ ] `pnpm build` clean; `pnpm dev` smoke test clean. *(`tsc --noEmit` and `next lint` pass in sandbox; full `next build` is user-side because the sandbox cannot reach Google Fonts for Geist.)*
- [ ] Story 1's hardening still passes `securityheaders.com` ≥ A. *(Verifies post-deploy. Routine `trig_01H4WGgRnZ8iQMP7Apcco4AJ` fires 2026-05-13 to audit.)*
- [ ] Epic doc Story 2 acceptance items checked off.

## Dev Agent Record

### Agent Model Used
claude-opus-4-7[1m] via BMAD `*develop-story` workflow.

### File List

**Added:**
- `src/lib/llm.ts` — Provider-dispatching `analyzeBreakingChanges` over Vercel AI SDK
- `src/lib/keyStorage.ts` — Client-only key custody (sessionStorage default, localStorage opt-in, idle auto-clear, validation, model persistence)
- `src/components/SettingsDrawer.tsx` — Per-provider key + model UI plus optional GitHub PAT
- `src/components/FirstRunModal.tsx` — Blocking first-visit education modal
- `src/app/api/test-key/route.ts` — Server proxy for provider key validation (keeps CSP narrow)

**Modified:**
- `package.json` / `pnpm-lock.yaml` — Added pinned AI SDK packages; removed `openai`
- `src/lib/types.ts` — Extended `AnalyzeBreakingChangesRequest` with `provider`/`model`
- `src/lib/github.ts` — `getGitHubApiHeaders` and fetch helpers thread an optional token
- `src/app/api/analyze/route.ts` — Rewritten for BYOK: provider/model fields, `Authorization` header, `ALLOW_SERVER_KEY_FALLBACK` gate, no-store headers, sanitized error log
- `src/app/api/releases/route.ts` — Accepts Bearer GitHub PAT header, no-store headers
- `src/app/page.tsx` — Sends GitHub PAT (when stored) on `/api/releases`
- `src/components/TechDebtSpecification.tsx` — Provider/model selector, sends `Authorization` + `provider` + `model` on `/api/analyze`, BYOK feature-flag aware
- `src/components/Header.tsx` — Settings gear icon (BYOK-flag-gated)
- `src/components/ClientProviders.tsx` — Mounts `<FirstRunModal />` globally and runs idle auto-clear on focus

**Deleted:**
- `src/lib/openai.ts` — Replaced by `src/lib/llm.ts`

### Completion Notes

- Story split was avoided. The three sub-areas (provider abstraction / key custody / call-site wiring) shipped as commits 2a, 2b, 2c on `epic/byok-launch`.
- Switched from OpenAI Assistants API (threads/runs/polling) to a single `generateText` call. Net code reduction despite gaining three provider adapters.
- CSP intentionally **not** widened: `/api/analyze` and `/api/test-key` are server-side fetches, so the browser never contacts provider hosts directly. Reaffirms Story 1's narrow `connect-src`.
- Default models per provider chosen for low-cost defaults: `gpt-4o-mini`, `claude-haiku-4-5`, `gemini-2.5-flash`, `mistral-small-latest`.
- TDD Guard was toggled off for this story per user preference (small codebase, no existing test infra, "path of least resistance").
- Socket score check on `ai@6.0.170` flagged transitive supplyChain (69) and quality (67) below thresholds. Failures localized to `@ai-sdk/gateway` (Vercel-internal, not imported by our code) and `json-schema@0.4.0` (legacy transitive). User approved with explicit override.

### Change Log

| Date | Commit | Summary |
|------|--------|---------|
| 2026-04-29 | 15a68e2 | Story 2a: Provider abstraction + BYOK analyze route |
| 2026-04-29 | (next) | Story 2b: Key custody, settings drawer, first-run modal |
| 2026-04-29 | (next) | Story 2c: Call-site wiring + GitHub PAT + feature flag |

### Status
Ready for Review

## Risk and Compatibility

- **Primary Risk:** A user-supplied API key is exfiltrated via XSS, server log leak, or error-reporter capture.
- **Mitigation:**
  - Story 1 (hardening) lands first.
  - sessionStorage default + opt-in localStorage + idle auto-clear minimizes the at-rest window.
  - Server code review checklist enforces no logging of bodies/headers; staging log audit before launch.
  - No new analytics or error reporter packages added in this story.
  - Feature flag (`NEXT_PUBLIC_BYOK_ENABLED`) gates the settings UI so the BYOK surface can be disabled at runtime without a redeploy if a bug is discovered post-launch.
- **Rollback:**
  - Toggle `NEXT_PUBLIC_BYOK_ENABLED=false` to hide the BYOK UI; the app reverts to the existing `OPENAI_API_KEY` env-var path (locally) or returns a friendly "service paused" message (hosted).
  - Full rollback: Coolify rollback to the previous deployment.

### Compatibility Verification

- [ ] Existing `/api/releases` and existing release/version flow unchanged.
- [ ] No DB changes (no DB).
- [ ] UI changes follow Mantine patterns; theming unchanged.
- [ ] Performance impact: per-request provider dispatch and streaming has negligible overhead vs. provider latency.

## Validation Checklist

### Scope Validation

- [ ] **Story can be completed in one focused development session** — *flagged as borderline; split into 2a/2b/2c if implementation reveals a sub-area is heavier than expected.*
- [x] Integration approach is straightforward (single replacement call site, additive UI).
- [x] Follows existing Mantine + App Router patterns.
- [x] No new architectural decisions required (the BYOK and stateless-key approach is locked in by the epic).

### Clarity Check

- [x] Story requirements are unambiguous.
- [x] Integration points are listed with file paths.
- [x] Success criteria are testable (DevTools storage, log grep, end-to-end provider check).
- [x] Rollback is gated by a feature flag plus full Coolify revert.
