import { GitHubRelease, GitHubRepoInfo, ProcessedReleasesResult } from './types';

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
 * Constructs a GitHub API URL for tags
 */
export function getGitHubTagsUrl(owner: string, repo: string, perPage: number = 100, page: number = 1): string {
  return `https://api.github.com/repos/${owner}/${repo}/tags?per_page=${perPage}&page=${page}`;
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
 * Processes releases to add the breaking_change flag and check for meaningful release notes
 */
export function processReleases(releases: GitHubRelease[], usingTags: boolean = false): ProcessedReleasesResult {
  // Add breaking change flags
  const processedReleases = releases.map(release => ({
    ...release,
    breaking_change: detectBreakingChange(release.body)
  }));
  
  // Check if releases have meaningful notes
  const hasReleaseNotes = releases.some(release => {
    // Skip empty bodies
    if (!release.body || release.body.trim() === '') return false;
    
    // Skip our placeholder message for tags
    if (release.body.startsWith('This is a tag (') && release.body.endsWith('without release notes.')) return false;
    
    // Skip very short bodies (less than 20 chars is likely not meaningful)
    if (release.body.trim().length < 20) return false;
    
    // This release has meaningful notes
    return true;
  });
  
  return {
    releases: processedReleases,
    hasReleaseNotes,
    usingTags
  };
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
export async function fetchAllReleases(owner: string, repo: string): Promise<ProcessedReleasesResult> {
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
  
  // If no releases were found, try fetching tags instead
  if (allReleases.length === 0) {
    console.log(`No releases found for ${owner}/${repo}, trying tags instead...`);
    return await fetchAllTags(owner, repo);
  }
  
  // Sort releases by published_at, newest first
  const sortedReleases = allReleases.sort((a, b) => 
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
  
  // Process releases to add breaking_change flags and check release notes
  return processReleases(sortedReleases, false);
}

/**
 * Convert a GitHub tag to GitHubRelease format
 */
interface GitHubTag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url: string;
  tarball_url: string;
}

/**
 * Fetches commit details to get the date for a tag
 */
async function fetchCommitDetails(commitUrl: string): Promise<{ date: string }> {
  try {
    const headers = getGitHubApiHeaders();
    const response = await fetch(commitUrl, { headers });
    
    if (!response.ok) {
      return { date: new Date().toISOString() }; // Fallback
    }
    
    const data = await response.json();
    // Use committer date if available, or default to current date
    return { 
      date: data.commit?.committer?.date || data.commit?.author?.date || new Date().toISOString() 
    };
  } catch (error) {
    console.error("Error fetching commit details:", error);
    return { date: new Date().toISOString() }; // Fallback
  }
}

/**
 * Converts a GitHub tag to GitHubRelease format
 */
async function convertTagToRelease(tag: GitHubTag): Promise<GitHubRelease> {
  // Fetch commit details to get the date
  const { date } = await fetchCommitDetails(tag.commit.url);
  
  return {
    id: parseInt(tag.commit.sha.substring(0, 8), 16) || Math.floor(Math.random() * 100000), // Generate an ID from commit SHA
    name: tag.name,
    tag_name: tag.name,
    published_at: date,
    body: `This is a tag (${tag.name}) without release notes.`,
    draft: false,
    prerelease: tag.name.includes('alpha') || tag.name.includes('beta') || tag.name.includes('rc'),
    html_url: `${tag.zipball_url.split('/zipball')[0]}/releases/tag/${tag.name}`,
    breaking_change: false, // We can't determine this from tags alone
  };
}

/**
 * Fetches all tags for a GitHub repository and converts them to GitHubRelease format
 */
export async function fetchAllTags(owner: string, repo: string): Promise<ProcessedReleasesResult> {
  const perPage = 100; // Maximum per page
  let page = 1;
  let allTags: GitHubTag[] = [];
  let hasMore = true;
  
  while (hasMore) {
    const url = getGitHubTagsUrl(owner, repo, perPage, page);
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
    
    const tags = await response.json() as GitHubTag[];
    allTags = [...allTags, ...tags];
    
    // Check if there are more pages
    const linkHeader = response.headers.get('link');
    hasMore = hasNextPage(linkHeader);
    page++;
    
    // Safety check - if no tags were returned, don't continue
    if (tags.length === 0) {
      hasMore = false;
    }
  }
  
  if (allTags.length === 0) {
    console.log(`No tags found for ${owner}/${repo}`);
    return { releases: [], hasReleaseNotes: false, usingTags: true };
  }
  
  // Convert tags to releases format (limit to 50 most recent to avoid excessive API calls)
  const tagsToConvert = allTags.slice(0, 50);
  const releases = await Promise.all(tagsToConvert.map(convertTagToRelease));
  
  // Sort by date (newest first)
  const sortedReleases = releases.sort((a, b) => 
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
  
  // Process tags and mark them as such with usingTags=true
  return processReleases(sortedReleases, true);
} 
