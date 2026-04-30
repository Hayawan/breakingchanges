import { generateText, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { ReleaseContext } from "./types";

export type LlmProvider = "openai" | "anthropic" | "google" | "mistral";

export const SUPPORTED_PROVIDERS: readonly LlmProvider[] = [
  "openai",
  "anthropic",
  "google",
  "mistral",
] as const;

export function isLlmProvider(value: unknown): value is LlmProvider {
  return typeof value === "string" && (SUPPORTED_PROVIDERS as readonly string[]).includes(value);
}

const SYSTEM_PROMPT = `You are a specialized assistant that analyzes software release changelogs to identify breaking changes and generate tech-debt specifications.

Your role is to help engineering teams upgrade dependencies confidently and safely, especially when dealing with major version bumps, complex migrations, or large codebases.

When given a set of changelogs between two versions:

1. Identify all **breaking changes** that require code modifications.
   - Pay attention to removed functions, changed APIs, behavioral shifts, deprecated features, or dropped platform support.
   - Classify each breaking change by category: \`API\`, \`Behavior\`, \`Dependencies\`, \`Security\`, or \`Tooling\`.

2. Create a **comprehensive tech-debt specification markdown document** that includes:
   - An overview of the upgrade scope and risks
   - Clear action items for developers
   - Code examples showing "before" vs "after" usage where applicable
   - A **complexity rating** (Low, Medium, High) for the upgrade based on:
     - Number/severity of breaking changes
     - Size of project (see below)
     - Integration surface area

3. Make **context-aware recommendations**, especially:
   - If the changelog shows security fixes in earlier versions (e.g. v2), but v3 introduces more breaking changes or refactors, suggest upgrading to v2 first.
   - If the upgrade is **too large to complete in a single sprint**, recommend an **iterative upgrade path** (e.g. v1 → v2 → v3), broken into manageable phases.
   - Highlight when **dependency updates can be decoupled or done in parallel** across modules to reduce overall time-to-upgrade.

4. Tailor advice based on **project size and complexity**:
   - For **small projects**, favor direct upgrades if feasible, especially for security or stability.
   - For **large or monolithic codebases**, emphasize:
     - Phased upgrades (e.g., per module or service)
     - Use of feature flags or migration toggles
     - Documentation and communication plans for the team

5. When applicable, include notes on:
   - Common pitfalls teams may face during this upgrade
   - Opportunities to remove deprecated code or simplify architecture during the update

6. Use clear, concise, and actionable markdown formatting suitable for team handoff.

Always focus on clarity, technical accuracy, and pragmatic decision-making.`;

function resolveModel(provider: LlmProvider, modelId: string, apiKey: string): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case "mistral":
      return createMistral({ apiKey })(modelId);
  }
}

export interface AnalyzeOptions {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  releaseData: {
    changelogs?: string;
    releaseContext?: ReleaseContext[];
  };
  repoInfo: { owner: string; repo: string };
  versionInfo: { currentVersion: string; targetVersion: string };
}

function buildPrompt(opts: Pick<AnalyzeOptions, "releaseData" | "repoInfo" | "versionInfo">): string {
  const { releaseData, repoInfo, versionInfo } = opts;

  if (releaseData.releaseContext && releaseData.releaseContext.length > 0) {
    return `I need to analyze breaking changes between versions ${versionInfo.currentVersion} and ${versionInfo.targetVersion} of the GitHub repository ${repoInfo.owner}/${repoInfo.repo}.

Here are the releases between these versions, with their metadata and content:

${JSON.stringify(releaseData.releaseContext, null, 2)}

Please analyze this structured data and provide a comprehensive tech-debt specification document. Focus on identifying breaking changes and what actions developers need to take to upgrade successfully.`;
  }

  if (releaseData.changelogs) {
    return `I need to analyze breaking changes between versions ${versionInfo.currentVersion} and ${versionInfo.targetVersion} of the GitHub repository ${repoInfo.owner}/${repoInfo.repo}.

Here are the changelogs for the versions between (and including) these releases:

${releaseData.changelogs}

Please identify breaking changes and provide a tech-debt specification document.`;
  }

  throw new Error("No release data provided for analysis");
}

export async function analyzeBreakingChanges(opts: AnalyzeOptions): Promise<string> {
  const model = resolveModel(opts.provider, opts.model, opts.apiKey);
  const prompt = buildPrompt(opts);

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt,
  });

  return text;
}
