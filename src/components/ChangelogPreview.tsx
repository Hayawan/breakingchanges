'use client';

import { 
  Paper, 
  Title, 
  Divider, 
  Text, 
  Accordion, 
  Group, 
  Badge,
  Flex
} from '@mantine/core';
import { IconAlertTriangle, IconCalendar, IconTag } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { ChangelogPreviewProps } from '@/lib/types';
import styles from '@/styles/ChangelogPreview.module.css';

export function ChangelogPreview({ releases }: ChangelogPreviewProps) {
  // If no releases, show a message
  if (releases.length === 0) {
    return (
      <Paper shadow="xs" p="xl" withBorder mt="xl">
        <Title order={3} mb="md">Changelog Preview</Title>
        <Divider mb="lg" />
        <Text c="dimmed" ta="center">No releases selected. Please select a version range to view the changelog.</Text>
      </Paper>
    );
  }
  
  // Count breaking changes
  const breakingChangesCount = releases.filter(r => r.breaking_change).length;

  // Format date function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Paper shadow="xs" p="xl" withBorder mt="xl" className={styles.container}>
      <div className={styles.header}>
        <Title order={3}>Changelog Preview</Title>
        <div className={styles.stats}>
          <Text c="dimmed">{releases.length} releases included</Text>
          {breakingChangesCount > 0 && (
            <Text c="orange" fw={700}>
              {breakingChangesCount} potential breaking {breakingChangesCount === 1 ? 'change' : 'changes'}
            </Text>
          )}
        </div>
      </div>
      
      <Divider mb="lg" />
      
      <Accordion variant="contained" radius="md" chevronPosition="left" className={styles.accordion}>
        {releases.map((release) => (
          <Accordion.Item 
            key={release.id} 
            value={release.tag_name}
            className={release.breaking_change ? styles.breakingItem : ''}
          >
            <Accordion.Control>
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs">
                  {release.breaking_change && (
                    <IconAlertTriangle size={18} color="var(--mantine-color-orange-6)" />
                  )}
                  <Flex direction="column">
                    <Group gap="xs">
                      <IconTag size={16} />
                      <Text fw={600}>{release.tag_name}</Text>
                      {release.name && release.name !== release.tag_name && (
                        <Text size="sm" c="dimmed">({release.name})</Text>
                      )}
                    </Group>
                  </Flex>
                </Group>
                <Group gap="md">
                  <Group gap="xs">
                    <IconCalendar size={14} />
                    <Text size="sm" c="dimmed">{formatDate(release.published_at)}</Text>
                  </Group>
                  {release.prerelease ? (
                    <Badge color="yellow" size="sm">Pre-release</Badge>
                  ) : (
                    <Badge color="green" size="sm">Release</Badge>
                  )}
                </Group>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <div className={styles.releaseContent}>
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                  {release.body || 'No release notes provided.'}
                </ReactMarkdown>
              </div>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Paper>
  );
} 