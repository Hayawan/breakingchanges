import OpenAI from "openai";
import { ReleaseContext } from "./types";

// Initialize the OpenAI client
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured");
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
}

// Create or reuse an Assistant
export async function getOrCreateAssistant() {
  const client = getOpenAIClient();
  
  // If assistant ID is provided, use it
  if (process.env.OPENAI_ASSISTANT_ID) {
    try {
      return await client.beta.assistants.retrieve(
        process.env.OPENAI_ASSISTANT_ID
      );
    } catch (error) {
      console.error("Error retrieving assistant:", error);
      // Fall through to create a new assistant
    }
  }
  
  // Create new assistant with specified instructions
  return await client.beta.assistants.create({
    name: "Breaking Changes Analyzer",
    instructions: `
      You are a specialized assistant that analyzes software release changelogs 
      to identify breaking changes and generate tech-debt specifications.

      Your role is to help engineering teams upgrade dependencies confidently and safely,
      especially when dealing with major version bumps, complex migrations, or large codebases.

      When given a set of changelogs between two versions:

      1. Identify all **breaking changes** that require code modifications.
        - Pay attention to removed functions, changed APIs, behavioral shifts, deprecated features, or dropped platform support.
        - Classify each breaking change by category: \`API\`, \`Behavior\`, \`Dependencies\`, \`Security\`, or \`Tooling\`.

      2. Create a **comprehensive tech-debt specification markdown document** that includes:
        - An overview of the upgrade scope and risks
        - Clear action items for developers
        - Code examples showing “before” vs “after” usage where applicable
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

      Always focus on clarity, technical accuracy, and pragmatic decision-making. 
    `,
    model: "gpt-4o",
    tools: [{ type: "code_interpreter" }]
  });
}

// Process release data with OpenAI
export async function analyzeBreakingChanges(
  releaseData: {
    changelogs?: string;
    releaseContext?: ReleaseContext[];
  },
  repoInfo: { owner: string; repo: string },
  versionInfo: { currentVersion: string; targetVersion: string }
) {
  const client = getOpenAIClient();
  const assistant = await getOrCreateAssistant();
  
  // Determine what data to send to the assistant
  let promptContent: string;
  
  if (releaseData.releaseContext && releaseData.releaseContext.length > 0) {
    // Use enhanced structured context
    promptContent = `
      I need to analyze breaking changes between versions ${versionInfo.currentVersion} 
      and ${versionInfo.targetVersion} of the GitHub repository ${repoInfo.owner}/${repoInfo.repo}.
      
      Here are the releases between these versions, with their metadata and content:
      
      ${JSON.stringify(releaseData.releaseContext, null, 2)}
      
      Please analyze this structured data and provide a comprehensive tech-debt specification document.
      Focus on identifying breaking changes and what actions developers need to take to upgrade successfully.
    `;
  } else if (releaseData.changelogs) {
    // Fallback to plain changelogs text
    promptContent = `
      I need to analyze breaking changes between versions ${versionInfo.currentVersion} 
      and ${versionInfo.targetVersion} of the GitHub repository ${repoInfo.owner}/${repoInfo.repo}.
      
      Here are the changelogs for the versions between (and including) these releases:
      
      ${releaseData.changelogs}
      
      Please identify breaking changes and provide a tech-debt specification document.
    `;
  } else {
    throw new Error("No release data provided for analysis");
  }
  
  // Create a thread with initial message
  const thread = await client.beta.threads.create({
    messages: [
      {
        role: "user",
        content: promptContent
      }
    ]
  });
  
  // Run the assistant
  const run = await client.beta.threads.runs.create(
    thread.id,
    {
      assistant_id: assistant.id
    }
  );
  
  // Poll for completion
  await pollRunCompletion(client, thread.id, run.id);
  
  // Get the last message (assistant's response)
  const messages = await client.beta.threads.messages.list(thread.id, {
    order: "desc",
    limit: 1
  });
  
  // Extract markdown content
  const responseContent = messages.data[0].content[0];
  
  if (responseContent.type !== 'text') {
    throw new Error("Unexpected response format from OpenAI");
  }
  
  return responseContent.text.value;
}

// Helper function to poll for completion
async function pollRunCompletion(client: OpenAI, threadId: string, runId: string) {
  const maxAttempts = 60; // 5 minutes at 5-second intervals
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const runStatus = await client.beta.threads.runs.retrieve(threadId, runId);
    
    if (runStatus.status === "completed") {
      return runStatus;
    }
    
    if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
      throw new Error(`Assistant run ${runStatus.status}: ${runStatus.last_error?.message || "Unknown error"}`);
    }
    
    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }
  
  throw new Error("Assistant run timed out");
} 