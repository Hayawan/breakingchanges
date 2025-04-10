import { Timeline, Text } from '@mantine/core';
import { IconGitBranch, IconGitPullRequest, IconList, IconFileText } from '@tabler/icons-react';
import styles from '@/styles/UsageTimeline.module.css';

interface UsageTimelineProps {
  hasReleases: boolean;
  hasSelectedVersions: boolean;
}

export function UsageTimeline({ hasReleases, hasSelectedVersions }: UsageTimelineProps) {
  // Calculate active step
  let activeStep = 0;
  if (hasReleases) activeStep = 2;
  if (hasSelectedVersions) activeStep = 3;

  return (
    <div className={styles.timeline}>
      <Timeline 
        active={activeStep} 
        bulletSize={24} 
        lineWidth={2}
        color="blue"
      >
        <Timeline.Item 
          bullet={<IconGitBranch size={12} />} 
          title={
            <Text className={activeStep >= 0 ? styles.activeText : ''}>
              1. Enter Repository
            </Text>
          }
          className={styles.timelineItem}
        >
          <Text c="dimmed" size="sm">Enter a GitHub repository URL to get started</Text>
        </Timeline.Item>

        <Timeline.Item 
          bullet={<IconList size={12} />} 
          title={
            <Text className={activeStep >= 1 ? styles.activeText : ''}>
              2. View Releases
            </Text>
          }
          className={styles.timelineItem}
        >
          <Text c="dimmed" size="sm">Browse through all releases and filter breaking changes</Text>
        </Timeline.Item>

        <Timeline.Item 
          bullet={<IconGitPullRequest size={12} />} 
          title={
            <Text className={activeStep >= 2 ? styles.activeText : ''}>
              3. Compare Versions
            </Text>
          }
          className={styles.timelineItem}
        >
          <Text c="dimmed" size="sm">Select version range to compare changes</Text>
        </Timeline.Item>

        <Timeline.Item 
          bullet={<IconFileText size={12} />} 
          title={
            <Text className={activeStep >= 3 ? styles.activeText : ''}>
              4. Review Changes
            </Text>
          }
          className={styles.timelineItem}
        >
          <Text c="dimmed" size="sm">Review the changelog and breaking changes</Text>
        </Timeline.Item>
      </Timeline>
    </div>
  );
} 