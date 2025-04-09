'use client';

import { useState } from 'react';
import { TextInput, Button, Group, Text, Box, Pill, Badge } from '@mantine/core';
import { parseGitHubUrl } from '../lib/github';
import { GitHubRepoInfo } from '../lib/types';
import styles from '../styles/RepoInput.module.css';

// Popular repositories to display as chips
const POPULAR_REPOS = [
  { name: 'React', url: 'https://github.com/facebook/react' },
  { name: 'Next.js', url: 'https://github.com/vercel/next.js' },
  { name: 'TensorFlow', url: 'https://github.com/tensorflow/tensorflow' },
  { name: 'Tailwind CSS', url: 'https://github.com/tailwindlabs/tailwindcss' },
  { name: 'Vue.js', url: 'https://github.com/vuejs/core' },
  { name: 'Angular', url: 'https://github.com/angular/angular' },
  { name: 'Svelte', url: 'https://github.com/sveltejs/svelte' },
  { name: 'Node.js', url: 'https://github.com/nodejs/node' },
];

interface RepoInputProps {
  onSubmit: (repoInfo: GitHubRepoInfo) => void;
  isLoading?: boolean;
}

export function RepoInput({ onSubmit, isLoading = false }: RepoInputProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [parsedRepo, setParsedRepo] = useState<GitHubRepoInfo | null>(null);

  const validateUrl = (url: string) => {
    if (!url.trim()) {
      setError('Please enter a GitHub repository URL');
      setParsedRepo(null);
      return false;
    }
    
    const repoInfo = parseGitHubUrl(url);
    
    if (!repoInfo) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      setParsedRepo(null);
      return false;
    }
    
    setError('');
    setParsedRepo(repoInfo);
    return true;
  };

  const handleSubmit = () => {
    if (validateUrl(repoUrl) && parsedRepo) {
      onSubmit(parsedRepo);
    }
  };

  const handleChange = (value: string) => {
    setRepoUrl(value);
    if (value.trim() && value.includes('github.com')) {
      // Only validate if it looks like a GitHub URL
      validateUrl(value);
    } else {
      setParsedRepo(null);
      if (error) setError('');
    }
  };

  // Handle popular repo chip click
  const handlePopularRepoClick = (url: string) => {
    setRepoUrl(url);
    validateUrl(url);
  };

  return (
    <div className={styles.container}>
      <TextInput
        label="GitHub Repository URL"
        placeholder="https://github.com/owner/repo"
        value={repoUrl}
        onChange={(event) => handleChange(event.currentTarget.value)}
        error={error}
        className={styles.input}
        size="lg"
        data-testid="repo-url-input"
      />
      
      {parsedRepo && (
        <Box my="md" className={styles.parsedInfo}>
          <Text size="sm" c="dimmed">Parsed Repository:</Text>
          <Group gap="xs" mt={5}>
            <Pill>Owner: {parsedRepo.owner}</Pill>
            <Pill>Repo: {parsedRepo.repo}</Pill>
          </Group>
        </Box>
      )}
      
      <Group justify="space-between" align='center' mt="md">
        <Box my="md">
          <Text size="sm" c="dimmed" mb="xs">Popular repositories:</Text>
          <Group gap="xs" className={styles.popularRepos}>
            {POPULAR_REPOS.map((repo) => (
              <Badge 
                key={repo.name}
                size="lg"
                variant="light"
                gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
                className={styles.repoBadge}
                onClick={() => handlePopularRepoClick(repo.url)}
              >
                {repo.name}
              </Badge>
            ))}
          </Group>
        </Box>
        <Button 
          onClick={handleSubmit} 
          size="md"
          loading={isLoading}
          disabled={!parsedRepo || isLoading}
          data-testid="fetch-releases-button"
        >
          Fetch Releases
        </Button>
      </Group>
    </div>
  );
} 