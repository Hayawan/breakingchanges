'use client';

import { useState } from 'react';
import { Text, Group, Select, Badge, Center, Tooltip, useMantineTheme } from '@mantine/core';
import { IconCode, IconRocket } from '@tabler/icons-react';
import styles from '../styles/RepoInput.module.css';

// Popular repositories for each language
const POPULAR_REPOS = {
  javascript: [
    { name: 'React', url: 'https://github.com/facebook/react' },
    { name: 'Vue.js', url: 'https://github.com/vuejs/vue' },
    { name: 'Next.js', url: 'https://github.com/vercel/next.js' },
    { name: 'Express', url: 'https://github.com/expressjs/express' },
  ],
  python: [
    { name: 'TensorFlow', url: 'https://github.com/tensorflow/tensorflow' },
    { name: 'Django', url: 'https://github.com/django/django' },
    { name: 'Flask', url: 'https://github.com/pallets/flask' },
    { name: 'Scikit-learn', url: 'https://github.com/scikit-learn/scikit-learn' },
  ],
  java: [
    { name: 'Spring Boot', url: 'https://github.com/spring-projects/spring-boot' },
    { name: 'Guava', url: 'https://github.com/google/guava' },
  ],
  cpp: [
    { name: 'TensorFlow (C++ backend)', url: 'https://github.com/tensorflow/tensorflow' },
    { name: 'OpenCV', url: 'https://github.com/opencv/opencv' },
    { name: 'folly', url: 'https://github.com/facebook/folly' },
  ],
  go: [
    { name: 'Gin', url: 'https://github.com/gin-gonic/gin' },
    { name: 'Go Kit', url: 'https://github.com/go-kit/kit' },
    { name: 'Cobra', url: 'https://github.com/spf13/cobra' },
  ],
  rust: [
    { name: 'tokio', url: 'https://github.com/tokio-rs/tokio' },
    { name: 'serde', url: 'https://github.com/serde-rs/serde' },
    { name: 'actix-web', url: 'https://github.com/actix/actix-web' },
  ],
  php: [
    { name: 'Laravel', url: 'https://github.com/laravel/laravel' },
    { name: 'Symfony', url: 'https://github.com/symfony/symfony' },
  ],
  ruby: [
    { name: 'Rails', url: 'https://github.com/rails/rails' },
    { name: 'Devise', url: 'https://github.com/heartcombo/devise' },
  ],
  swift: [
    { name: 'Alamofire', url: 'https://github.com/Alamofire/Alamofire' },
    { name: 'SwiftyJSON', url: 'https://github.com/SwiftyJSON/SwiftyJSON' },
  ],
  kotlin: [
    { name: 'Ktor', url: 'https://github.com/ktorio/ktor' },
    { name: 'Jetpack Compose (AndroidX)', url: 'https://github.com/androidx/androidx' },
  ]
};

// Categorized languages for better organization
const LANGUAGE_CATEGORIES = {
  Frontend: ['javascript'],
  Backend: ['python', 'java', 'go', 'php', 'ruby'],
  Mobile: ['kotlin', 'swift'],
  Systems: ['cpp', 'rust'],
  Other: ['all']
};

// Language display names for better readability
const LANGUAGE_DISPLAY_NAMES = {
  javascript: 'JavaScript (TS)',
  react: 'React',
  vue: 'Vue.js',
  svelte: 'Svelte',
  angular: 'Angular',
  python: 'Python',
  java: 'Java',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  kotlin: 'Kotlin',
  swift: 'Swift',
  flutter: 'Flutter',
  cpp: 'C++',
  c: 'C',
  all: 'All Languages'
};

export interface LanguageSelectorProps {
  onRepositorySelect: (url: string) => void;
}

// Convert language options to grouped format for Select
const languageOptions = Object.entries(LANGUAGE_CATEGORIES).map(([category, languages]) => ({
  group: category,
  items: languages.map((lang) => ({
    value: lang,
    label: LANGUAGE_DISPLAY_NAMES[lang as keyof typeof LANGUAGE_DISPLAY_NAMES] || lang,
  }))
}))

export default function LanguageSelector({ onRepositorySelect }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const theme = useMantineTheme();

  const getLanguageColor = (language: string) => {
    const colorMap: Record<string, string> = {
      javascript: theme.colors.yellow[8],
      typescript: theme.colors.blue[5],
      react: theme.colors.cyan[5],
      vue: theme.colors.green[5],
      svelte: theme.colors.orange[5],
      angular: theme.colors.red[5],
      python: theme.colors.indigo[5],
      java: theme.colors.orange[7],
      csharp: theme.colors.grape[5],
      go: theme.colors.blue[4],
      rust: theme.colors.orange[6],
      php: theme.colors.violet[5],
      ruby: theme.colors.red[6],
      kotlin: theme.colors.violet[6],
      swift: theme.colors.orange[5],
      flutter: theme.colors.blue[6],
      cpp: theme.colors.pink[5],
      c: theme.colors.gray[6],
      all: theme.colors.blue[5]
    };
    
    return colorMap[language] || theme.colors.gray[5];
  };

  // Handle popular repo chip click
  const handlePopularRepoClick = (url: string) => {
    onRepositorySelect(url);
  };

  return (
    <div className={styles.repoSelectorContainer}>
      <Group justify="space-between" align="center" mb={16}>
        <Group gap={6}>
          <IconRocket size={18} />
          <Text size="sm" fw={600}>Popular Repositories</Text>
        </Group>
        
        <Select
          variant='unstyled'
          className={styles.languageSelect}
          placeholder="Select language"
          data={languageOptions}
          value={selectedLanguage}
          onChange={(value) => value && setSelectedLanguage(value)}
          searchable
          clearable={false}
          maxDropdownHeight={400}
          leftSection={<IconCode size={16} />}
          styles={(theme) => ({
            item: {
              '&[data-selected]': {
                backgroundColor: theme.colors.blue[5],
              },
            },
            input: {
              fontWeight: 500
            }
          })}
        />
      </Group>
      
      <div className={styles.popularRepos}>
        {selectedLanguage === 'all' 
          ? Object.entries(POPULAR_REPOS).flatMap(([language, repos]) => 
              repos.map((repo) => (
                <Tooltip 
                  key={`${language}-${repo.name}`} 
                  label={`${LANGUAGE_DISPLAY_NAMES[language as keyof typeof LANGUAGE_DISPLAY_NAMES] || language} | ${repo.name}`}
                  position="top"
                  withArrow
                >
                  <Badge 
                    className={styles.repoBadge}
                    onClick={() => handlePopularRepoClick(repo.url)}
                    style={{ backgroundColor: getLanguageColor(language) }}
                    size="lg"
                  >
                    {repo.name}
                  </Badge>
                </Tooltip>
              ))
            )
          : (POPULAR_REPOS[selectedLanguage as keyof typeof POPULAR_REPOS] || []).map((repo) => (
              <Tooltip 
                key={`${selectedLanguage}-${repo.name}`} 
                label={`${LANGUAGE_DISPLAY_NAMES[selectedLanguage as keyof typeof LANGUAGE_DISPLAY_NAMES] || selectedLanguage} | ${repo.name}`}
                position="top"
                withArrow
              >
                <Badge 
                  className={styles.repoBadge}
                  onClick={() => handlePopularRepoClick(repo.url)}
                  style={{ backgroundColor: getLanguageColor(selectedLanguage) }}
                  size="lg"
                >
                  {repo.name}
                </Badge>
              </Tooltip>
            ))
        }
        {selectedLanguage !== 'all' && (!POPULAR_REPOS[selectedLanguage as keyof typeof POPULAR_REPOS] || 
          POPULAR_REPOS[selectedLanguage as keyof typeof POPULAR_REPOS].length === 0) && (
          <Center style={{ width: '100%', padding: '20px' }}>
            <Text c="dimmed" size="sm">No popular repositories for {LANGUAGE_DISPLAY_NAMES[selectedLanguage as keyof typeof LANGUAGE_DISPLAY_NAMES] || selectedLanguage}</Text>
          </Center>
        )}
      </div>
    </div>
  );
} 