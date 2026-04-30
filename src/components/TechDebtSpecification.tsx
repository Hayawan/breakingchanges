import { useEffect, useState } from 'react';
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
  Code,
  Select,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconRefresh, IconCopy, IconCheck, IconTerminal, IconKey } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import { TechDebtSpecificationProps } from '@/lib/types';
import { createReleaseContext } from '@/lib/github';
import { getKey, getModel, setModel, markUsed, type StoredKeyId } from '@/lib/keyStorage';
import type { LlmProvider } from '@/lib/llm';
import styles from '@/styles/TechDebtSpecification.module.css';

const PROVIDER_OPTIONS: { value: LlmProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'mistral', label: 'Mistral' },
];

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
  google: 'gemini-2.5-flash',
  mistral: 'mistral-small-latest',
};

const BYOK_ENABLED = process.env.NEXT_PUBLIC_BYOK_ENABLED !== 'false';

export function TechDebtSpecification({
  releases,
  repoInfo,
  currentVersion,
  targetVersion,
  changelogs
}: TechDebtSpecificationProps) {
  const clipboard = useClipboard({ timeout: 2000 });
  const [shouldFetch, setShouldFetch] = useState(false);
  const [provider, setProvider] = useState<LlmProvider>('openai');
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const firstWithKey = PROVIDER_OPTIONS.find((p) => getKey(p.value as StoredKeyId));
    if (firstWithKey) {
      setProvider(firstWithKey.value);
      setHasKey(true);
    } else {
      setHasKey(false);
    }
  }, []);

  const onProviderChange = (v: string | null) => {
    if (!v) return;
    const next = v as LlmProvider;
    setProvider(next);
    setHasKey(Boolean(getKey(next as StoredKeyId)));
  };

  // Create structured release context
  const releaseContext = createReleaseContext(releases);

  // Create a query key that includes provider/model so a switch refetches with the right key
  const queryKey = [
    'tech-debt-specification',
    repoInfo.owner,
    repoInfo.repo,
    currentVersion,
    targetVersion,
    provider,
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
      const apiKey = getKey(provider as StoredKeyId);
      const model = getModel(provider) ?? DEFAULT_MODELS[provider];

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          changelogs,
          releaseContext,
          repoInfo,
          versionInfo: {
            currentVersion,
            targetVersion
          },
          provider,
          model,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      markUsed();
      // Persist the model used for this provider so future runs default to it
      setModel(provider, model);
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
        {BYOK_ENABLED && (
          <>
            <Group align="end" gap="md" mb="md">
              <Select
                label="Provider"
                data={PROVIDER_OPTIONS}
                value={provider}
                onChange={onProviderChange}
                allowDeselect={false}
                w={180}
              />
              <Text size="xs" c="dimmed">
                Model: <Code>{getModel(provider) ?? DEFAULT_MODELS[provider]}</Code>
              </Text>
            </Group>
            {!hasKey && (
              <Alert color="yellow" mb="md" icon={<IconKey size={16} />}>
                No API key for <b>{provider}</b> in this browser yet. Open the{' '}
                <b>Settings</b> gear in the header to paste one. The request will fail otherwise
                unless the server has <Code>ALLOW_SERVER_KEY_FALLBACK=true</Code> set.
              </Alert>
            )}
          </>
        )}
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
        <ReactMarkdown>
          {result}
        </ReactMarkdown>
      </div>
    </Paper>
  );
} 