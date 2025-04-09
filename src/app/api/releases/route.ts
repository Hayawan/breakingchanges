import { NextRequest, NextResponse } from 'next/server';
import { fetchAllReleases } from '@/lib/github';

/**
 * API route to fetch GitHub releases
 * GET /api/releases?owner=facebook&repo=react
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Both owner and repo are required' },
        { status: 400 }
      );
    }
    
    const releases = await fetchAllReleases(owner, repo);
    
    return NextResponse.json(releases);
  } catch (error) {
    console.error('Error fetching releases:', error);
    
    // Determine error status and message
    let status = 500;
    let message = 'Error fetching releases';
    
    if (error instanceof Error) {
      message = error.message;
      
      if (message.includes('not found')) {
        status = 404;
      } else if (message.includes('rate limit')) {
        status = 429;
      }
    }
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 