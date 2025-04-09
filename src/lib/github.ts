import { GitHubRelease, GitHubRepoInfo } from './types';

/**
 * Parses a GitHub repository URL and extracts owner and repo names
 * 
 * @param url The GitHub URL to parse
 * @returns An object with owner and repo properties, or null if invalid
 */
export function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  try {
    // Trim input and try to parse as URL
    const parsedUrl = new URL(url.trim());
    
    // Validate it's from github.com
    if (parsedUrl.hostname !== 'github.com') {
      return null;
    }
    
    // Clean the pathname by removing trailing slashes and .git suffix
    const cleanPath = parsedUrl.pathname
      .replace(/\.git$/, '')
      .replace(/\/+$/, '')
      .split('/')
      .filter(Boolean); // Remove empty segments
    
    // We need at least owner/repo
    if (cleanPath.length < 2) {
      return null;
    }
    
    // Extract owner and repo
    const [owner, repo] = cleanPath;
    
    return { owner, repo };
  } catch {
    // URL parsing failed or other error
    return null;
  }
}

/**
 * Constructs a GitHub API URL for releases
 */
export function getGitHubReleasesUrl(owner: string, repo: string, perPage: number = 100, page: number = 1): string {
  return `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`;
}

/**
 * Creates headers for GitHub API requests
 */
export function getGitHubApiHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  
  // Add authorization if token is available
  if (process.env.NEXT_PUBLIC_GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`;
  }
  
  return headers;
}

/**
 * Check if there's a next page based on Link header
 */
export function hasNextPage(linkHeader: string | null): boolean {
  if (!linkHeader) return false;
  return linkHeader.includes('rel="next"');
}

/**
 * Detects if a release contains breaking changes based on its body text
 * 
 * @param body Release notes text
 * @returns true if breaking changes are detected
 */
export function detectBreakingChange(body: string): boolean {
  if (!body) return false;
  
  // Check for common breaking change patterns in release notes
  const patterns = [
    /breaking changes?/i,
    /\*\*breaking\*\*/i,
    /BREAKING CHANGE/,
    /incompatible/i,
    /not backward compatible/i,
    /dropped support/i,
    /deprecat(ed|ion)/i
  ];
  
  return patterns.some(pattern => pattern.test(body));
}

/**
 * Processes releases to add the breaking_change flag
 */
export function processReleases(releases: GitHubRelease[]): GitHubRelease[] {
  return releases.map(release => ({
    ...release,
    breaking_change: detectBreakingChange(release.body)
  }));
}

/**
 * Gets releases between two versions (inclusive)
 * 
 * @param releases All releases
 * @param currentVersion Tag name of current version
 * @param targetVersion Tag name of target version  
 * @returns Filtered releases between currentVersion and targetVersion
 */
export function getReleasesBetweenVersions(
  releases: GitHubRelease[],
  currentVersion: string,
  targetVersion: string
): GitHubRelease[] {
  // Find indices of the selected versions
  const sortedReleases = [...releases].sort((a, b) => 
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
  
  const currentIdx = sortedReleases.findIndex(r => r.tag_name === currentVersion);
  const targetIdx = sortedReleases.findIndex(r => r.tag_name === targetVersion);
  
  if (currentIdx === -1 || targetIdx === -1) {
    return [];
  }
  
  // Get releases between the two versions (inclusive)
  const [startIdx, endIdx] = currentIdx > targetIdx 
    ? [targetIdx, currentIdx] 
    : [currentIdx, targetIdx];
  
  return sortedReleases.slice(startIdx, endIdx + 1);
}

/**
 * Generates concatenated changelog text from a list of releases
 */
export function generateChangelogText(releases: GitHubRelease[]): string {
  if (releases.length === 0) return 'No releases selected.';
  
  return releases.map(release => {
    const title = release.name || release.tag_name;
    return `## ${title} (${release.tag_name})\n\n${release.body || 'No release notes provided.'}\n\n`;
  }).join('---\n\n');
}

/**
 * Fetches all releases for a GitHub repository with pagination
 */
export async function fetchAllReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
  const perPage = 100; // Maximum per page
  let page = 1;
  let allReleases: GitHubRelease[] = [];
  let hasMore = true;
  
  while (hasMore) {
    const url = getGitHubReleasesUrl(owner, repo, perPage, page);
    const headers = getGitHubApiHeaders();
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository not found: ${owner}/${repo}`);
      } else if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        throw new Error('GitHub API rate limit exceeded. Please try again later or add a GitHub token.');
      } else {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
    }
    
    const releases = await response.json() as GitHubRelease[];
    allReleases = [...allReleases, ...releases];
    
    // Check if there are more pages
    const linkHeader = response.headers.get('link');
    hasMore = hasNextPage(linkHeader);
    page++;
    
    // Safety check - if no releases were returned, don't continue
    if (releases.length === 0) {
      hasMore = false;
    }
  }
  
  // Sort releases by published_at, newest first
  const sortedReleases = allReleases.sort((a, b) => 
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
  
  // Process releases to add breaking_change flags
  return processReleases(sortedReleases);
} 
