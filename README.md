# Breaking Changes

Identify breaking changes between two versions of a public GitHub repository — fetch the releases, scan the bodies, and generate a tech-debt specification with the LLM provider of your choice.

🌐 **Live:** [breakingchanges.ai](https://breakingchanges.ai) &nbsp;·&nbsp; ⌨️ **In your terminal:** [CLI & Claude Code skill](#cli--claude-code-skill) — no API key required

## What it does

1. Paste a GitHub repo URL.
2. Pick a current version and a target version.
3. Review the aggregated changelog between them.
4. Optionally run an AI analysis that produces a markdown tech-debt spec — categorizing breaking changes (API / Behavior / Dependencies / Security / Tooling), proposing an upgrade path, and rating complexity.

## Bring your own key

Breaking Changes is a **bring-your-own-key** (BYOK) service. We do not host an LLM key on your behalf, and we do not charge you. You supply a key from one of the supported providers and pay them directly for whatever the analysis costs.

Supported providers:

| Provider  | Key prefix     | Get a key |
|-----------|----------------|-----------|
| OpenAI    | `sk-…`         | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic | `sk-ant-…`     | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| Google    | `AIza…`        | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| Mistral   | (no prefix)    | [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys/) |

A GitHub fine-grained PAT is also optional — paste one in to lift the 60 req/hr unauthenticated rate limit on `api.github.com`.

### How keys are handled

- **Default storage is `sessionStorage`** — keys live in your browser tab and are wiped when you close it.
- **`localStorage` is opt-in** per provider with a "Remember on this device" toggle. Persisted keys are auto-cleared after **24 hours of inactivity** on tab focus.
- **The server is a transit proxy.** When you run an analysis, your key is sent in an `Authorization` header, immediately forwarded to the provider you chose, and discarded. Nothing is persisted server-side. Error logs strip known key prefixes before writing.
- **Clear any key (or all keys) at any time** from the in-app settings drawer.

### Scoping your key

Use the most narrowly scoped key your provider supports — set a low spend cap, restrict it to one project / workspace, and revoke it if anything looks off.

- **OpenAI** — create a *Project*, scope the key to it, and set a project usage limit.
- **Anthropic** — create a *Workspace* and a workspace-scoped key.
- **Google AI Studio** — create an API key; note that referrer-based restrictions don't apply through this app's proxy.
- **Mistral** — workspace key with a budget limit.

If you suspect compromise: revoke immediately at the provider console linked above.

## Run it locally

Most privacy-preserving option. Self-host gets you the same UI without any third party in the loop.

```bash
git clone https://github.com/Hayawan/breakingchanges.git
cd breakingchanges
pnpm install
pnpm dev
# open http://localhost:3000
```

You can either paste keys into the in-app settings drawer (same UX as the hosted version), or set them in `.env.local` for headless operation:

```bash
OPENAI_API_KEY=sk-…              # used as a fallback for the OpenAI provider
ALLOW_SERVER_KEY_FALLBACK=true   # required for the env-var path to take effect
NEXT_PUBLIC_BYOK_ENABLED=false   # optional: hide the BYOK UI entirely (env-only mode)
```

## Tech stack

Next.js 15 (App Router), React 19, Mantine 7, TanStack Query, Vercel AI SDK with adapters for OpenAI, Anthropic, Google, and Mistral. TypeScript throughout.

## CLI & Claude Code skill

The hosted web app is the easy on-ramp, but if you live in a terminal the fastest path is the **Claude Code skill** — the same workflow, run where you already work. Your coding agent reads the current version from your `package.json`, fetches the changelogs, and writes the tech-debt spec grounded in your real call sites.

**No API key.** When you run it through an agent, the agent *is* the LLM — there's no BYOK key to paste and nothing is proxied through a server.

### Install as a Claude Code skill

```bash
git clone https://github.com/Hayawan/breakingchanges.git
mkdir -p ~/.claude/skills
cp -r breakingchanges/skill/breaking-changes ~/.claude/skills/
```

Then, in a new Claude Code session, just ask in plain language:

> what breaks if I upgrade react from 18 to 19?

or invoke it explicitly with `/breaking-changes`. The skill infers the repo and current version from your project, runs the fetch, and produces the upgrade plan. (Project-scoped install also works: copy into `<your-repo>/.claude/skills/` instead.)

### Use the CLI directly (no agent required)

The skill is backed by a **zero-dependency** Node script (Node 18+, uses the built-in `fetch`). Run it standalone to get the aggregated changelog or structured JSON, then pipe it into any tool you like:

```bash
# explicit version range, human-readable markdown
node breakingchanges/skill/breaking-changes/bin/fetch-changelogs.mjs \
  facebook/react --from v18.0.0 --to v19.0.0

# infer --from from the installed version in ./package.json, emit JSON
node breakingchanges/skill/breaking-changes/bin/fetch-changelogs.mjs \
  facebook/react --pkg react --json
```

| Flag | Purpose |
|------|---------|
| `--from <tag>` | Current version (required unless `--pkg` resolves it). |
| `--to <tag>` | Target version. Defaults to the latest release/tag. |
| `--pkg <name>` | Infer `--from` from `<name>` in the local `package.json`. |
| `--token <pat>` | GitHub token (or set `GITHUB_TOKEN`) to lift the 60 req/hr anonymous limit. |
| `--json` | Emit structured JSON instead of aggregated markdown. |

Run with `--help` for the full list. Tags with or without a leading `v` both match. See the [skill source and full docs](https://github.com/Hayawan/breakingchanges/tree/main/skill/breaking-changes) for the analysis framing and known limitations.

## Issues, ideas, or feedback

Open an [issue on GitHub](https://github.com/Hayawan/breakingchanges/issues), or reach out via [@Hayawan](https://github.com/Hayawan).

## A short note on terms

Breaking Changes is a free service offered as-is. You bring your own key, you're responsible for the charges your provider bills you, and you assume the usual risks of pasting a credential into a third-party browser app — minimized but not eliminated by the BYOK design above. We don't store your keys, prompts, or completions, and we don't run analytics on your usage. If anything below the surface ever changes, this README will say so. For anything else, [open an issue](https://github.com/Hayawan/breakingchanges/issues).

## License

MIT.
