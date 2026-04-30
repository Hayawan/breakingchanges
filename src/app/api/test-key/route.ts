import { NextRequest, NextResponse } from "next/server";
import { isLlmProvider, type LlmProvider } from "@/lib/llm";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: NO_STORE_HEADERS });
}

function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

async function pingProvider(provider: LlmProvider, apiKey: string): Promise<{ ok: boolean; status: number; detail?: string }> {
  switch (provider) {
    case "openai": {
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });
      return { ok: r.ok, status: r.status };
    }
    case "anthropic": {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        cache: "no-store",
      });
      return { ok: r.ok, status: r.status };
    }
    case "google": {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
        cache: "no-store",
      });
      return { ok: r.ok, status: r.status };
    }
    case "mistral": {
      const r = await fetch("https://api.mistral.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });
      return { ok: r.ok, status: r.status };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { provider?: unknown };
    const { provider } = body;

    if (!provider || !isLlmProvider(provider)) {
      return jsonError("Missing or unrecognized 'provider'", 400);
    }

    const apiKey = extractBearer(request.headers.get("authorization"));
    if (!apiKey) {
      return jsonError("Missing or malformed Authorization header", 401);
    }

    const result = await pingProvider(provider, apiKey);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, status: result.status, error: `Provider returned ${result.status}` },
        { status: result.status === 401 ? 401 : 502, headers: NO_STORE_HEADERS },
      );
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch {
    return jsonError("Connection test failed", 502);
  }
}
