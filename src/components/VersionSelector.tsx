'use client';

import { useState, useMemo } from 'react';
import { Select, Button, Group, Text, Box } from '@mantine/core';
import { VersionSelectorProps } from '@/lib/types';
import styles from '@/styles/VersionSelector.module.css';

export function VersionSelector({ releases, onSelect, isLoading = false }: VersionSelectorProps) {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [targetVersion, setTargetVersion] = useState<string | null>(null);

  // Create options for the selects from releases
  const versionOptions = useMemo(() => {
    return releases.map(release => ({
      value: release.tag_name,
      label: `${release.tag_name}${release.name && release.name !== release.tag_name ? ` (${release.name})` : ''}`,
      breaking: release.breaking_change || false
    }));
  }, [releases]);

  // Filter target version options to only show versions newer than current
  const targetVersionOptions = useMemo(() => {
    if (!currentVersion) return versionOptions;

    const currentIndex = versionOptions.findIndex(v => v.value === currentVersion);
    if (currentIndex === -1) return versionOptions;

    return versionOptions.filter((_, index) => index < currentIndex);
  }, [versionOptions, currentVersion]);

  // Filter current version options to only show versions older than target
  const currentVersionOptions = useMemo(() => {
    if (!targetVersion) return versionOptions;

    const targetIndex = versionOptions.findIndex(v => v.value === targetVersion);
    if (targetIndex === -1) return versionOptions;

    return versionOptions.filter((_, index) => index > targetIndex);
  }, [versionOptions, targetVersion]);

  // Check if the selection is valid
  const isValidSelection = useMemo(() => {
    return currentVersion && targetVersion;
  }, [currentVersion, targetVersion]);

  // Handle form submission
  const handleSubmit = () => {
    if (currentVersion && targetVersion) {
      onSelect(currentVersion, targetVersion);
    }
  };

  // Render version option with breaking changes highlight
  const renderOption = (option: { value: string; label: string; breaking: boolean }) => (
    <Group gap="xs">
      <span>{option.label}</span>
      {option.breaking && <span className={styles.breakingTag}>BREAKING</span>}
    </Group>
  );

  return (
    <Box className={styles.container}>
      <Text mb="md">Select a version range to compare</Text>
      
      <Group grow>
        <Select
          label="Current Version"
          placeholder="Select your current version"
          data={currentVersionOptions.map(opt => ({
            value: opt.value,
            label: opt.label,
            // Custom rendering of the option in dropdown
            render: () => renderOption(opt)
          }))}
          value={currentVersion}
          onChange={setCurrentVersion}
          searchable
          clearable
          disabled={isLoading || releases.length === 0}
        />
        
        <Select
          label="Target Version"
          placeholder="Select your target version"
          data={targetVersionOptions.map(opt => ({
            value: opt.value,
            label: opt.label,
            // Custom rendering of the option in dropdown
            render: () => renderOption(opt)
          }))}
          value={targetVersion}
          onChange={setTargetVersion}
          searchable
          clearable
          disabled={isLoading || releases.length === 0 || !currentVersion}
        />
      </Group>
      
      <Group justify="center" mt="xl">
        <Button 
          onClick={handleSubmit} 
          disabled={!isValidSelection || isLoading}
          loading={isLoading}
        >
          Compare Versions
        </Button>
      </Group>
    </Box>
  );
} 
