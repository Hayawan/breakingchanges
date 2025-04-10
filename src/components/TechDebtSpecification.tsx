import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Paper,
  Title,
  Text,
  Loader,
  Alert,
  Button,
  Divider,
  Group,
  ActionIcon,
  Tooltip,
  Code
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconRefresh, IconCopy, IconCheck, IconTerminal } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { TechDebtSpecificationProps } from '@/lib/types';
import { createReleaseContext } from '@/lib/github';
import styles from '@/styles/TechDebtSpecification.module.css';

export function TechDebtSpecification({
  releases,
  repoInfo,
  currentVersion,
  targetVersion,
  changelogs
}: TechDebtSpecificationProps) {
  const clipboard = useClipboard({ timeout: 2000 });
  const [shouldFetch, setShouldFetch] = useState(false);

  // Create structured release context
  const releaseContext = createReleaseContext(releases);

  // Create a query key that includes all the important parameters
  const queryKey = [
    'tech-debt-specification',
    repoInfo.owner,
    repoInfo.repo,
    currentVersion,
    targetVersion
  ];

  // Setup query for API call
  const {
    data: result,
    error,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          changelogs,
          releaseContext,
          repoInfo,
          versionInfo: {
            currentVersion,
            targetVersion
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    },
    enabled: shouldFetch,
    staleTime: Infinity // Don't refetch automatically since releases data is static
  });

  // If no releases are selected
  if (releases.length === 0) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl">
        <Title order={2} mb="lg">Analyzing Breaking Changes</Title>
        <div className={styles.loadingContainer}>
          <Loader size="md" />
          <Text mt="md">
            Analyzing changes between {currentVersion} and {targetVersion}...
            <br />
            <Text size="sm" c="dimmed" mt="xs">
              This may take up to a minute as our AI analyzes the release notes.
            </Text>
          </Text>
        </div>
      </Paper>
    );
  }

  // Error state
  if (isError) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl">
        <Title order={2} mb="lg">Analysis Error</Title>
        <Alert color="red" title="Failed to analyze breaking changes" mb="md">
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </Alert>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={() => refetch()}
          variant="light"
        >
          Retry Analysis
        </Button>
      </Paper>
    );
  }

  // Initial state - not yet analyzed
  if (!shouldFetch || !result) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl">
        <Title order={2} mb="lg">Breaking Changes Analysis</Title>
        <Text mb="md">
          Generate a tech-debt specification with AI to help understand what changes
          are needed when upgrading from <Code>{currentVersion}</Code> to <Code>{targetVersion}</Code>.
        </Text>
        <Group>
          <Button
            leftSection={<IconTerminal size={16} />}
            onClick={() => setShouldFetch(true)}
            color="blue"
          >
            Analyze Breaking Changes
          </Button>
          <Text size="sm" c="dimmed">
            Analyzes {releases.length} {releases.length === 1 ? 'release' : 'releases'} with AI
          </Text>
        </Group>
      </Paper>
    );
  }

  // Success state with result
  return (
    <Paper shadow="xs" p="xl" withBorder mt="xl">
      <Group justify="space-between" mb="sm">
        <Title order={2}>Tech-Debt Specification</Title>
        <Tooltip
          label={clipboard.copied ? "Copied!" : "Copy to clipboard"}
          withArrow
          position="left"
        >
          <ActionIcon
            onClick={() => clipboard.copy(result)}
            variant="subtle"
            color={clipboard.copied ? "teal" : "gray"}
            aria-label="Copy tech-debt specification to clipboard"
          >
            {clipboard.copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
          </ActionIcon>
        </Tooltip>
      </Group>
      <Text c="dimmed" mb="md">
        For upgrading {repoInfo.owner}/{repoInfo.repo} from {currentVersion} to {targetVersion}
      </Text>
      <Divider mb="lg" />
      <div className={styles.markdownContainer}>
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
          {result}
        </ReactMarkdown>
      </div>
    </Paper>
  );
} 