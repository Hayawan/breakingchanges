# Story 3 — Terms, Privacy, and BYOK User Guide — Brownfield Addition

> **Status (2026-04-29): Superseded.** The user opted to absorb this story's content into the project README rather than ship dedicated `/terms`, `/privacy`, and `/byok-guide` pages. Reasoning: Breaking Changes is a free service that stores nothing; the user prefers not to publish hosting/infrastructure details, and a heavyweight legal surface is disproportionate to the actual data footprint. The README now carries: BYOK trust model, key-scoping tips per provider, self-host instructions, a CLI roadmap note, and a brief as-is disclaimer paragraph. If the service ever grows beyond hobby scope (paid tier, account system, persistent state), revisit this ticket.
>
> Part of [Epic: Hosted BYOK Multi-Provider Launch](../../product/epic-byok-launch.md). Created via BMAD `brownfield-create-story` task.
>
> **Sequencing:** Best landed after Stories 1 and 2 ship to staging — concrete deployed-state facts (Traefik access log status, exact CSP, exact provider list, backup cadence) inform the actual document text. Drafting earlier risks rewrites.

## User Story

As a **prospective user of the hosted Breaking Changes app**,
I want **clear, plain-English Terms of Service, a Privacy Policy that accurately describes the BYOK model, and a short guide on how to use it safely**,
So that **I can make an informed decision about pasting an API key into a third-party tool and have a self-host fallback if I prefer not to**.

## Story Context

### Existing System Integration

- **Integrates with:**
  - `src/app/(legal)/terms/page.tsx` (new)
  - `src/app/(legal)/privacy/page.tsx` (new)
  - `src/app/(legal)/byok-guide/page.tsx` (new)
  - `src/components/Footer.tsx` (gains links to the three pages)
  - `src/components/FirstRunModal.tsx` from Story 2 (links into BYOK Guide)
- **Technology:** Next.js 15 App Router route groups (`(legal)`), Mantine `Container` / `Title` / `Text` / `List` / `Anchor` for layout, optional `react-markdown` if we author the bodies as markdown for editability.
- **Follows pattern:**
  - App Router page components (existing `src/app/page.tsx` pattern).
  - Footer link pattern (existing `Footer.tsx`).
- **Touch points:**
  - 3 new page files.
  - 1 footer modification.
  - 1 first-run modal modification (Story 2's component).

## Acceptance Criteria

### Functional Requirements — Terms of Service

1. **`/terms` page** with the following sections:
   - **BYOK disclaimer.** "You are responsible for the custody of your API key and for any charges your provider bills you. Breaking Changes does not store, pay for, or audit usage of your key."
   - **Proxy-only role.** "Our server forwards your request to the provider you select using the key you supply. We do not log keys, prompts, or completions."
   - **AS-IS / no warranty.** Standard.
   - **Acceptable use.** No abuse of provider APIs, no scraping, no illegal content. The user's request to a third-party provider is also governed by that provider's terms.
   - **Indemnification.** User indemnifies Breaking Changes for misuse and for any provider charges.
   - **Governing law and venue.** Pick a jurisdiction and state it.
   - **Age requirement: 13+.** COPPA minimum. (Per epic discussion: paid-API context is the user's own arrangement with the provider, not ours.)
   - **Changelog of revisions** with effective date.
2. **Page renders within the existing Mantine layout** and Story 1's CSP without violations.

### Functional Requirements — Privacy Policy

3. **`/privacy` page** with the following sections:
   - **No application-level logging.** "We do not log API keys, prompts, completions, or request bodies."
   - **Reverse-proxy logs.** "Traefik (default Coolify configuration) is configured without access logs in our deployment. If this changes, this notice will be updated." — *Verify this matches the Story 2 deployed-state check before publication.*
   - **Infrastructure sub-processor.** Akamai Linode operates the underlying VPS. Link to Linode's privacy policy. Note hypervisor-level access to the machine.
   - **Backups.** State that infrequent VPS-level snapshots taken at the Linode layer may incidentally capture container/disk state. Specify cadence (decide before publication) and that they are encrypted at rest per Linode's policy.
   - **Third-party processors invoked at the user's direction.** OpenAI / Anthropic / Google / Mistral (whichever the user selects), GitHub for release fetches. The user's request to those providers is governed by the provider's own policies.
   - **GDPR.** Lawful basis: legitimate interest for service operation. EU users may exercise DSAR rights via a stated contact email.
   - **Cookies.** Ideally none — confirm during build. If any are introduced (analytics, etc.), enumerate.
   - **Contact** for privacy inquiries.
   - **Changelog of revisions** with effective date.

### Functional Requirements — BYOK Guide

4. **`/byok-guide` page** in plain English, with the following sections:
   - **Scope your key.** Per-provider instructions for creating a project- or workspace-scoped key with a low spend cap:
     - **OpenAI:** create a *Project* and a project-scoped key, set a project usage limit. Link to OpenAI's project keys docs.
     - **Anthropic:** create a *Workspace* and a workspace-scoped key. Link to Anthropic Console workspace docs.
     - **Google AI Studio:** create an API key with restrictions (HTTP referrer or IP — note that referrer-based restrictions don't apply through our proxy).
     - **Mistral:** workspace key with budget limits.
   - **Use a password manager.** 1Password / Bitwarden / Apple Passwords / KeePassXC. Mention that the sessionStorage default pairs naturally with manager autofill — paste at session start, key is cleared on tab close.
   - **Run it locally instead.** Most privacy-preserving option. Steps:
     1. `git clone https://github.com/Hayawan/breakingchanges.git`
     2. `pnpm install`
     3. Create `.env.local` with `OPENAI_API_KEY=...` (and `ALLOW_SERVER_KEY_FALLBACK=true` for the env-var path) — *or* skip env vars entirely and use the BYOK UI locally.
     4. `pnpm dev` and open `http://localhost:3000`.
   - **Revoke fast if you suspect compromise.** Per-provider revoke links.
5. **First-run modal (from Story 2) links into this page** before the user is ever prompted for a key.

### Integration Requirements

6. **Footer links** to Terms, Privacy, and BYOK Guide on every page.
7. **Story 1's CSP holds** — no inline scripts introduced by these pages, no external resources beyond what CSP already allows.
8. **Existing app pages and routing unchanged.**

### Quality Requirements

9. **Self-review against a documented checklist** before merge: (a) all sections present, (b) all links resolve, (c) effective date set, (d) Story 2 deployed-state facts cross-checked, (e) no claims contradict actual code behavior.
10. **Optional but recommended:** legal review by a qualified attorney or a reputable template service. If skipped, document the decision in the PR.
11. **`pnpm build` passes.**
12. **All three pages mobile-responsive** (consistent with the existing `Polish UI's mobile responsiveness` work in commit `f1af9ba`).

## Technical Notes

- **Integration Approach:**
  - Use Next.js App Router route groups: `src/app/(legal)/terms/page.tsx` etc. Route group keeps URLs flat (`/terms`, not `/legal/terms`) while letting us share a `(legal)/layout.tsx` with consistent typography.
  - Author the bodies as TSX with Mantine components for typography (rather than markdown) for tighter control and zero extra rendering pipeline. If the team prefers markdown for editability later, that's a deferrable refactor.
  - Cross-link the three pages from each other and from the footer.
- **Existing Pattern Reference:**
  - `src/app/page.tsx` for App Router page shape.
  - `src/components/Footer.tsx` for link styling.
  - Mantine `Container size="md"` + `Stack` + `Title` + `Text` is the existing typography pattern.
- **Key Constraints:**
  - Document text must match deployed-state facts. Anything the policy claims must be verifiable by code review or staging inspection.
  - Effective date is the day of merge, not the day of drafting.

## Definition of Done

- [ ] `/terms`, `/privacy`, `/byok-guide` pages live, linked from footer.
- [ ] First-run modal (Story 2) links into BYOK Guide.
- [ ] All claimed facts cross-checked against actual deployed state.
- [ ] Per-provider key-scoping instructions verified (links resolve, screenshots current as of publication).
- [ ] Local-install instructions verified by following them on a clean machine or a clean clone.
- [ ] Mobile-responsive.
- [ ] `pnpm build` clean.
- [ ] PR description documents whether legal review was performed.
- [ ] Epic doc Story 3 acceptance items checked off.

## Risk and Compatibility

- **Primary Risk:** The privacy policy claims something (e.g., "no proxy access logs") that isn't actually true on the deployed stack — exposing us to a misrepresentation claim.
- **Mitigation:**
  - Defer drafting until Stories 1 and 2 ship to staging. Use the Story 2 log audit and the deployed CSP as source-of-truth for the privacy text.
  - Self-review checklist explicitly cross-checks each claim against deployed state.
  - Recommend (but do not require) a real legal review.
- **Rollback:** Trivial — these are static pages. Single revert; the pages disappear, footer links break (fix or revert footer too).

### Compatibility Verification

- [ ] No changes to existing API routes.
- [ ] No DB changes.
- [ ] UI changes follow existing Mantine typography patterns.
- [ ] Performance impact: three static-render pages, negligible.

## Validation Checklist

### Scope Validation

- [x] Story can be completed in one focused development session (~3 hours, plus optional legal review wait).
- [x] Integration approach is straightforward (3 new pages + 1 footer edit + 1 modal edit).
- [x] Follows existing App Router and Mantine patterns.
- [x] No design or architecture work required.

### Clarity Check

- [x] Story requirements are unambiguous (specific sections enumerated for each page).
- [x] Integration points are listed with file paths.
- [x] Success criteria are testable (build clean, links resolve, claims match deployed state).
- [x] Rollback is a single revert.
