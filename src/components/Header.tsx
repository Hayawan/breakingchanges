import { Container, Title, Group, Button, ActionIcon, Text, Flex, Box } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { IconBrandGithub, IconSun, IconMoon, IconAlertTriangleFilled } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import styles from '../styles/Header.module.css';

export function Header() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Use client-side only rendering for theme toggle
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setColorScheme(isDark ? 'light' : 'dark');
  };

  return (
    <header className={styles.header}>
      <Container size="lg" className={styles.inner}>
        <div className={styles.logo}>
          <Flex gap="xs" align="center">
            <IconAlertTriangleFilled size={32} color="var(--mantine-color-yellow-6)" />
            <Box>
              <Title className={styles.title} order={2}>Breaking Changes</Title>
              <Text className={styles.description} size="xs">
                Identify breaking changes between versions in public GitHub repos
              </Text>
            </Box>
          </Flex>
        </div>
        
        <Group gap="sm">
          {mounted && (
            <ActionIcon 
              onClick={toggleTheme}
              variant="subtle"
              size="md"
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>
          )}

          <ActionIcon 
            component="a"
            href="https://github.com/Hayawan/breakingchanges"
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            size="md"
            aria-label="GitHub repository"
          >
            <IconBrandGithub size={20} />
          </ActionIcon>
          
          <Button 
            component="a"
            href="https://github.com/sponsors/Hayawan"
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="xs"
          >
            Donate
          </Button>
        </Group>
      </Container>
    </header>
  );
} 