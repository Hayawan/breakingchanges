'use client';

import { useState } from 'react';
import { TextInput, Button, Group } from '@mantine/core';
import { parseGitHubUrl } from '../lib/github';
import { GitHubRepoInfo } from '../lib/types';
import styles from '../styles/RepoInput.module.css';
import LanguageSelector from './LanguageSelector';

export interface RepoInputProps {
  onSubmit: (repoInfo: GitHubRepoInfo) => void;
  isLoading?: boolean;
}

export default function RepoInput({ onSubmit, isLoading = false }: RepoInputProps) {
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

  // Handle popular repo selection from LanguageSelector
  const handlePopularRepoSelect = (url: string) => {
    setRepoUrl(url);
    validateUrl(url);
  };

  return (
    <div className={styles.container}>
      <TextInput
        aria-label="GitHub Repository URL"
        placeholder="https://github.com/owner/repo"
        value={repoUrl}
        onChange={(event) => handleChange(event.currentTarget.value)}
        error={error}
        className={styles.input}
        size="lg"
        data-testid="repo-url-input"
      />
      
      {/* {parsedRepo && (
        <Box my="md" className={styles.parsedInfo}>
          <Text size="sm" c="dimmed">Parsed Repository:</Text>
          <Group gap="xs" mt={5}>
            <Badge>Owner: {parsedRepo.owner}</Badge>
            <Badge>Repo: {parsedRepo.repo}</Badge>
          </Group>
        </Box>
      )} */}
      
      <Group justify="space-between" align="flex-start" mt="md">
        <LanguageSelector onRepositorySelect={handlePopularRepoSelect} />
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