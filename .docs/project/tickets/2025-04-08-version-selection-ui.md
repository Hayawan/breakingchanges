## ✅ **Stage 4: Version Selection UI (Completed)**

### 🔧 Scope

- ✅ Allow users to select **"Current"** and **"Target"** release versions from dropdowns
- ✅ Highlight and restrict invalid selections (e.g., selecting an older target than current)
- ✅ Persist selections in state for downstream use (e.g., changelog slicing)
- ✅ Display only releases **between selected versions**
- ✅ Annotate releases that likely contain **breaking changes**
- ✅ Render a markdown preview of the full changelog between selected versions below the release list
- ✅ Prepare UI to support future LLM summarization toggle

---

## 🧩 Implemented Features

### 🔽 Version Selection Logic

- Implemented two dropdowns using Mantine's `Select` component:
  - First dropdown: "Current Version" (older version)
  - Second dropdown: "Target Version" (newer version)
- Added proper validation to ensure target > current
- Disabled versions in each dropdown based on the selection in the other
- Added visual indicators for breaking changes in the dropdowns

### 🔎 Breaking Change Detection

- Created a robust detection algorithm that looks for multiple breaking change patterns
- Annotated releases in the list with a warning icon
- Highlighted rows with breaking changes using a red background
- Added count of breaking changes in the UI summary

### 📃 Changelog Preview

- Implemented filtering to show only releases between selected versions
- Created a clean markdown preview component using `react-markdown`
- Added syntax highlighting for code blocks
- Made the preview scrollable for long changelogs

---

## 🧠 Implementation Highlights

### Breaking Change Detection

```ts
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
```

### Version Filtering Logic

```ts
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
  
  // Get releases between the two versions (inclusive)
  const [startIdx, endIdx] = currentIdx > targetIdx 
    ? [targetIdx, currentIdx] 
    : [currentIdx, targetIdx];
  
  return sortedReleases.slice(startIdx, endIdx + 1);
}
```

### Markdown Rendering

Implemented a clean and styled markdown preview with:
- Syntax highlighting for code blocks
- Proper heading hierarchy
- Scrollable container for long changelogs
- Breaking change statistics

---

## ✅ Manual Acceptance Tests

| Scenario                                  | Expected Behavior                                                              | Status |
|-------------------------------------------|----------------------------------------------------------------------------------|---------|
| Versions load into both dropdowns         | Shows tag names in descending order                                             | ✅ Passed |
| Current version selected                  | Target dropdown disables earlier versions                                       | ✅ Passed |
| Both versions selected → submit enabled   | Clicking submit filters releases between versions                              | ✅ Passed |
| Releases with "Breaking Changes" sections | ⚠️ icon appears next to those releases                                           | ✅ Passed |
| Clicking submit renders markdown preview  | All release bodies between current and target are combined into readable format | ✅ Passed |

---

## 🚀 Next Steps (Stage 5)

The Version Selection UI is now complete and ready for the final stage:

- Integrate with a Large Language Model (LLM) to:
  - Summarize breaking changes in a more human-readable format
  - Extract specific details about each breaking change
  - Provide upgrade guidance or migration steps
  - Create a concise report focused only on breaking changes

Stage 4 delivers a fully functional UI that allows users to select version ranges, view all releases between those versions, and easily identify potential breaking changes. The application is now ready for the final stage of LLM integration.