'use client';

import { Paper, Title, Divider, Text } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { ChangelogPreviewProps } from '@/lib/types';
import { generateChangelogText } from '@/lib/github';
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

  // Generate the markdown for the changelog
  const changelog = generateChangelogText(releases);
  
  // Count breaking changes
  const breakingChangesCount = releases.filter(r => r.breaking_change).length;

  return (
    <Paper shadow="xs" p="xl" withBorder mt="xl" className={styles.container}>
      <div className={styles.header}>
        <Title order={3}>Changelog Preview</Title>
        <div className={styles.stats}>
          <Text c="dimmed">{releases.length} releases included</Text>
          {breakingChangesCount > 0 && (
            <Text c="red" fw={700}>
              {breakingChangesCount} potential breaking {breakingChangesCount === 1 ? 'change' : 'changes'}
            </Text>
          )}
        </div>
      </div>
      
      <Divider mb="lg" />
      
      <div className={styles.markdown}>
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
          {changelog}
        </ReactMarkdown>
      </div>
    </Paper>
  );
} 