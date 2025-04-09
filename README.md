# Breaking Changes

A tool to identify breaking changes between release versions of a public GitHub repository.

## Overview

Breaking Changes helps developers understand what has changed between different versions of a repository, with a focus on identifying and explaining breaking changes that might affect their upgrade process.

## Features

- 🔍 GitHub Repo URL parsing and validation
- 📋 Fetch and display releases from GitHub API
- 📊 Select and compare different release versions
- ⚠️ Highlight releases with potential breaking changes
- 📝 Generate changelog between selected versions
- 🔮 (Coming soon) AI-powered breaking change summarization

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/breakingchanges.git
cd breakingchanges

# Install dependencies
pnpm install
```

### Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- Next.js 14+
- React 19
- Mantine UI
- GitHub REST API
- React Query
- TypeScript
- React-Markdown

## Project Structure

```
breakingchanges/
├── src/
│   ├── app/             # Next.js App Router
│   ├── components/      # React components
│   ├── lib/             # Utilities and API handlers
│   │   ├── github.ts    # GitHub API integration
│   │   └── types.ts     # TypeScript types
│   └── styles/          # CSS modules
├── public/              # Static assets
└── .docs-breakingchanges/ # Project documentation
```

## Usage

1. Enter a GitHub repository URL (e.g., https://github.com/facebook/react)
2. View the list of releases for the repository
3. Select a "Current Version" and a "Target Version" to compare
4. See all releases between those versions with breaking changes highlighted
5. View the full changelog between the selected versions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
