import { NextRequest, NextResponse } from 'next/server';
import { fetchAllReleases } from '@/lib/github';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const;

function extractBearer(header: string | null): string | undefined {
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : undefined;
}

/**
 * API route to fetch GitHub releases
 * GET /api/releases?owner=facebook&repo=react
 * Optionally accepts an Authorization: Bearer <github-pat> header to lift the rate limit.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Both owner and repo are required' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const token = extractBearer(request.headers.get('authorization'));
    const releases = await fetchAllReleases(owner, repo, token);

    return NextResponse.json(releases, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const errorClass = error instanceof Error ? error.constructor.name : 'Unknown';
    const message = error instanceof Error ? error.message : 'Error fetching releases';
    console.error(`[releases] ${errorClass}: ${message}`);

    let status = 500;
    if (message.includes('not found')) status = 404;
    else if (message.includes('rate limit')) status = 429;

    return NextResponse.json({ error: message }, { status, headers: NO_STORE_HEADERS });
  }
}
