'use client';

import { useState } from 'react';
import { Text, Select, Badge, Tooltip, Flex } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import styles from '../styles/RepoInput.module.css';
import cx from 'clsx';

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
}));

export default function LanguageSelector({ onRepositorySelect }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  
  // Helper function to get language class name
  const getLanguageClass = (language: string, prefix: string = 'language') => {
    return styles[`${prefix}-${language}`] || styles[`${prefix}-all`];
  };

  // Handle popular repo chip click
  const handlePopularRepoClick = (url: string) => {
    onRepositorySelect(url);
  };

  // Get repositories for the current language or all languages
  const repositoriesToDisplay = selectedLanguage === 'all'
    ? Object.entries(POPULAR_REPOS).flatMap(([lang, repos]) => 
        repos.map(repo => ({ ...repo, language: lang }))
      ).slice(0, 8) // Limit to prevent too many repos
    : (POPULAR_REPOS[selectedLanguage as keyof typeof POPULAR_REPOS] || [])
        .map(repo => ({ ...repo, language: selectedLanguage }));

  return (
    <div>
      <Flex 
        align="center" 
        gap="xs" 
        wrap="wrap"
        justify='flex-start'
        className={styles.selectorSentence}
      >
        <Flex align="center" gap={4}>
          <IconRocket size={16} />
          <Text component="span" size="sm">Explore popular repos for</Text>
        </Flex>

        <Select
          className={cx(styles.inlineSelect, getLanguageClass(selectedLanguage, 'text'))}
          data={languageOptions}
          value={selectedLanguage}
          onChange={(value) => value && setSelectedLanguage(value)}
          variant="unstyled"
          size="sm"
          rightSection={null}
          aria-label="Select programming language"
          styles={() => ({
            input: {
              fontWeight: 600,
              color: 'inherit',
              padding: '0 4px',
            },
          })}
        />
        
        <Flex gap="xs" wrap="wrap" className={styles.inlineRepos}>
          {repositoriesToDisplay.length > 0 ? (
            repositoriesToDisplay.map((repo) => (
              <Tooltip 
                key={`${repo.language}-${repo.name}`} 
                label={`${LANGUAGE_DISPLAY_NAMES[repo.language as keyof typeof LANGUAGE_DISPLAY_NAMES] || repo.language} | ${repo.name}`}
                position="top"
                withArrow
              >
                <Badge 
                  className={cx(styles.repoBadge, getLanguageClass(repo.language))}
                  onClick={() => handlePopularRepoClick(repo.url)}
                  size="md"
                  radius="md"
                >
                  {repo.name}
                </Badge>
              </Tooltip>
            ))
          ) : (
            <Text c="dimmed" size="sm">No popular repositories available</Text>
          )}
        </Flex>
      </Flex>
    </div>
  );
} 