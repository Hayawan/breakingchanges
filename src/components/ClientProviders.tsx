'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { queryClient } from '../lib/queryClient';

// Create a custom theme with proper light/dark mode colors
const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    dark: [
      '#C1C2C5', // 0
      '#A6A7AB', // 1
      '#909296', // 2
      '#5c5f66', // 3
      '#373A40', // 4
      '#2C2E33', // 5
      '#25262b', // 6
      '#1A1B1E', // 7
      '#141517', // 8
      '#101113', // 9
    ],
  },
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },
  components: {
    Paper: {
      defaultProps: {
        p: 'md',
      },
    },
  },
});

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // Using a stable QueryClient instance to prevent hydration mismatches
  const [client] = useState(() => queryClient);

  return (
    <MantineProvider 
      theme={theme}
      defaultColorScheme="light"
    >
      <QueryClientProvider client={client}>
        <Notifications />
        {children}
      </QueryClientProvider>
    </MantineProvider>
  );
} 