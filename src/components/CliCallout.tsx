'use client';

import { Paper, Group, Text, Title, Button, ThemeIcon, Code, Stack, Badge } from '@mantine/core';
import { IconTerminal2, IconBrandGithub } from '@tabler/icons-react';

const SKILL_URL = 'https://github.com/Hayawan/breakingchanges/tree/main/skill/breaking-changes';

const INSTALL_SNIPPET = `# Install as a Claude Code skill
git clone https://github.com/Hayawan/breakingchanges.git
cp -r breakingchanges/skill/breaking-changes ~/.claude/skills/

# then just ask your agent:
#   "what breaks if I upgrade react from 18 to 19?"`;

/**
 * Landing-screen marketing for the terminal version of Breaking Changes:
 * a Claude Code skill (+ zero-dependency CLI) that runs the same workflow
 * where the developer already lives — no key, no browser.
 */
export function CliCallout() {
  return (
    <Paper shadow="xs" p="xl" withBorder mt="xl">
      <Group align="flex-start" wrap="nowrap" gap="lg">
        <ThemeIcon size={44} radius="md" variant="light" color="yellow" visibleFrom="xs">
          <IconTerminal2 size={26} />
        </ThemeIcon>

        <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs">
            <Title order={3}>Prefer the terminal? Run it where you code.</Title>
            <Badge color="yellow" variant="light" size="sm">New</Badge>
          </Group>

          <Text c="dimmed" size="sm">
            Install Breaking Changes as a <strong>Claude Code skill</strong> and your agent plans the
            upgrade for you — <strong>no API key, no browser</strong>. It reads the current version
            straight from your <Code>package.json</Code>, fetches the changelogs, and writes the
            tech-debt spec grounded in your real call sites. Ships with a zero-dependency CLI too.
          </Text>

          <Code block>{INSTALL_SNIPPET}</Code>

          <Group gap="sm" mt={4}>
            <Button
              component="a"
              href={SKILL_URL}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconBrandGithub size={16} />}
              variant="light"
              size="xs"
            >
              Installation &amp; CLI docs
            </Button>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}
