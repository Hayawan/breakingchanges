import { NextRequest, NextResponse } from "next/server";
import { analyzeBreakingChanges, isLlmProvider, type LlmProvider } from "@/lib/llm";
import { AnalyzeBreakingChangesRequest } from "@/lib/types";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE_HEADERS });
}

function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_\-]+/g, "[REDACTED]")
    .replace(/sk-ant-[A-Za-z0-9_\-]+/g, "[REDACTED]")
    .replace(/AIza[A-Za-z0-9_\-]+/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]");
}

function resolveApiKey(provider: LlmProvider, headerKey: string | null): string | null {
  if (headerKey) return headerKey;
  const fallbackAllowed = process.env.ALLOW_SERVER_KEY_FALLBACK === "true";
  if (fallbackAllowed && provider === "openai" && process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeBreakingChangesRequest;
    const { changelogs, releaseContext, repoInfo, versionInfo, provider, model } = body;

    if (!repoInfo || !versionInfo) {
      return jsonError("Missing required fields: repoInfo and versionInfo are required", 400);
    }

    if (!changelogs && (!releaseContext || releaseContext.length === 0)) {
      return jsonError("Missing release data: either changelogs or releaseContext must be provided", 400);
    }

    if (!provider || !isLlmProvider(provider)) {
      return jsonError("Missing or unrecognized 'provider' (expected one of: openai, anthropic, google, mistral)", 400);
    }

    if (!model || typeof model !== "string") {
      return jsonError("Missing 'model' field", 400);
    }

    const headerKey = extractBearer(request.headers.get("authorization"));
    const apiKey = resolveApiKey(provider, headerKey);

    if (!apiKey) {
      return jsonError("Missing or malformed Authorization header (expected 'Bearer <api-key>')", 401);
    }

    const result = await analyzeBreakingChanges({
      provider,
      model,
      apiKey,
      releaseData: { changelogs, releaseContext },
      repoInfo,
      versionInfo,
    });

    return NextResponse.json({ result }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const errorClass = error instanceof Error ? error.constructor.name : "Unknown";
    const rawMessage = error instanceof Error ? error.message : "Error analyzing breaking changes";
    const safeMessage = sanitizeErrorMessage(rawMessage);
    console.error(`[analyze] ${errorClass}: ${safeMessage}`);

    let status = 500;
    if (error instanceof Error) {
      if (/api key|unauthor/i.test(rawMessage)) status = 401;
      else if (/rate limit|quota/i.test(rawMessage)) status = 429;
      else if (/no release data/i.test(rawMessage)) status = 400;
    }

    return jsonError(safeMessage, status);
  }
}
