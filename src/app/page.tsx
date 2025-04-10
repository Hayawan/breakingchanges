'use client';

import { useState } from 'react';
import { Container, Paper, Title, Text, Alert, Group, Button } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import RepoInput from '../components/RepoInput';
import { ReleaseList } from '../components/ReleaseList';
import { VersionSelector } from '../components/VersionSelector';
import { ChangelogPreview } from '../components/ChangelogPreview';
import { TechDebtSpecification } from '../components/TechDebtSpecification';
import { GitHubRepoInfo, GitHubRelease, ProcessedReleasesResult } from '../lib/types';
import { getReleasesBetweenVersions, aggregateChangelogs } from '../lib/github';
import styles from './page.module.css';

export default function Home() {
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReleaseNotes, setHasReleaseNotes] = useState(true);
  const [usingTags, setUsingTags] = useState(false);
  
  // Add state for selected releases
  const [selectedReleases, setSelectedReleases] = useState<GitHubRelease[]>([]);
  const [isInputExpanded, setIsInputExpanded] = useState(true);
  
  // Add state for version selection
  const [currentVersionValue, setCurrentVersionValue] = useState<string>('');
  const [targetVersionValue, setTargetVersionValue] = useState<string>('');
  
  // Handle repository submission
  const handleRepoSubmit = async (repo: GitHubRepoInfo) => {
    setIsLoading(true);
    setError(null);
    setReleases([]);
    setSelectedReleases([]);
    setRepoInfo(repo);
    setIsInputExpanded(false); // Collapse after successful submission
    
    try {
      const response = await fetch(`/api/releases?owner=${repo.owner}&repo=${repo.repo}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: Failed to fetch releases`);
      }
      
      const data = await response.json() as ProcessedReleasesResult;
      setReleases(data.releases);
      setHasReleaseNotes(data.hasReleaseNotes);
      setUsingTags(data.usingTags);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Unknown error fetching repository releases';
      
      setError(errorMessage);
      console.error('Error fetching releases:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle version selection
  const handleVersionSelect = (currentVersion: string, targetVersion: string) => {
    const filteredReleases = getReleasesBetweenVersions(releases, currentVersion, targetVersion);
    setSelectedReleases(filteredReleases);
    setCurrentVersionValue(currentVersion);
    setTargetVersionValue(targetVersion);
  };

  // Generate changelogs text for the selected releases
  const selectedChangelogs = selectedReleases.length > 0
    ? aggregateChangelogs(selectedReleases)
    : '';

  return (
    <div className={styles.page}>
      <Header />
      <main>
        <Container size="lg">
          {error && !isLoading && (
            <Alert color="red" mb="lg" title="Error" withCloseButton onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          <Paper shadow="xs" p="xl" withBorder>
            {isInputExpanded ? (
              <>
                <Title order={2} mb="md">Enter a GitHub Repository</Title>
                <Text c="dimmed" mb="xl">
                  Paste a GitHub repository URL to fetch its releases and identify breaking changes.
                </Text>
                <RepoInput onSubmit={handleRepoSubmit} isLoading={isLoading} />
              </>
            ) : (
              <Group justify="space-between" align="center">
                <div>
                  <Text size="sm" c="dimmed">Current Repository</Text>
                  <Text fw={600} size="lg">{repoInfo?.owner}/{repoInfo?.repo}</Text>
                </div>
                <Button
                  className={styles.mainButton}
                  onClick={() => setIsInputExpanded(true)}
                  leftSection={<IconEdit size={16} />}
                  variant="light"
                >
                  Change Repository
                </Button>
              </Group>
            )}
          </Paper>
          
          {repoInfo && releases.length > 0 && (
            <>
              <ReleaseList 
                repoInfo={repoInfo}
                releases={releases} 
                isLoading={isLoading}
                error={error}
                hasReleaseNotes={hasReleaseNotes}
                usingTags={usingTags}
              />
              
              {hasReleaseNotes && (
                <>
                  <Paper shadow="xs" p="xl" withBorder mt="xl">
                    <Title order={2} mb="md">Compare Releases</Title>
                    <VersionSelector 
                      releases={releases}
                      onSelect={handleVersionSelect}
                      isLoading={isLoading}
                    />
                  </Paper>
                  
                  <ChangelogPreview 
                    releases={selectedReleases} 
                  />
                  
                  {selectedReleases.length > 0 && repoInfo && currentVersionValue && targetVersionValue && (
                    <TechDebtSpecification
                      releases={selectedReleases}
                      repoInfo={repoInfo}
                      currentVersion={currentVersionValue}
                      targetVersion={targetVersionValue}
                      changelogs={selectedChangelogs}
                    />
                  )}
                </>
              )}
            </>
          )}
        </Container>
      </main>
      <Footer />
    </div>
  );
}
