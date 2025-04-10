'use client';

import { 
  Paper, 
  Title, 
  Text, 
  Loader, 
  Alert, 
  Badge, 
  Table, 
  Group, 
  ScrollArea,
  ActionIcon,
  Tooltip,
  Divider,
  Box,
  Flex
} from '@mantine/core';
import { IconCalendar, IconExternalLink, IconTag, IconAlertTriangle, IconFilter, IconFilterOff, IconInfoCircle } from '@tabler/icons-react';
import { GitHubRelease, GitHubRepoInfo } from '@/lib/types';
import { useState, useEffect } from 'react';
import styles from '@/styles/ReleaseList.module.css';

interface ReleaseListProps {
  releases: GitHubRelease[];
  repoInfo: GitHubRepoInfo;
  isLoading: boolean;
  error: string | null;
  hasReleaseNotes?: boolean;
  usingTags?: boolean;
}

export function ReleaseList({ releases, repoInfo, isLoading, error, hasReleaseNotes = true, usingTags = false }: ReleaseListProps) {
  // State to track whether to show only breaking changes
  const [showOnlyBreaking, setShowOnlyBreaking] = useState(false);
  // State to track whether the user has interacted with the badge
  const [hasInteracted, setHasInteracted] = useState(false);
  // State to control tooltip visibility
  const [showTooltip, setShowTooltip] = useState(true);

  // Hide tooltip after 10 seconds on initial render
  useEffect(() => {
    if (!hasInteracted) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasInteracted]);

  if (isLoading) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl" className={styles.loadingContainer}>
        <Loader size="lg" />
        <Text mt="md">Loading releases for {repoInfo.owner}/{repoInfo.repo}...</Text>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl">
        <Alert color="red" title="Error loading releases">
          {error}
        </Alert>
      </Paper>
    );
  }

  if (releases.length === 0) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl">
        <Alert color="blue" title="No releases found">
          No releases were found for {repoInfo.owner}/{repoInfo.repo}.
        </Alert>
      </Paper>
    );
  }

  // Count breaking changes
  const breakingChangesCount = releases.filter(r => r.breaking_change).length;

  // Filter releases if the filter is active
  const displayedReleases = showOnlyBreaking 
    ? releases.filter(release => release.breaking_change) 
    : releases;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Toggle the breaking changes filter
  const toggleBreakingFilter = () => {
    setShowOnlyBreaking(!showOnlyBreaking);
    setHasInteracted(true);
    setShowTooltip(false);
  };

  return (
    <Paper shadow="xs" withBorder mt="xl">
      <Group justify="space-between" mb="md" p="md">
        <Title order={2}>
          Releases for {repoInfo.owner}/{repoInfo.repo}
        </Title>
        <Flex direction="column" align="flex-end" gap="xs" className={styles.releaseListStats}>
          <Text c="dimmed">
            {showOnlyBreaking 
              ? `Showing ${displayedReleases.length} of ${releases.length} releases` 
              : `${releases.length} releases found`}
          </Text>
          {breakingChangesCount > 0 && (
            <Tooltip
              label="Only want versions with breaking changes? Click here."
              position="top"
              opened={showTooltip}
              withArrow
              arrowSize={6}
              transitionProps={{ duration: 200 }}
            >
              <Badge 
                color={showOnlyBreaking ? "orange" : "red"} 
                leftSection={showOnlyBreaking 
                  ? <IconFilterOff size={14} /> 
                  : <IconAlertTriangle size={14} />
                }
                className={styles.filterBadge}
                onClick={toggleBreakingFilter}
                onMouseEnter={() => !hasInteracted && setShowTooltip(true)}
                onMouseLeave={() => !hasInteracted && setShowTooltip(false)}
              >
                {breakingChangesCount} breaking {breakingChangesCount === 1 ? 'change' : 'changes'}
                {showOnlyBreaking && ' (filtered)'}
              </Badge>
            </Tooltip>
          )}
        </Flex>
      </Group>
      
      <Divider mb="md" />

      {/* Warning for repositories without meaningful release notes */}
      {!hasReleaseNotes && (
        <Alert 
          color="yellow" 
          title={usingTags ? "Using tags instead of releases" : "Limited release notes"}
          icon={<IconInfoCircle size={16} />}
          mb="md"
          mx="md"
          className={styles.warningAlert}
        >
          {usingTags 
            ? "This repository uses tags instead of formal releases. Release notes may be limited or unavailable. Version selection and changelog preview are disabled."
            : "This repository has limited or no detailed release notes. Breaking changes may not be accurately detected. Version selection and changelog preview are disabled."}
        </Alert>
      )}
      
      {showOnlyBreaking && (
        <Box mb="md" className={styles.filterNotice}>
          <Text size="sm">
            <IconFilter size={14} style={{ marginRight: '4px' }} />
            Showing releases that have breaking changes. Click the badge again to show all releases.
          </Text>
        </Box>
      )}
      
      <ScrollArea h={500} type="auto">
        <Table striped highlightOnHover captionSide="top" >
        <Table.Caption>Scroll through the table to see all releases</Table.Caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Version</Table.Th>
              <Table.Th>Released</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th className={styles.actionsColumn}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {displayedReleases.map((release) => (
              <Table.Tr 
                key={release.id} 
                className={release.breaking_change ? styles.breakingRow : styles.releaseRow}
              >
                <Table.Td>
                  <Flex direction="column">
                    <Group gap="xs">
                      <IconTag size={16} />
                      <Text fw={600}>{release.tag_name}</Text>
                      {release.breaking_change && (
                        <Tooltip label="Contains breaking changes">
                          <IconAlertTriangle size={20} color="var(--mantine-color-yellow-6)" />
                        </Tooltip>
                      )}
                    </Group>
                    {release.name && release.name !== release.tag_name && (
                      <Text size="sm" c="dimmed">({release.name})</Text>
                    )}
                  </Flex>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <IconCalendar size={16} />
                    <Text>{formatDate(release.published_at)}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  {release.prerelease ? (
                    <Badge color="yellow">Pre-release</Badge>
                  ) : (
                    <Badge color="green">Release</Badge>
                  )}
                </Table.Td>
                <Table.Td className={styles.actionsColumn}>
                  <Tooltip label="View on GitHub">
                    <ActionIcon component="a" href={release.html_url} target="_blank" rel="noreferrer" variant="light">
                      <IconExternalLink size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
} 
