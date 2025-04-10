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

export interface ReleaseContext {
  version: string;
  name: string;
  published_at: string;
  breaking_change_detected: boolean;
  body: string;
}

export interface AnalyzeBreakingChangesRequest {
  // Original flat changelogs string (kept for backward compatibility)
  changelogs?: string;
  // Enhanced structured release context
  releaseContext?: ReleaseContext[];
  repoInfo: GitHubRepoInfo;
  versionInfo: {
    currentVersion: string;
    targetVersion: string;
  };
}

export interface AnalyzeBreakingChangesResponse {
  result: string;
}

export interface TechDebtSpecificationProps {
  releases: GitHubRelease[];
  repoInfo: GitHubRepoInfo;
  currentVersion: string;
  targetVersion: string;
  changelogs: string;
} 