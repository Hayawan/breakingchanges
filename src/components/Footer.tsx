import { Text, Group } from '@mantine/core';
import { IconHeart } from '@tabler/icons-react';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Group justify="center" py="xl">
        <Text size="sm" c="dimmed">
          <IconHeart size={14} style={{ verticalAlign: 'middle' }} /> made with love by{' '}
          <a 
            href="https://github.com/Hayawan" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            @Hayawan
          </a>
        </Text>
      </Group>
    </footer>
  );
} 