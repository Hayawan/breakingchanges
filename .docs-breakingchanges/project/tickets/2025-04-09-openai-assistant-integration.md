## 🧠 **Stage 6: LLM Integration via OpenAI Assistant API**

### 🔧 Scope

- Configure OpenAI API key in environment variables
- Create an API route to interact with OpenAI's Assistant API
- Process selected version ranges and repository metadata
- Generate tech-debt specification markdown for upgrading between versions
- Implement error handling and retry mechanisms
- Create a component to display the generated markdown

---

## 🔑 Configuration Requirements

### **Environment Variables**
Add the following to `.env.local`:
```
# OpenAI API Configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_ASSISTANT_ID=your_assistant_id_here  # Optional, can be created programmatically
```

### **API Key Security**
- Never expose API key in client-side code
- Use Next.js Server Components or API routes to keep keys secure
- Implement rate limiting to prevent excessive costs

---

## 🏗️ Implementation Strategy

### 1. **OpenAI Integration Utilities**
```ts
// lib/openai.ts
import OpenAI from "openai";

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
      
      When given a set of changelogs between two versions:
      1. Identify all breaking changes that require code modifications
      2. Create a comprehensive tech-debt specification markdown document
      3. Include code examples of before/after where possible
      4. Organize changes by category (API, behavior, dependencies, etc.)
      5. Provide a complexity rating for the upgrade (Low, Medium, High)
      6. List required action items for engineers
      
      Focus on clarity, technical accuracy, and actionable information.
    `,
    model: "gpt-4o",
    tools: [{ type: "code_interpreter" }]
  });
}

// Process release data with OpenAI
export async function analyzeBreakingChanges(
  changelogs: string,
  repoInfo: { owner: string; repo: string },
  versionInfo: { currentVersion: string; targetVersion: string }
) {
  const client = getOpenAIClient();
  const assistant = await getOrCreateAssistant();
  
  // Create a thread with initial message
  const thread = await client.beta.threads.create({
    messages: [
      {
        role: "user",
        content: `
          I need to analyze breaking changes between versions ${versionInfo.currentVersion} 
          and ${versionInfo.targetVersion} of the GitHub repository ${repoInfo.owner}/${repoInfo.repo}.
          
          Here are the changelogs for the versions between (and including) these releases:
          
          ${changelogs}
          
          Please identify breaking changes and provide a tech-debt specification document.
        `
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
  const result = await pollRunCompletion(client, thread.id, run.id);
  
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
```

### 2. **API Route**
```tsx
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeBreakingChanges } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { changelogs, repoInfo, versionInfo } = body;
    
    if (!changelogs || !repoInfo || !versionInfo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    const result = await analyzeBreakingChanges(
      changelogs,
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
      }
    }
    
    return NextResponse.json({ error: message }, { status });
  }
}
```

### 3. **User Interface Component**
```tsx
// components/TechDebtSpecification.tsx
'use client';

import { useState } from 'react';
import { Paper, Title, Text, Loader, Alert, Button, Divider } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { MarkdownPreview } from './MarkdownPreview';
import { GitHubRepoInfo, GitHubRelease } from '@/lib/types';

interface TechDebtSpecificationProps {
  releases: GitHubRelease[];
  repoInfo: GitHubRepoInfo;
  currentVersion: string;
  targetVersion: string;
  changelogs: string;
}

export function TechDebtSpecification({
  releases,
  repoInfo,
  currentVersion,
  targetVersion,
  changelogs,
}: TechDebtSpecificationProps) {
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeChanges = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changelogs,
          repoInfo,
          versionInfo: {
            currentVersion,
            targetVersion,
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze changes');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl">
        <Title order={2} mb="lg">Analyzing Breaking Changes</Title>
        <Loader size="md" />
        <Text mt="md">
          Analyzing changes between {currentVersion} and {targetVersion}...
          This may take up to a minute.
        </Text>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl">
        <Title order={2} mb="lg">Analysis Error</Title>
        <Alert color="red" title="Failed to analyze breaking changes">
          {error}
        </Alert>
        <Button 
          leftSection={<IconRefresh size={16} />}
          onClick={analyzeChanges}
          variant="light"
          mt="md"
        >
          Retry Analysis
        </Button>
      </Paper>
    );
  }

  if (!result) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl">
        <Title order={2} mb="lg">Breaking Changes Analysis</Title>
        <Text mb="md">
          Generate a tech-debt specification with AI to help you understand what changes
          are needed when upgrading from {currentVersion} to {targetVersion}.
        </Text>
        <Button onClick={analyzeChanges} color="blue">
          Analyze Breaking Changes
        </Button>
      </Paper>
    );
  }

  return (
    <Paper shadow="xs" p="xl" withBorder mt="xl">
      <Title order={2} mb="sm">Tech-Debt Specification</Title>
      <Text c="dimmed" mb="md">
        For upgrading {repoInfo.owner}/{repoInfo.repo} from {currentVersion} to {targetVersion}
      </Text>
      <Divider mb="lg" />
      <MarkdownPreview content={result} />
    </Paper>
  );
}
```

### 4. **Integration with Main Page**
```tsx
// Excerpt from app/page.tsx
import { TechDebtSpecification } from '@/components/TechDebtSpecification';

// Inside the Home component's return statement:
{selectedReleases.length > 0 && (
  <>
    <ChangelogPreview releases={selectedReleases} />
    
    <TechDebtSpecification
      releases={selectedReleases}
      repoInfo={repoInfo}
      currentVersion={currentVersionValue}
      targetVersion={targetVersionValue}
      changelogs={aggregateChangelogs(selectedReleases)}
    />
  </>
)}
```

---

## ✅ Acceptance Criteria

| Scenario | Expected Behavior | Notes |
|---------|------------------|-------|
| Valid versions selected | System analyzes changelogs and generates tech-debt spec | Should complete within ~1 minute |
| First-time setup | Creates OpenAI assistant with proper instructions | Only happens once, then reuses assistant ID |
| Missing API key | Shows clear error message about configuration | Should guide user to add key to .env.local |
| API failure/timeout | Shows retry option with helpful error message | |
| Generated content | Properly formatted markdown with tech-debt details | Should include code examples where possible |

---

## 🧪 Testing Strategy

1. **Unit Tests**
   - Test OpenAI client initialization with/without API key
   - Test changelog aggregation logic
   - Mock API responses to test error handling

2. **Integration Tests**
   - Mock OpenAI response to verify UI rendering
   - Test polling logic with different response statuses
   - Verify thread/assistant lifecycle management

3. **Manual Tests**
   - Verify real API calls with sample changelogs
   - Check rendering of complex markdown output
   - Confirm thread cleanup to avoid resource leaks

---

## 💰 Cost Considerations

- OpenAI API usage costs money based on tokens processed
- Implement reasonable rate limits to prevent unexpected charges
- Consider caching results for common version comparisons
- Add clear documentation about expected costs for users self-hosting

---

## 🛡️ Security Considerations

- Never expose API keys in client-side code
- Sanitize user input before sending to OpenAI
- Store sensitive keys in proper environment variables
- Consider adding API key rotation capabilities

---

## 📊 Metrics to Track

- Average response time for analysis
- Success/failure rate
- Token usage per request
- Common error types

---

## 🚀 Next Steps

After this implementation:
1. Add caching for repeated comparisons
2. Enhance the markdown display with syntax highlighting
3. Add export functionality for generated specifications
4. Consider fallback to simpler models if rate limits hit 