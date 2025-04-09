export interface GitHubRepoInfo {
  owner: string;
  repo: string;
}

export interface GitHubRelease {
  id: number;
  name: string;
  tag_name: string;
  published_at: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  breaking_change?: boolean;
}

/**
 * Result of processing releases, including information about release notes quality
 */
export interface ProcessedReleasesResult {
  releases: GitHubRelease[];
  hasReleaseNotes: boolean;
  usingTags: boolean;
}

export interface VersionSelectorProps {
  releases: GitHubRelease[];
  onSelect: (currentVersion: string, targetVersion: string) => void;
  isLoading?: boolean;
}

export interface ChangelogPreviewProps {
  releases: GitHubRelease[];
} 