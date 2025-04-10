import { NextRequest, NextResponse } from "next/server";
import { analyzeBreakingChanges } from "@/lib/openai";
import { AnalyzeBreakingChangesRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AnalyzeBreakingChangesRequest;
    const { changelogs, releaseContext, repoInfo, versionInfo } = body;
    
    // Validate required fields
    if (!repoInfo || !versionInfo) {
      return NextResponse.json(
        { error: "Missing required fields: repoInfo and versionInfo are required" },
        { status: 400 }
      );
    }
    
    // Validate that at least one data source is provided
    if (!changelogs && (!releaseContext || releaseContext.length === 0)) {
      return NextResponse.json(
        { error: "Missing release data: either changelogs or releaseContext must be provided" },
        { status: 400 }
      );
    }
    
    // Call OpenAI with the provided data
    const result = await analyzeBreakingChanges(
      { changelogs, releaseContext },
      repoInfo,
      versionInfo
    );
    
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error analyzing breaking changes:", error);
    
    let status = 500;
    let message = "Error analyzing breaking changes";
    
    if (error instanceof Error) {
      message = error.message;
      
      if (message.includes("API key")) {
        status = 401;
      } else if (message.includes("rate limit") || message.includes("quota")) {
        status = 429;
      } else if (message.includes("No release data provided")) {
        status = 400;
      }
    }
    
    return NextResponse.json({ error: message }, { status });
  }
} 